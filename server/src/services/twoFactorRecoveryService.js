const { hmacSha256 } = require('../security/hmac');
const { randomBetween } = require('../security/random');

const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 8;

const getBackupCodeSecret = () =>
  process.env.MAC_SECRET || process.env.SESSION_SECRET || 'vetconnect-backup-code-secret';

const normalizeBackupCode = (value = '') =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const formatBackupCode = (value = '') => {
  const normalized = normalizeBackupCode(value);

  if (normalized.length <= 4) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

const hashBackupCode = (value) =>
  hmacSha256(getBackupCodeSecret(), normalizeBackupCode(value));

const buildRawBackupCode = () => {
  let code = '';

  for (let index = 0; index < BACKUP_CODE_LENGTH; index += 1) {
    const randomIndex = Number(randomBetween(0n, BigInt(BACKUP_CODE_ALPHABET.length - 1)));
    code += BACKUP_CODE_ALPHABET[randomIndex];
  }

  return code;
};

const generateBackupCodes = () => {
  const codes = [];
  const entries = [];

  while (codes.length < BACKUP_CODE_COUNT) {
    const rawCode = buildRawBackupCode();
    const formattedCode = formatBackupCode(rawCode);
    const codeHash = hashBackupCode(rawCode);

    if (entries.some((entry) => entry.codeHash === codeHash)) {
      continue;
    }

    codes.push(formattedCode);
    entries.push({
      codeHash,
      usedAt: null,
    });
  }

  return {
    codes,
    entries,
  };
};

const countRemainingBackupCodes = (user) =>
  Array.isArray(user?.backupCodes)
    ? user.backupCodes.filter((entry) => !entry.usedAt).length
    : 0;

const replaceBackupCodes = (user) => {
  const { codes, entries } = generateBackupCodes();
  user.backupCodes = entries;
  user.backupCodesGeneratedAt = new Date();
  return codes;
};

const consumeBackupCode = async (user, candidateCode) => {
  if (!Array.isArray(user?.backupCodes) || !candidateCode) {
    return false;
  }

  const codeHash = hashBackupCode(candidateCode);
  const matchingEntry = user.backupCodes.find(
    (entry) => entry.codeHash === codeHash && !entry.usedAt
  );

  if (!matchingEntry) {
    return false;
  }

  matchingEntry.usedAt = new Date();
  await user.save();
  return true;
};

module.exports = {
  normalizeBackupCode,
  formatBackupCode,
  generateBackupCodes,
  countRemainingBackupCodes,
  replaceBackupCodes,
  consumeBackupCode,
};
