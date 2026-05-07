let state = BigInt(Date.now()) ^ 0x9e3779b97f4a7c15n;

const MASK_64 = (1n << 64n) - 1n;

const mixSeed = (value = '') => {
  for (let index = 0; index < value.length; index += 1) {
    state ^= BigInt(value.charCodeAt(index));
    state &= MASK_64;
    state ^= state << 13n;
    state &= MASK_64;
    state ^= state >> 7n;
    state &= MASK_64;
    state ^= state << 17n;
    state &= MASK_64;
  }
};

mixSeed(process.cwd());

const nextUint64 = () => {
  state ^= state << 13n;
  state &= MASK_64;
  state ^= state >> 7n;
  state &= MASK_64;
  state ^= state << 17n;
  state &= MASK_64;
  return state;
};

const randomBits = (bitLength) => {
  let value = 0n;
  let generatedBits = 0;

  while (generatedBits < bitLength) {
    value = (value << 64n) | nextUint64();
    generatedBits += 64;
  }

  const excessBits = generatedBits - bitLength;
  if (excessBits > 0) {
    value >>= BigInt(excessBits);
  }

  return value;
};

const randomBetween = (min, max) => {
  const lower = BigInt(min);
  const upper = BigInt(max);

  if (upper <= lower) {
    return lower;
  }

  const range = upper - lower + 1n;
  const bitLength = range.toString(2).length;
  let candidate = 0n;

  do {
    candidate = randomBits(bitLength);
  } while (candidate >= range);

  return lower + candidate;
};

module.exports = {
  randomBits,
  randomBetween,
};
