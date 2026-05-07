const { sha1Bytes } = require('./sha1');

const BLOCK_SIZE = 64;

const toBytes = (value) => {
  if (value instanceof Uint8Array) {
    return value;
  }

  return new TextEncoder().encode(String(value ?? ''));
};

const xorBytes = (left, right) => {
  const result = new Uint8Array(left.length);
  for (let index = 0; index < left.length; index += 1) {
    result[index] = left[index] ^ right[index];
  }
  return result;
};

const concatenate = (...chunks) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
};

const hmacSha1Bytes = (key, message) => {
  let keyBytes = toBytes(key);
  const messageBytes = toBytes(message);

  if (keyBytes.length > BLOCK_SIZE) {
    keyBytes = sha1Bytes(keyBytes);
  }

  if (keyBytes.length < BLOCK_SIZE) {
    const padded = new Uint8Array(BLOCK_SIZE);
    padded.set(keyBytes);
    keyBytes = padded;
  }

  const ipad = new Uint8Array(BLOCK_SIZE).fill(0x36);
  const opad = new Uint8Array(BLOCK_SIZE).fill(0x5c);

  const inner = sha1Bytes(concatenate(xorBytes(keyBytes, ipad), messageBytes));
  return sha1Bytes(concatenate(xorBytes(keyBytes, opad), inner));
};

module.exports = {
  hmacSha1Bytes,
};
