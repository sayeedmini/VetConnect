const {
  generateKeyPair: generateRsaKeyPair,
  encryptText: rsaEncryptText,
  decryptText: rsaDecryptText,
} = require('./rsa');
const { CURVE: ECC_CURVE, generateKeyPair: generateEccKeyPair, isPointOnCurve } = require('./ecc');
const SecurityState = require('../models/SecurityState');
const fs = require('fs');
const os = require('os');
const path = require('path');

let cachedBootstrap = null;
let cachedKeyRing = null;
let initializationPromise = null;
const KEYSTORE_DIR = path.resolve(
  process.env.KEYSTORE_DIR || path.join(os.homedir(), '.vetconnect-secure-store')
);
const BOOTSTRAP_FILE = path.join(KEYSTORE_DIR, 'bootstrap-keypair.json');
const SENSITIVE_KEY_FIELDS = new Set([
  'privatekey',
  'd',
  'p',
  'q',
  'seed',
  'secret',
  'privatescalar',
  'scalar',
]);

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
  if (!cachedBootstrap) {
    throw new Error('Bootstrap key is not initialized');
  }

  return cachedBootstrap;
};

const ensureKeystoreDir = async () => {
  await fs.promises.mkdir(KEYSTORE_DIR, { recursive: true });
};

const readBootstrapFromDisk = async () => {
  try {
    const rawValue = await fs.promises.readFile(BOOTSTRAP_FILE, 'utf8');
    return JSON.parse(rawValue);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

const writeBootstrapToDisk = async (payload) => {
  await ensureKeystoreDir();
  await fs.promises.writeFile(BOOTSTRAP_FILE, JSON.stringify(payload, null, 2), 'utf8');
};

const ensureBootstrapKey = async () => {
  if (cachedBootstrap) {
    return cachedBootstrap;
  }

  let bootstrap = await readBootstrapFromDisk();

  if (!bootstrap) {
    const bootstrapPair = generateRsaKeyPair(384);
    bootstrap = {
      version: 1,
      createdAt: new Date().toISOString(),
      publicKey: bootstrapPair.publicKey,
      privateKey: bootstrapPair.privateKey,
    };
    await writeBootstrapToDisk(bootstrap);
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

const sanitizeKeyValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeKeyValue(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce((sanitized, [fieldName, fieldValue]) => {
    const normalizedFieldName = String(fieldName).replace(/\s+/g, '').toLowerCase();

    if (SENSITIVE_KEY_FIELDS.has(normalizedFieldName)) {
      return sanitized;
    }

    sanitized[fieldName] = sanitizeKeyValue(fieldValue);
    return sanitized;
  }, {});
};

const sanitizeKeyMetadata = (entry = {}) => ({
  algorithm: entry.algorithm || null,
  keyId: entry.keyId || entry.id || null,
  version: entry.version ?? null,
  status: entry.status || null,
  createdAt: entry.createdAt || null,
  rotatedAt: entry.rotatedAt || null,
  publicKey: sanitizeKeyValue(entry.publicKey || null),
});

const createInitialKeyRing = () => {
  const rsaPair = generateRsaKeyPair(384);
  const eccPair = generateEccKeyPair();

  return {
    version: 1,
    active: {
      rsa: 'rsa-v1',
      ecc: 'ecc-v1',
    },
    keys: {
      'rsa-v1': createManagedKeyEntry('rsa', rsaPair, 1),
      'ecc-v1': createManagedKeyEntry('ecc', eccPair, 1),
    },
  };
};

const migrateLegacyKeyRing = (keyRing) => {
  let didChange = false;

  if (!keyRing?.active) {
    return {
      keyRing: createInitialKeyRing(),
      didChange: true,
    };
  }

  const activeEccKeyId = keyRing.active.ecc;
  const activeEccRecord = activeEccKeyId ? keyRing.keys?.[activeEccKeyId] : null;
  const hasValidCurveName = activeEccRecord?.publicKey?.curve === ECC_CURVE.name;
  let hasValidPublicPoint = false;

  try {
    const point = activeEccRecord?.publicKey?.point;
    hasValidPublicPoint = Boolean(
      point?.x &&
        point?.y &&
        isPointOnCurve({
          x: BigInt(`0x${point.x}`),
          y: BigInt(`0x${point.y}`),
        })
    );
  } catch (error) {
    hasValidPublicPoint = false;
  }

  if (
    !activeEccRecord ||
    activeEccRecord.algorithm !== 'ecc' ||
    !hasValidCurveName ||
    !hasValidPublicPoint
  ) {
    const existingEccVersions = Object.values(keyRing.keys || {})
      .filter((entry) => entry.algorithm === 'ecc')
      .map((entry) => entry.version || 0);
    const nextVersion =
      existingEccVersions.length > 0 ? Math.max(...existingEccVersions) + 1 : 1;
    const nextId = `ecc-v${nextVersion}`;

    keyRing.keys[nextId] = createManagedKeyEntry('ecc', generateEccKeyPair(), nextVersion);
    keyRing.active.ecc = nextId;
    didChange = true;
  }

  return {
    keyRing,
    didChange,
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

  const migrated = migrateLegacyKeyRing(keyRing);
  cachedKeyRing = migrated.keyRing;

  if (migrated.didChange) {
    await writeState('keyring', cachedKeyRing);
  }

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
  const keyPair = algorithm === 'rsa' ? generateRsaKeyPair(384) : generateEccKeyPair();
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

  return sanitizeKeyMetadata(keyRing.keys[nextId]);
};

const listManagedKeys = () => {
  ensureKeyManagementReady();

  return Object.values(cachedKeyRing.keys).map((entry) => sanitizeKeyMetadata(entry));
};

module.exports = {
  ensureBootstrapKey,
  ensureKeyRing,
  initializeKeyManagement,
  getActiveKeyPair,
  getKeyPairById,
  rotateKey,
  listManagedKeys,
  sanitizeKeyMetadata,
  getKeyStoreDir: () => KEYSTORE_DIR,
  getBootstrapFilePath: () => BOOTSTRAP_FILE,
};
