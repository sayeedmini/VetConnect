require('dotenv').config();

const connectDB = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');
const { initializeKeyManagement } = require('../security/keyManagementService');
const { hashPassword } = require('../security/passwordHasher');
const { buildLookupDigest } = require('../security/secureField');
const { normalizeEmail } = require('../services/userSecurityService');

const flipLastCharacter = (value) => {
  const normalized = String(value || '');

  if (!normalized) {
    return normalized;
  }

  const lastCharacter = normalized.slice(-1);
  const replacement = lastCharacter === 'a' ? 'b' : 'a';
  return `${normalized.slice(0, -1)}${replacement}`;
};

const buildTamperedEnvelope = (rawEncryptedValue) => {
  const prefix = 'enc::';

  if (!String(rawEncryptedValue || '').startsWith(prefix)) {
    throw new Error('Encrypted field was not stored with the expected envelope prefix');
  }

  const envelope = JSON.parse(
    Buffer.from(rawEncryptedValue.slice(prefix.length), 'base64').toString('utf8')
  );

  if (!Array.isArray(envelope?.payload?.c2) || envelope.payload.c2.length === 0) {
    throw new Error('ECC ElGamal payload was not found on the stored field');
  }

  envelope.payload.c2[0] = {
    ...envelope.payload.c2[0],
    x: flipLastCharacter(envelope.payload.c2[0].x),
  };

  return `${prefix}${Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64')}`;
};

const ensureTamperUser = async () => {
  const email = normalizeEmail('tamper-test@vetconnect.local');
  const emailLookup = buildLookupDigest(email);
  let user = await User.findOne({ emailLookup });

  if (!user) {
    user = await User.create({
      name: 'Tamper Test User',
      email,
      contactInfo: 'tamper-test-contact',
      emailLookup,
      password: hashPassword('Tamper123!'),
      role: 'vet',
      twoFactorEnabled: false,
      twoFactorMethod: 'totp',
      twoFactorSecret: '',
    });
  }

  return user;
};

const ensureTamperPost = async (authorId) => {
  const existingPost = await Post.findOne({ author: authorId, status: 'draft' });

  if (existingPost) {
    existingPost.title = 'Tamper Test Title';
    existingPost.content = 'Tamper Test Content';
    await existingPost.save();
    return existingPost;
  }

  return Post.create({
    author: authorId,
    title: 'Tamper Test Title',
    content: 'Tamper Test Content',
    status: 'draft',
  });
};

const run = async () => {
  await connectDB();
  await initializeKeyManagement();

  const user = await ensureTamperUser();
  const post = await ensureTamperPost(user._id);
  const rawStoredPost = await Post.collection.findOne({ _id: post._id });
  const rawEncryptedTitle = rawStoredPost?.title;

  if (!rawEncryptedTitle) {
    throw new Error('Could not locate the raw encrypted post title in MongoDB');
  }

  const tamperedTitle = buildTamperedEnvelope(rawEncryptedTitle);

  await Post.collection.updateOne(
    { _id: post._id },
    {
      $set: {
        title: tamperedTitle,
      },
    }
  );

  try {
    const tamperedPost = await Post.findById(post._id);

    if (!tamperedPost) {
      throw new Error('Tampered post could not be reloaded');
    }

    void tamperedPost.title;
    console.error('FAIL: tampered encrypted field was accepted');
    process.exit(1);
  } catch (error) {
    if (error.message !== 'Encrypted field integrity verification failed') {
      throw error;
    }

    console.log('PASS: MAC detected database tampering');
    process.exit(0);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
