require('dotenv').config();

const connectDB = require('../config/db');
const { initializeKeyManagement } = require('../security/keyManagementService');
const User = require('../models/User');
const { hashPassword } = require('../security/passwordHasher');
const { buildLookupDigest } = require('../security/secureField');
const { normalizeEmail } = require('../services/userSecurityService');

const run = async () => {
  await connectDB();
  await initializeKeyManagement();

  const email = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@vetconnect.local');
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const name = process.env.ADMIN_NAME || 'VetConnect Admin';
  const contactInfo = process.env.ADMIN_CONTACT || 'admin-support@vetconnect.local';

  const existingUser = await User.findOne({
    emailLookup: buildLookupDigest(email),
  });

  if (existingUser) {
    existingUser.name = name;
    existingUser.email = email;
    existingUser.contactInfo = contactInfo;
    existingUser.role = 'admin';
    existingUser.password = hashPassword(password);
    await existingUser.save();
    console.log(`Updated admin user: ${email}`);
    process.exit(0);
  }

  await User.create({
    name,
    email,
    contactInfo,
    emailLookup: buildLookupDigest(email),
    password: hashPassword(password),
    role: 'admin',
    twoFactorEnabled: false,
    twoFactorMethod: 'totp',
    twoFactorSecret: '',
  });

  console.log(`Created admin user: ${email}`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
