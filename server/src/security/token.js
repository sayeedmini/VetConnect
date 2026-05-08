const { randomBetween } = require('./random');
const { sha256 } = require('./sha256');

const randomHex = (byteLength) => {
  let output = '';

  for (let index = 0; index < byteLength; index += 1) {
    output += Number(randomBetween(0n, 255n)).toString(16).padStart(2, '0');
  }

  return output;
};

const hashToken = (value) => sha256(String(value || ''));

module.exports = {
  randomHex,
  hashToken,
};
