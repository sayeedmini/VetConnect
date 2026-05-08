const { randomBetween } = require('../security/random');
const { hmacSha1Bytes } = require('../security/hmacSha1');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 2;
const TOTP_SECRET_BYTES = 20;

const normalizeCode = (value = '') => String(value).replace(/\s+/g, '').trim();

const generateSecretBytes = (length = TOTP_SECRET_BYTES) => {
  const output = new Uint8Array(length);

  for (let index = 0; index < length; index += 1) {
    output[index] = Number(randomBetween(0n, 255n));
  }

  return output;
};

const encodeBase32 = (bytes) => {
  let output = '';
  let value = 0;
  let bits = 0;

  bytes.forEach((byte) => {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  });

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const decodeBase32 = (value = '') => {
  const normalized = String(value).toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  const bytes = [];
  let buffer = 0;
  let bits = 0;

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index === -1) {
      throw new Error('Invalid Base32 secret');
    }

    buffer = (buffer << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
};

const buildCounterBytes = (counter) => {
  const output = new Uint8Array(8);
  let current = BigInt(counter);

  for (let index = 7; index >= 0; index -= 1) {
    output[index] = Number(current & 0xffn);
    current >>= 8n;
  }

  return output;
};

const computeTotp = ({ secret, timestamp = Date.now() }) => {
  const secretBytes = decodeBase32(secret);
  const counter = Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS);
  const digest = hmacSha1Bytes(secretBytes, buildCounterBytes(counter));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
};

const verifyTotp = ({ secret, code, timestamp = Date.now(), window = TOTP_WINDOW }) => {
  const normalizedCode = normalizeCode(code);

  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  for (let offset = -window; offset <= window; offset += 1) {
    const candidateTimestamp = timestamp + offset * TOTP_PERIOD_SECONDS * 1000;

    if (computeTotp({ secret, timestamp: candidateTimestamp }) === normalizedCode) {
      return true;
    }
  }

  return false;
};

const generateTotpSecret = () => encodeBase32(generateSecretBytes());

const buildOtpAuthUrl = ({ issuer, accountName, secret }) => {
  const encodedIssuer = encodeURIComponent(String(issuer || '').trim());
  const encodedAccountName = encodeURIComponent(String(accountName || '').trim());
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });

  return `otpauth://totp/${encodedIssuer}:${encodedAccountName}?${params.toString()}`;
};

module.exports = {
  TOTP_PERIOD_SECONDS,
  TOTP_DIGITS,
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotp,
};
