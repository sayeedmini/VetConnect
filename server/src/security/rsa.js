const { randomBetween, randomBits } = require('./random');

const gcd = (left, right) => {
  let a = BigInt(left);
  let b = BigInt(right);

  while (b !== 0n) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a < 0n ? -a : a;
};

const modPow = (base, exponent, modulus) => {
  if (modulus === 1n) {
    return 0n;
  }

  let result = 1n;
  let currentBase = ((BigInt(base) % modulus) + modulus) % modulus;
  let currentExponent = BigInt(exponent);

  while (currentExponent > 0n) {
    if (currentExponent & 1n) {
      result = (result * currentBase) % modulus;
    }

    currentExponent >>= 1n;
    currentBase = (currentBase * currentBase) % modulus;
  }

  return result;
};

const extendedGcd = (a, b) => {
  if (b === 0n) {
    return { gcd: a, x: 1n, y: 0n };
  }

  const next = extendedGcd(b, a % b);
  return {
    gcd: next.gcd,
    x: next.y,
    y: next.x - (a / b) * next.y,
  };
};

const modInverse = (value, modulus) => {
  const result = extendedGcd(BigInt(value), BigInt(modulus));
  if (result.gcd !== 1n) {
    throw new Error('Modular inverse does not exist');
  }

  return ((result.x % modulus) + modulus) % modulus;
};

const isProbablePrime = (value, rounds = 10) => {
  const n = BigInt(value);

  if (n === 2n || n === 3n) {
    return true;
  }

  if (n < 2n || n % 2n === 0n) {
    return false;
  }

  let d = n - 1n;
  let s = 0n;

  while (d % 2n === 0n) {
    d /= 2n;
    s += 1n;
  }

  for (let round = 0; round < rounds; round += 1) {
    const a = randomBetween(2n, n - 2n);
    let x = modPow(a, d, n);

    if (x === 1n || x === n - 1n) {
      continue;
    }

    let witnessFound = true;
    for (let step = 1n; step < s; step += 1n) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) {
        witnessFound = false;
        break;
      }
    }

    if (witnessFound) {
      return false;
    }
  }

  return true;
};

const generatePrime = (bitLength) => {
  while (true) {
    let candidate = randomBits(bitLength);
    candidate |= 1n;
    candidate |= 1n << BigInt(bitLength - 1);

    if (isProbablePrime(candidate)) {
      return candidate;
    }
  }
};

const generateKeyPair = (bitLength = 384) => {
  const e = 65537n;
  let p = 0n;
  let q = 0n;
  let phi = 0n;

  do {
    p = generatePrime(Math.floor(bitLength / 2));
    q = generatePrime(Math.floor(bitLength / 2));
    phi = (p - 1n) * (q - 1n);
  } while (p === q || gcd(e, phi) !== 1n);

  const n = p * q;
  const d = modInverse(e, phi);

  return {
    publicKey: {
      algorithm: 'rsa',
      n: n.toString(16),
      e: e.toString(16),
    },
    privateKey: {
      algorithm: 'rsa',
      p: p.toString(16),
      q: q.toString(16),
      d: d.toString(16),
      n: n.toString(16),
      e: e.toString(16),
    },
  };
};

const normalizePublicKey = (publicKey) => ({
  n: BigInt(`0x${publicKey.n}`),
  e: BigInt(`0x${publicKey.e}`),
});

const normalizePrivateKey = (privateKey) => ({
  n: BigInt(`0x${privateKey.n}`),
  d: BigInt(`0x${privateKey.d}`),
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

const encryptText = (plainText, publicKey) => {
  const normalizedKey = normalizePublicKey(publicKey);
  const modulusBitLength = normalizedKey.n.toString(2).length;
  const maxChunkBytes = Math.max(1, Math.floor((modulusBitLength - 1) / 8) - 1);
  const inputBytes = Buffer.from(String(plainText ?? ''), 'utf8');
  const chunks = chunkBytes(inputBytes, maxChunkBytes);

  return chunks.map((chunk) => {
    const numericValue = bytesToBigInt(chunk);
    const ciphertext = modPow(numericValue, normalizedKey.e, normalizedKey.n);

    return {
      c: ciphertext.toString(16),
      l: chunk.length,
    };
  });
};

const decryptText = (payload, privateKey) => {
  const normalizedKey = normalizePrivateKey(privateKey);
  const parts = Array.isArray(payload) ? payload : [];

  const output = Buffer.concat(
    parts.map((part) => {
      const plaintext = modPow(BigInt(`0x${part.c}`), normalizedKey.d, normalizedKey.n);
      return bigIntToBytes(plaintext, part.l);
    })
  );

  return output.toString('utf8');
};

module.exports = {
  modPow,
  modInverse,
  generateKeyPair,
  encryptText,
  decryptText,
};
