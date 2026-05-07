const mongoose = require('mongoose');
const { createEncryptedStringField } = require('../security/secureField');

const userSchema = new mongoose.Schema(
  {
    name: {
      ...createEncryptedStringField('rsa'),
      required: true,
    },
    email: {
      ...createEncryptedStringField('rsa'),
      required: true,
    },
    contactInfo: createEncryptedStringField('elgamal'),
    emailLookup: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['petOwner', 'vet', 'groomer', 'rescuer', 'admin'],
      default: 'petOwner',
      required: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: true,
    },
    twoFactorMethod: {
      type: String,
      enum: ['totp', 'email'],
      default: 'totp',
    },
    twoFactorSecret: createEncryptedStringField('rsa'),
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

module.exports = mongoose.model('User', userSchema);
