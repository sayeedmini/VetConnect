const fs = require('fs');
const path = require('path');
const { generateKeyPair: generateRsaKeyPair, encryptText: rsaEncryptText, decryptText: rsaDecryptText } = require('./rsa');
const { generateKeyPair: generateElgamalKeyPair } = require('./elgamal');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');
const BOOTSTRAP_PATH = path.join(STORAGE_DIR, 'crypto-bootstrap.json');
const KEYRING_PATH = path.join(STORAGE_DIR, 'crypto-keyring.json');

let cachedBootstrap = null;
let cachedKeyRing = null;

const ensureStorageDir = () => {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
};

const readJson = (targetPath) => JSON.parse(fs.readFileSync(targetPath, 'utf8'));

const writeJson = (targetPath, value) => {
  fs.writeFileSync(targetPath, JSON.stringify(value, null, 2), 'utf8');
};

const ensureBootstrapKey = () => {
  ensureStorageDir();

  if (cachedBootstrap) {
    return cachedBootstrap;
  }

  if (!fs.existsSync(BOOTSTRAP_PATH)) {
    const bootstrapPair = generateRsaKeyPair(384);
    writeJson(BOOTSTRAP_PATH, {
      version: 1,
      createdAt: new Date().toISOString(),
      publicKey: bootstrapPair.publicKey,
      privateKey: bootstrapPair.privateKey,
    });
  }

  cachedBootstrap = readJson(BOOTSTRAP_PATH);
  return cachedBootstrap;
};

const encryptPrivateKey = (privateKeyPayload) => {
  const bootstrap = ensureBootstrapKey();
  return rsaEncryptText(JSON.stringify(privateKeyPayload), bootstrap.publicKey);
};

const decryptPrivateKey = (encryptedPayload) => {
  const bootstrap = ensureBootstrapKey();
  return JSON.parse(rsaDecryptText(encryptedPayload, bootstrap.privateKey));
};

const createManagedKeyEntry = (algorithm, keyPair, version) => ({
  id: `${algorithm}-v${version}`,
  algorithm,
  version,
  status: 'active',
  createdAt: new Date().toISOString(),
  publicKey: keyPair.publicKey,
  encryptedPrivateKey: encryptPrivateKey(keyPair.privateKey),
});

const createInitialKeyRing = () => {
  const rsaPair = generateRsaKeyPair(384);
  const elgamalPair = generateElgamalKeyPair();

  return {
    version: 1,
    active: {
      rsa: 'rsa-v1',
      elgamal: 'elgamal-v1',
    },
    keys: {
      'rsa-v1': createManagedKeyEntry('rsa', rsaPair, 1),
      'elgamal-v1': createManagedKeyEntry('elgamal', elgamalPair, 1),
    },
  };
};

const ensureKeyRing = () => {
  ensureBootstrapKey();

  if (cachedKeyRing) {
    return cachedKeyRing;
  }

  if (!fs.existsSync(KEYRING_PATH)) {
    writeJson(KEYRING_PATH, createInitialKeyRing());
  }

  cachedKeyRing = readJson(KEYRING_PATH);
  return cachedKeyRing;
};

const saveKeyRing = (keyRing) => {
  cachedKeyRing = keyRing;
  writeJson(KEYRING_PATH, keyRing);
};

const getActiveKeyRecord = (algorithm) => {
  const keyRing = ensureKeyRing();
  const keyId = keyRing.active[algorithm];
  return keyRing.keys[keyId] || null;
};

const getActiveKeyPair = (algorithm) => {
  const record = getActiveKeyRecord(algorithm);

  if (!record) {
    throw new Error(`No active key found for algorithm "${algorithm}"`);
  }

  return {
    id: record.id,
    algorithm: record.algorithm,
    version: record.version,
    publicKey: record.publicKey,
    privateKey: decryptPrivateKey(record.encryptedPrivateKey),
  };
};

const getKeyPairById = (keyId) => {
  const keyRing = ensureKeyRing();
  const record = keyRing.keys[keyId];

  if (!record) {
    throw new Error(`Key "${keyId}" was not found in the keyring`);
  }

  return {
    id: record.id,
    algorithm: record.algorithm,
    version: record.version,
    publicKey: record.publicKey,
    privateKey: decryptPrivateKey(record.encryptedPrivateKey),
  };
};

const rotateKey = (algorithm) => {
  const keyRing = ensureKeyRing();
  const activeRecord = getActiveKeyRecord(algorithm);
  const nextVersion = (activeRecord?.version || 0) + 1;
  const keyPair = algorithm === 'rsa' ? generateRsaKeyPair(384) : generateElgamalKeyPair();
  const nextId = `${algorithm}-v${nextVersion}`;

  if (activeRecord) {
    keyRing.keys[activeRecord.id] = {
      ...activeRecord,
      status: 'rotated',
      rotatedAt: new Date().toISOString(),
    };
  }

  keyRing.keys[nextId] = createManagedKeyEntry(algorithm, keyPair, nextVersion);
  keyRing.active[algorithm] = nextId;
  saveKeyRing(keyRing);

  return getActiveKeyPair(algorithm);
};

const listManagedKeys = () => {
  const keyRing = ensureKeyRing();
  return Object.values(keyRing.keys).map((entry) => ({
    id: entry.id,
    algorithm: entry.algorithm,
    version: entry.version,
    status: entry.status,
    createdAt: entry.createdAt,
    rotatedAt: entry.rotatedAt || null,
    publicKey: entry.publicKey,
  }));
};

module.exports = {
  ensureBootstrapKey,
  ensureKeyRing,
  getActiveKeyPair,
  getKeyPairById,
  rotateKey,
  listManagedKeys,
};
