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
    contactInfo: createEncryptedStringField('ecc'),
    emailLookup: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    passwordSalt: {
      type: String,
      required: true,
    },
    passwordIterations: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      default: undefined,
      select: false,
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
    backupCodes: [
      {
        codeHash: {
          type: String,
          required: true,
        },
        usedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    backupCodesGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

module.exports = mongoose.model('User', userSchema);
