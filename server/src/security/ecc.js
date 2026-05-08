const { randomBetween } = require('./random');

const CURVE = {
  name: 'vetconnect-secp256k1-elgamal',
  p: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  a: 0n,
  b: 7n,
  gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
  gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
  n: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
};

const POINT_AT_INFINITY = null;
const BASE_POINT = { x: CURVE.gx, y: CURVE.gy };

const mod = (value, modulus) => {
  const result = BigInt(value) % BigInt(modulus);
  return result >= 0n ? result : result + BigInt(modulus);
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
  const result = extendedGcd(mod(value, modulus), BigInt(modulus));

  if (result.gcd !== 1n) {
    throw new Error('Modular inverse does not exist');
  }

  return mod(result.x, modulus);
};

const isPointAtInfinity = (point) => point === POINT_AT_INFINITY;

const isPointOnCurve = (point) => {
  if (isPointAtInfinity(point)) {
    return true;
  }

  const left = mod(point.y * point.y, CURVE.p);
  const right = mod(point.x * point.x * point.x + CURVE.a * point.x + CURVE.b, CURVE.p);
  return left === right;
};

const negatePoint = (point) => {
  if (isPointAtInfinity(point)) {
    return POINT_AT_INFINITY;
  }

  return {
    x: point.x,
    y: mod(-point.y, CURVE.p),
  };
};

const addPoints = (left, right) => {
  if (isPointAtInfinity(left)) {
    return right;
  }

  if (isPointAtInfinity(right)) {
    return left;
  }

  if (!isPointOnCurve(left) || !isPointOnCurve(right)) {
    throw new Error('Point is not on the configured elliptic curve');
  }

  if (left.x === right.x && mod(left.y + right.y, CURVE.p) === 0n) {
    return POINT_AT_INFINITY;
  }

  let slope;

  if (left.x === right.x && left.y === right.y) {
    if (left.y === 0n) {
      return POINT_AT_INFINITY;
    }

    slope = mod(
      (3n * left.x * left.x + CURVE.a) * modInverse(2n * left.y, CURVE.p),
      CURVE.p
    );
  } else {
    slope = mod((right.y - left.y) * modInverse(right.x - left.x, CURVE.p), CURVE.p);
  }

  const x = mod(slope * slope - left.x - right.x, CURVE.p);
  const y = mod(slope * (left.x - x) - left.y, CURVE.p);
  const result = { x, y };

  if (!isPointOnCurve(result)) {
    throw new Error('Point addition produced an invalid curve point');
  }

  return result;
};

const subtractPoints = (left, right) => addPoints(left, negatePoint(right));

const multiplyPoint = (point, scalar) => {
  if (!isPointOnCurve(point)) {
    throw new Error('Point is not on the configured elliptic curve');
  }

  let result = POINT_AT_INFINITY;
  let addend = point;
  let current = mod(scalar, CURVE.n);

  while (current > 0n) {
    if (current & 1n) {
      result = addPoints(result, addend);
    }

    addend = addPoints(addend, addend);
    current >>= 1n;
  }

  return result;
};

const serializePoint = (point) => {
  if (isPointAtInfinity(point)) {
    throw new Error('Point at infinity cannot be serialized in this ECC ElGamal flow');
  }

  return {
    x: point.x.toString(16),
    y: point.y.toString(16),
  };
};

const normalizePoint = (point) => {
  if (!point || typeof point !== 'object' || !point.x || !point.y) {
    throw new Error('Invalid serialized ECC point');
  }

  const normalized = {
    x: BigInt(`0x${point.x}`),
    y: BigInt(`0x${point.y}`),
  };

  if (!isPointOnCurve(normalized)) {
    throw new Error('Serialized point is not on the configured elliptic curve');
  }

  return normalized;
};

const normalizePrivateScalar = (privateKey) => {
  if (!privateKey?.scalar) {
    throw new Error('Invalid ECC private key');
  }

  const scalar = BigInt(`0x${privateKey.scalar}`);

  if (scalar <= 0n || scalar >= CURVE.n) {
    throw new Error('ECC private scalar is outside the valid range');
  }

  return scalar;
};

const createBytePointTable = () => {
  const points = [];
  const lookup = new Map();

  for (let byte = 0; byte < 256; byte += 1) {
    const point = multiplyPoint(BASE_POINT, BigInt(byte + 1));
    const serialized = serializePoint(point);
    const key = `${serialized.x}:${serialized.y}`;

    if (lookup.has(key)) {
      throw new Error('Byte-to-point mapping is not one-to-one');
    }

    points.push(point);
    lookup.set(key, byte);
  }

  return { points, lookup };
};

const { points: BYTE_POINTS, lookup: BYTE_POINT_LOOKUP } = createBytePointTable();

const decodeMessagePoint = (point) => {
  const serialized = serializePoint(point);
  const key = `${serialized.x}:${serialized.y}`;

  if (!BYTE_POINT_LOOKUP.has(key)) {
    throw new Error('Decrypted ECC point does not map to a valid plaintext byte');
  }

  return BYTE_POINT_LOOKUP.get(key);
};

const generateKeyPair = () => {
  const privateScalar = randomBetween(2n, CURVE.n - 2n);
  const publicPoint = multiplyPoint(BASE_POINT, privateScalar);

  return {
    publicKey: {
      algorithm: 'ecc',
      curve: CURVE.name,
      point: serializePoint(publicPoint),
    },
    privateKey: {
      algorithm: 'ecc',
      curve: CURVE.name,
      scalar: privateScalar.toString(16),
    },
  };
};

const encryptText = (plainText, publicKey) => {
  const recipientPoint = normalizePoint(publicKey?.point);
  const plaintextBytes = Buffer.from(String(plainText ?? ''), 'utf8');
  const ephemeralScalar = randomBetween(2n, CURVE.n - 2n);
  const c1 = multiplyPoint(BASE_POINT, ephemeralScalar);
  const sharedPoint = multiplyPoint(recipientPoint, ephemeralScalar);
  const c2 = Array.from(plaintextBytes, (byte) =>
    serializePoint(addPoints(BYTE_POINTS[byte], sharedPoint))
  );

  return {
    c1: serializePoint(c1),
    c2,
  };
};

const decryptText = (payload, privateKey) => {
  const c1 = normalizePoint(payload?.c1);
  const c2Points = Array.isArray(payload?.c2) ? payload.c2.map(normalizePoint) : [];
  const privateScalar = normalizePrivateScalar(privateKey);
  const sharedPoint = multiplyPoint(c1, privateScalar);
  const plaintextBytes = c2Points.map((point) => decodeMessagePoint(subtractPoints(point, sharedPoint)));

  return Buffer.from(plaintextBytes).toString('utf8');
};

if (!isPointOnCurve(BASE_POINT)) {
  throw new Error('Configured ECC base point is not on the configured elliptic curve');
}

module.exports = {
  CURVE,
  generateKeyPair,
  encryptText,
  decryptText,
  addPoints,
  subtractPoints,
  multiplyPoint,
  isPointOnCurve,
};
