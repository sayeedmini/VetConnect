const { randomBetween } = require('./random');
const { hmacSha256 } = require('./hmac');

const PASSWORD_HASH_PREFIX = 'pwh::';
const ITERATIONS = 120000;
const SALT_BYTES = 16;

const toHexByte = (value) => Number(value).toString(16).padStart(2, '0');

const randomHex = (byteLength) => {
  let output = '';

  for (let index = 0; index < byteLength; index += 1) {
    output += toHexByte(randomBetween(0n, 255n));
  }

  return output;
};

const timingSafeEqualHex = (left = '', right = '') => {
  const normalizedLeft = String(left);
  const normalizedRight = String(right);
  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  let mismatch = normalizedLeft.length === normalizedRight.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    const leftCode = normalizedLeft.charCodeAt(index) || 0;
    const rightCode = normalizedRight.charCodeAt(index) || 0;
    mismatch |= leftCode ^ rightCode;
  }

  return mismatch === 0;
};

const derivePasswordHash = ({ password, salt, iterations = ITERATIONS }) => {
  let state = hmacSha256(salt, String(password ?? ''));

  for (let round = 1; round < iterations; round += 1) {
    state = hmacSha256(salt, `${state}:${String(password ?? '')}:${round}`);
  }

  return state;
};

const hashPassword = (password) => {
  const salt = randomHex(SALT_BYTES);
  const hash = derivePasswordHash({
    password,
    salt,
  });

  return `${PASSWORD_HASH_PREFIX}${ITERATIONS}$${salt}$${hash}`;
};

const verifyPassword = (password, storedValue = '') => {
  const normalizedStoredValue = String(storedValue || '');

  if (!normalizedStoredValue.startsWith(PASSWORD_HASH_PREFIX)) {
    return false;
  }

  const payload = normalizedStoredValue.slice(PASSWORD_HASH_PREFIX.length);
  const [iterationsValue, salt, expectedHash] = payload.split('$');
  const iterations = Number(iterationsValue);

  if (!iterations || !salt || !expectedHash) {
    return false;
  }

  const derivedHash = derivePasswordHash({
    password,
    salt,
    iterations,
  });

  return timingSafeEqualHex(derivedHash, expectedHash);
};

module.exports = {
  PASSWORD_HASH_PREFIX,
  ITERATIONS,
  hashPassword,
  verifyPassword,
};
