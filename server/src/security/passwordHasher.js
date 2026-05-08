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
  const iterations = ITERATIONS;
  const hash = derivePasswordHash({
    password,
    salt,
    iterations,
  });

  return {
    hash,
    salt,
    iterations,
  };
};

const parseLegacyPasswordValue = (storedValue = '') => {
  const normalizedStoredValue = String(storedValue || '');

  if (!normalizedStoredValue.startsWith(PASSWORD_HASH_PREFIX)) {
    return null;
  }

  const payload = normalizedStoredValue.slice(PASSWORD_HASH_PREFIX.length);
  const [iterationsValue, salt, hash] = payload.split('$');
  const iterations = Number(iterationsValue);

  if (!iterations || !salt || !hash) {
    return null;
  }

  return {
    hash,
    salt,
    iterations,
  };
};

const getPasswordRecord = (source = {}) => {
  if (
    source &&
    typeof source.passwordHash === 'string' &&
    typeof source.passwordSalt === 'string' &&
    Number(source.passwordIterations) > 0
  ) {
    return {
      hash: source.passwordHash,
      salt: source.passwordSalt,
      iterations: Number(source.passwordIterations),
    };
  }

  return parseLegacyPasswordValue(source?.password);
};

const setField = (target, fieldName, value) => {
  if (target && typeof target.set === 'function') {
    target.set(fieldName, value);
    return;
  }

  target[fieldName] = value;
};

const upgradeLegacyPasswordRecord = (source = {}) => {
  const record = getPasswordRecord(source);

  if (!record) {
    return false;
  }

  let didChange = false;

  if (source.passwordHash !== record.hash) {
    setField(source, 'passwordHash', record.hash);
    didChange = true;
  }

  if (source.passwordSalt !== record.salt) {
    setField(source, 'passwordSalt', record.salt);
    didChange = true;
  }

  if (Number(source.passwordIterations) !== Number(record.iterations)) {
    setField(source, 'passwordIterations', Number(record.iterations));
    didChange = true;
  }

  if (source.password !== undefined) {
    setField(source, 'password', undefined);
    didChange = true;
  }

  return didChange;
};

const buildPasswordFields = (password) => {
  const { hash, salt, iterations } = hashPassword(password);
  return {
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: iterations,
  };
};

const verifyPassword = (password, salt = '', expectedHash = '', iterations = ITERATIONS) => {
  if (!salt || !expectedHash || !Number(iterations)) {
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
  parseLegacyPasswordValue,
  getPasswordRecord,
  upgradeLegacyPasswordRecord,
  buildPasswordFields,
  verifyPassword,
};
