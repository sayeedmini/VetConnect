const { ensureKeyRing, listManagedKeys, rotateKey } = require('../security/keyManagementService');

const getPublicKeys = async (req, res) => {
  try {
    const keyRing = ensureKeyRing();
    const data = Object.entries(keyRing.active).map(([algorithm, keyId]) => {
      const key = keyRing.keys[keyId];
      return {
        algorithm,
        keyId,
        publicKey: key.publicKey,
      };
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load public keys',
      error: error.message,
    });
  }
};

const getManagedKeys = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: listManagedKeys(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load key metadata',
      error: error.message,
    });
  }
};

const rotateManagedKey = async (req, res) => {
  try {
    const algorithm = String(req.params.algorithm || '').toLowerCase();

    if (!['rsa', 'elgamal'].includes(algorithm)) {
      return res.status(400).json({
        success: false,
        message: 'Only rsa and elgamal key rotation are supported',
      });
    }

    const nextKey = rotateKey(algorithm);

    return res.status(200).json({
      success: true,
      message: `${algorithm.toUpperCase()} key rotated successfully`,
      data: {
        id: nextKey.id,
        algorithm: nextKey.algorithm,
        version: nextKey.version,
        publicKey: nextKey.publicKey,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to rotate key',
      error: error.message,
    });
  }
};

module.exports = {
  getPublicKeys,
  getManagedKeys,
  rotateManagedKey,
};
