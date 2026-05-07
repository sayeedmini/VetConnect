const mongoose = require('mongoose');
const { createEncryptedStringField } = require('../security/secureField');

const appointmentSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VetClinic',
      required: true,
    },
    petOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clinicOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    petName: {
      ...createEncryptedStringField('rsa'),
      required: true,
    },
    petType: createEncryptedStringField('elgamal'),
    reason: createEncryptedStringField('elgamal'),
    appointmentDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    slotLabel: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled', 'completed'],
      default: 'scheduled',
    },
    notes: createEncryptedStringField('elgamal'),
    cancelledBy: {
      type: String,
      enum: ['petOwner', 'vet', 'admin', null],
      default: null,
    },
    reminderAt: {
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

appointmentSchema.index({ clinic: 1, startTime: 1, endTime: 1 });
appointmentSchema.index({ petOwner: 1, createdAt: -1 });
appointmentSchema.index({ clinicOwner: 1, createdAt: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
