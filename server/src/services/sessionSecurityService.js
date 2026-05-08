const { hmacSha256 } = require('../security/hmac');
const { randomHex, hashToken } = require('../security/token');

const getSessionSecret = () =>
  process.env.SESSION_SECRET || process.env.MAC_SECRET || 'vetconnect-session-secret';

const getSessionCookieName = () => process.env.SESSION_COOKIE_NAME || 'vetconnect_session';

const buildSessionFingerprint = (source = {}) => {
  const userAgent = source.headers?.['user-agent'] || source.userAgent || '';
  const language = source.headers?.['accept-language'] || source.language || '';

  return hmacSha256(getSessionSecret(), `${userAgent}|${language}`);
};

const createSessionToken = () => randomHex(32);

const createSessionCookieValue = (sessionToken) => String(sessionToken || '');

const parseSessionCookieValue = (value = '') => {
  const normalized = String(value || '');

  if (!/^[a-f0-9]{64}$/i.test(normalized)) {
    return null;
  }

  return normalized.toLowerCase();
};

const getSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'Lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 2 * 60 * 60,
});

const getClearedSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'Lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 0,
  expires: new Date(0),
});

module.exports = {
  buildSessionFingerprint,
  createSessionToken,
  getSessionCookieName,
  createSessionCookieValue,
  parseSessionCookieValue,
  hashSessionToken: hashToken,
  getSessionCookieOptions,
  getClearedSessionCookieOptions,
};
