const { hmacSha256 } = require('./hmac');
const { getActiveKeyPair, getKeyPairById } = require('./keyManagementService');
const rsa = require('./rsa');
const ecc = require('./ecc');
const elgamal = require('./elgamal');

const ENVELOPE_PREFIX = 'enc::';

const getIntegritySecret = () =>
  process.env.MAC_SECRET || process.env.SESSION_SECRET || 'vetconnect-integrity-secret';

const buildCipher = (algorithm) => {
  if (algorithm === 'rsa') {
    return rsa;
  }

  if (algorithm === 'ecc') {
    return ecc;
  }

  if (algorithm === 'elgamal') {
    return elgamal;
  }

  throw new Error(`Unsupported algorithm: ${algorithm}`);
};

const createEnvelope = (algorithm, plainText) => {
  const keyPair = getActiveKeyPair(algorithm);
  const cipher = buildCipher(algorithm);
  const payload = cipher.encryptText(String(plainText ?? ''), keyPair.publicKey);
  const envelope = {
    version: 1,
    algorithm,
    keyId: keyPair.id,
    payload,
  };

  envelope.mac = hmacSha256(getIntegritySecret(), JSON.stringify(envelope));
  return `${ENVELOPE_PREFIX}${Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64')}`;
};

const parseEnvelope = (value) => {
  if (typeof value !== 'string' || !value.startsWith(ENVELOPE_PREFIX)) {
    return null;
  }

  const raw = Buffer.from(value.slice(ENVELOPE_PREFIX.length), 'base64').toString('utf8');
  const envelope = JSON.parse(raw);
  const { mac, ...macPayload } = envelope;
  const expectedMac = hmacSha256(getIntegritySecret(), JSON.stringify(macPayload));

  if (mac !== expectedMac) {
    throw new Error('Encrypted field integrity verification failed');
  }

  return envelope;
};

const decryptEnvelopeValue = (value) => {
  const envelope = parseEnvelope(value);

  if (!envelope) {
    return value;
  }

  const keyPair = getKeyPairById(envelope.keyId);
  const cipher = buildCipher(envelope.algorithm);
  return cipher.decryptText(envelope.payload, keyPair.privateKey);
};

const createEncryptedStringField = (algorithm) => ({
  type: String,
  default: '',
  set(value) {
    if (value === undefined || value === null || value === '') {
      return '';
    }

    if (typeof value === 'string' && value.startsWith(ENVELOPE_PREFIX)) {
      return value;
    }

    return createEnvelope(algorithm, value);
  },
  get(value) {
    if (!value) {
      return '';
    }

    return decryptEnvelopeValue(value);
  },
});

const buildLookupDigest = (value) =>
  hmacSha256(getIntegritySecret(), String(value ?? '').trim().toLowerCase());

module.exports = {
  createEncryptedStringField,
  decryptEnvelopeValue,
  buildLookupDigest,
};
