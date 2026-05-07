const mongoose = require('mongoose');
const { createEncryptedStringField } = require('../security/secureField');

const messageSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      ...createEncryptedStringField('elgamal'),
      required: true,
      maxlength: 12000,
    },
    readAt: {
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

messageSchema.index({ appointment: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
