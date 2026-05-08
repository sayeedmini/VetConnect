require('dotenv').config();

const assert = require('assert');
const path = require('path');

const connectDB = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');
const Session = require('../models/Session');
const SecurityState = require('../models/SecurityState');
const {
  initializeKeyManagement,
  listManagedKeys,
  getBootstrapFilePath,
  getKeyStoreDir,
} = require('../security/keyManagementService');
const { buildPasswordFields } = require('../security/passwordHasher');
const { buildLookupDigest } = require('../security/secureField');
const { normalizeEmail } = require('../services/userSecurityService');
const {
  SESSION_TTL_MS,
  buildSessionFingerprint,
  createSessionToken,
  hashSessionToken,
} = require('../services/sessionSecurityService');

const projectRoot = path.resolve(__dirname, '..', '..', '..');

const ensureAuditUser = async () => {
  const email = normalizeEmail('security-audit@vetconnect.local');
  const emailLookup = buildLookupDigest(email);
  let user = await User.findOne({ emailLookup }).select('+password');

  if (!user) {
    user = await User.create({
      name: 'Security Audit User',
      email,
      contactInfo: 'security-audit-contact',
      emailLookup,
      ...buildPasswordFields('Audit123!'),
      role: 'petOwner',
      twoFactorEnabled: false,
      twoFactorMethod: 'totp',
      twoFactorSecret: '',
    });
  }

  return user;
};

const ensureAuditPost = async (authorId) => {
  let post = await Post.findOne({ author: authorId, status: 'draft' });

  if (!post) {
    post = await Post.create({
      author: authorId,
      title: 'Security Audit Title',
      content: 'Security Audit Content',
      status: 'draft',
      comments: [
        {
          author: authorId,
          content: 'Security Audit Comment',
        },
      ],
    });
    return post;
  }

  post.title = 'Security Audit Title';
  post.content = 'Security Audit Content';

  if (!Array.isArray(post.comments) || post.comments.length === 0) {
    post.comments = [
      {
        author: authorId,
        content: 'Security Audit Comment',
      },
    ];
  } else {
    post.comments[0].author = authorId;
    post.comments[0].content = 'Security Audit Comment';
  }

  await post.save();
  return post;
};

const ensureAuditSession = async (userId) => {
  const sessionToken = createSessionToken();
  const fingerprintHash = buildSessionFingerprint({
    headers: {
      'user-agent': 'security-audit',
      'accept-language': 'en-US',
    },
  });
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await Session.findOneAndUpdate(
    { user: userId, fingerprintHash },
    {
      user: userId,
      sessionTokenHash: hashSessionToken(sessionToken),
      fingerprintHash,
      expiresAt,
      revokedAt: null,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return Session.collection.findOne({ user: userId, fingerprintHash });
};

const assertEncryptedValue = (label, value) => {
  assert.strictEqual(typeof value, 'string', `${label} must be stored as a string`);
  assert.ok(value.startsWith('enc::'), `${label} must be stored as encrypted envelope data`);
};

const assertNoForbiddenKeyFields = (label, value) => {
  const forbiddenFields = new Set(['privateKey', 'd', 'p', 'q', 'seed', 'secret', 'privateScalar']);

  const visit = (current, currentPath) => {
    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${currentPath}[${index}]`));
      return;
    }

    if (!current || typeof current !== 'object') {
      return;
    }

    for (const [fieldName, fieldValue] of Object.entries(current)) {
      assert.ok(!forbiddenFields.has(fieldName), `${label} exposes forbidden field ${currentPath}.${fieldName}`);
      visit(fieldValue, `${currentPath}.${fieldName}`);
    }
  };

  visit(value, label);
};

const run = async () => {
  await connectDB();
  await initializeKeyManagement();

  const auditUser = await ensureAuditUser();
  const auditPost = await ensureAuditPost(auditUser._id);
  const rawUser = await User.collection.findOne({ _id: auditUser._id });
  const rawPost = await Post.collection.findOne({ _id: auditPost._id });
  const rawSession = await ensureAuditSession(auditUser._id);
  const keyRingState = await SecurityState.findOne({ kind: 'keyring' }).lean();
  const keyMetadata = listManagedKeys();

  assert.ok(rawUser, 'Audit user record must exist');
  assertEncryptedValue('User.name', rawUser.name);
  assertEncryptedValue('User.email', rawUser.email);
  assertEncryptedValue('User.contactInfo', rawUser.contactInfo);
  assert.ok(rawUser.passwordHash, 'User.passwordHash must be stored');
  assert.ok(rawUser.passwordSalt, 'User.passwordSalt must be stored');
  assert.ok(Number(rawUser.passwordIterations) > 0, 'User.passwordIterations must be stored');
  assert.ok(!('password' in rawUser), 'Legacy User.password field must not remain in MongoDB');

  assert.ok(rawPost, 'Audit post record must exist');
  assertEncryptedValue('Post.title', rawPost.title);
  assertEncryptedValue('Post.content', rawPost.content);
  assert.ok(Array.isArray(rawPost.comments) && rawPost.comments.length > 0, 'Audit post comment must exist');
  assertEncryptedValue('Post.comments[0].content', rawPost.comments[0].content);

  assert.ok(rawSession, 'Audit session record must exist');
  assert.ok(rawSession.sessionTokenHash, 'Session must store sessionTokenHash');
  assert.ok(!('sessionToken' in rawSession), 'Session must not store a raw sessionToken field');
  assert.strictEqual(typeof rawSession.expiresAt?.getTime, 'function', 'Session.expiresAt must be a Date');

  assert.ok(keyRingState?.payload?.keys, 'Keyring state must exist in MongoDB');
  assertNoForbiddenKeyFields('SecurityState.keyring', keyRingState.payload.keys);
  keyMetadata.forEach((entry, index) => {
    const allowedFields = [
      'algorithm',
      'keyId',
      'version',
      'status',
      'createdAt',
      'rotatedAt',
      'publicKey',
    ].sort();
    assert.deepStrictEqual(
      Object.keys(entry).sort(),
      allowedFields,
      `Sanitized key metadata entry ${index} must expose only approved fields`
    );
    assertNoForbiddenKeyFields(`listManagedKeys[${index}]`, entry);
  });

  assert.ok(
    !getBootstrapFilePath().startsWith(path.join(projectRoot, 'server', 'storage')),
    'Bootstrap key storage must default outside server/storage'
  );
  assert.ok(getKeyStoreDir(), 'KEYSTORE_DIR resolution must be available');

  console.log('PASS: security audit checks passed');
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
