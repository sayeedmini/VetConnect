const { hmacSha256 } = require('../security/hmac');
const { randomBetween } = require('../security/random');

const getSessionSecret = () =>
  process.env.SESSION_SECRET || process.env.JWT_SECRET || 'vetconnect-session-secret';

const buildSessionFingerprint = (source = {}) => {
  const userAgent = source.headers?.['user-agent'] || source.userAgent || '';
  const language = source.headers?.['accept-language'] || source.language || '';

  return hmacSha256(getSessionSecret(), `${userAgent}|${language}`);
};

const createSessionId = () => {
  const randomPart = randomBetween(10n ** 15n, 10n ** 18n - 1n).toString(36);
  const timePart = Date.now().toString(36);
  return `sess_${timePart}_${randomPart}`;
};

module.exports = {
  buildSessionFingerprint,
  createSessionId,
};
