const mongoose = require('mongoose');
const { createEncryptedStringField } = require('../security/secureField');

const loginChallengeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    challengeType: {
      type: String,
      enum: ['setup', 'verify'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    pendingTwoFactorSecret: createEncryptedStringField('rsa'),
    fulfilledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

loginChallengeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model('LoginChallenge', loginChallengeSchema);
