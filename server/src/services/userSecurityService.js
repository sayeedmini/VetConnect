const { randomBetween } = require('../security/random');
const { buildLookupDigest } = require('../security/secureField');

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  contactInfo: user.contactInfo || '',
  role: user.role,
  twoFactorEnabled: user.twoFactorEnabled !== false && Boolean(user.twoFactorSecret),
  twoFactorMethod: user.twoFactorMethod || 'totp',
  twoFactorConfigured: Boolean(user.twoFactorSecret),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildMaskedContactLabel = (contactInfo = '') => {
  const trimmed = String(contactInfo || '').trim();
  if (!trimmed) {
    return 'your registered contact channel';
  }

  if (trimmed.includes('@')) {
    const [userName, domain] = trimmed.split('@');
    const maskedName =
      userName.length <= 2 ? `${userName[0] || '*'}*` : `${userName.slice(0, 2)}***`;
    return `${maskedName}@${domain}`;
  }

  return trimmed.length <= 4 ? `***${trimmed.slice(-2)}` : `***${trimmed.slice(-4)}`;
};

const buildOtpCode = () => String(randomBetween(100000n, 999999n)).padStart(6, '0');

const ensureEncryptedUserRecord = async (user) => {
  let didChange = false;
  const rawName = user.get('name', null, { getters: false });
  const rawEmail = user.get('email', null, { getters: false });
  const rawContactInfo = user.get('contactInfo', null, { getters: false });

  if (rawName && !String(rawName).startsWith('enc::')) {
    user.name = user.name;
    didChange = true;
  }

  if (rawEmail && !String(rawEmail).startsWith('enc::')) {
    user.email = normalizeEmail(user.email);
    didChange = true;
  }

  if (rawContactInfo && !String(rawContactInfo).startsWith('enc::')) {
    user.contactInfo = user.contactInfo;
    didChange = true;
  }

  if (!user.emailLookup) {
    user.emailLookup = buildLookupDigest(normalizeEmail(user.email));
    didChange = true;
  }

  if (didChange) {
    await user.save();
  }

  return user;
};

module.exports = {
  normalizeEmail,
  buildUserResponse,
  buildMaskedContactLabel,
  buildOtpCode,
  ensureEncryptedUserRecord,
  buildLookupDigest,
};
