const {
  generateKeyPair: generateRsaKeyPair,
  encryptText: rsaEncryptText,
  decryptText: rsaDecryptText,
} = require('./rsa');
const { generateKeyPair: generateElgamalKeyPair } = require('./elgamal');
const SecurityState = require('../models/SecurityState');

let cachedBootstrap = null;
let cachedKeyRing = null;
let initializationPromise = null;

const writeState = async (kind, payload) => {
  await SecurityState.findOneAndUpdate(
    { kind },
    { kind, payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const readState = async (kind) => {
  const state = await SecurityState.findOne({ kind }).lean();
  return state?.payload || null;
};

const ensureKeyManagementReady = () => {
  if (!cachedBootstrap || !cachedKeyRing) {
    throw new Error('Key management is not initialized');
  }
};

const ensureBootstrapKeySync = () => {
  ensureKeyManagementReady();
  return cachedBootstrap;
};

const ensureBootstrapKey = async () => {
  if (cachedBootstrap) {
    return cachedBootstrap;
  }

  let bootstrap = await readState('bootstrap');

  if (!bootstrap) {
    const bootstrapPair = generateRsaKeyPair(384);
    bootstrap = {
      version: 1,
      createdAt: new Date().toISOString(),
      publicKey: bootstrapPair.publicKey,
      privateKey: bootstrapPair.privateKey,
    };
    await writeState('bootstrap', bootstrap);
  }

  cachedBootstrap = bootstrap;
  return cachedBootstrap;
};

const encryptPrivateKey = (privateKeyPayload) => {
  const bootstrap = ensureBootstrapKeySync();
  return rsaEncryptText(JSON.stringify(privateKeyPayload), bootstrap.publicKey);
};

const decryptPrivateKey = (encryptedPayload) => {
  const bootstrap = ensureBootstrapKeySync();
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

const ensureKeyRing = async () => {
  await ensureBootstrapKey();

  if (cachedKeyRing) {
    return cachedKeyRing;
  }

  let keyRing = await readState('keyring');

  if (!keyRing) {
    keyRing = createInitialKeyRing();
    await writeState('keyring', keyRing);
  }

  cachedKeyRing = keyRing;
  return cachedKeyRing;
};

const initializeKeyManagement = async () => {
  if (cachedBootstrap && cachedKeyRing) {
    return {
      bootstrap: cachedBootstrap,
      keyRing: cachedKeyRing,
    };
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      await ensureKeyRing();
      return {
        bootstrap: cachedBootstrap,
        keyRing: cachedKeyRing,
      };
    })().finally(() => {
      initializationPromise = null;
    });
  }

  return initializationPromise;
};

const saveKeyRing = async (keyRing) => {
  cachedKeyRing = keyRing;
  await writeState('keyring', keyRing);
};

const getActiveKeyRecord = (algorithm) => {
  ensureKeyManagementReady();
  const keyId = cachedKeyRing.active[algorithm];
  return cachedKeyRing.keys[keyId] || null;
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
  ensureKeyManagementReady();
  const record = cachedKeyRing.keys[keyId];

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

const rotateKey = async (algorithm) => {
  const keyRing = await ensureKeyRing();
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
  await saveKeyRing(keyRing);

  return getActiveKeyPair(algorithm);
};

const listManagedKeys = () => {
  ensureKeyManagementReady();

  return Object.values(cachedKeyRing.keys).map((entry) => ({
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
  initializeKeyManagement,
  getActiveKeyPair,
  getKeyPairById,
  rotateKey,
  listManagedKeys,
};
