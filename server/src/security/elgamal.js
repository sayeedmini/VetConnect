const { randomBetween } = require('./random');
const { modPow, modInverse } = require('./rsa');

const DEFAULT_PRIME = '7fffffffffffffffffffffffffffffff';
const DEFAULT_GENERATOR = '05';

const normalizePublicKey = (publicKey) => ({
  p: BigInt(`0x${publicKey.p}`),
  g: BigInt(`0x${publicKey.g}`),
  y: BigInt(`0x${publicKey.y}`),
});

const normalizePrivateKey = (privateKey) => ({
  p: BigInt(`0x${privateKey.p}`),
  x: BigInt(`0x${privateKey.x}`),
});

const bytesToBigInt = (bytes) => {
  if (!bytes.length) {
    return 0n;
  }

  return BigInt(`0x${Buffer.from(bytes).toString('hex')}`);
};

const bigIntToBytes = (value, expectedLength = 0) => {
  const hexValue = BigInt(value).toString(16);
  const padded = hexValue.length % 2 === 0 ? hexValue : `0${hexValue}`;
  const bytes = padded === '00' ? Buffer.alloc(0) : Buffer.from(padded, 'hex');

  if (expectedLength && bytes.length < expectedLength) {
    const output = Buffer.alloc(expectedLength);
    bytes.copy(output, expectedLength - bytes.length);
    return output;
  }

  return bytes;
};

const chunkBytes = (bytes, chunkSize) => {
  const chunks = [];

  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(bytes.slice(index, index + chunkSize));
  }

  return chunks;
};

const generateKeyPair = () => {
  const p = BigInt(`0x${DEFAULT_PRIME}`);
  const g = BigInt(`0x${DEFAULT_GENERATOR}`);
  const x = randomBetween(2n, p - 2n);
  const y = modPow(g, x, p);

  return {
    publicKey: {
      algorithm: 'elgamal',
      p: p.toString(16),
      g: g.toString(16),
      y: y.toString(16),
    },
    privateKey: {
      algorithm: 'elgamal',
      p: p.toString(16),
      g: g.toString(16),
      x: x.toString(16),
      y: y.toString(16),
    },
  };
};

const encryptText = (plainText, publicKey) => {
  const normalizedKey = normalizePublicKey(publicKey);
  const modulusBitLength = normalizedKey.p.toString(2).length;
  const maxChunkBytes = Math.max(1, Math.floor((modulusBitLength - 1) / 8) - 1);
  const inputBytes = Buffer.from(String(plainText ?? ''), 'utf8');
  const chunks = chunkBytes(inputBytes, maxChunkBytes);

  return chunks.map((chunk) => {
    const m = bytesToBigInt(chunk) + 1n;
    const k = randomBetween(2n, normalizedKey.p - 2n);
    const a = modPow(normalizedKey.g, k, normalizedKey.p);
    const sharedSecret = modPow(normalizedKey.y, k, normalizedKey.p);
    const b = (sharedSecret * m) % normalizedKey.p;

    return {
      a: a.toString(16),
      b: b.toString(16),
      l: chunk.length,
    };
  });
};

const decryptText = (payload, privateKey) => {
  const normalizedKey = normalizePrivateKey(privateKey);
  const parts = Array.isArray(payload) ? payload : [];

  const output = Buffer.concat(
    parts.map((part) => {
      const a = BigInt(`0x${part.a}`);
      const b = BigInt(`0x${part.b}`);
      const sharedSecret = modPow(a, normalizedKey.x, normalizedKey.p);
      const inverseSecret = modInverse(sharedSecret, normalizedKey.p);
      const numericValue = ((b * inverseSecret) % normalizedKey.p) - 1n;

      return bigIntToBytes(numericValue < 0n ? 0n : numericValue, part.l);
    })
  );

  return output.toString('utf8');
};

module.exports = {
  generateKeyPair,
  encryptText,
  decryptText,
};
