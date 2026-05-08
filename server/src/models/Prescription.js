const mongoose = require('mongoose');
const { createEncryptedStringField } = require('../security/secureField');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      ...createEncryptedStringField('ecc'),
      required: true,
    },
    dosage: {
      ...createEncryptedStringField('ecc'),
      required: true,
    },
    frequency: createEncryptedStringField('ecc'),
    duration: createEncryptedStringField('ecc'),
    instructions: createEncryptedStringField('ecc'),
  },
  {
    _id: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VetClinic',
      required: true,
    },
    vet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    petOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    petName: {
      ...createEncryptedStringField('ecc'),
      required: true,
    },
    petType: createEncryptedStringField('ecc'),
    diagnosis: {
      ...createEncryptedStringField('ecc'),
      required: true,
    },
    medicines: {
      type: [medicineSchema],
      default: [],
    },
    notes: createEncryptedStringField('ecc'),
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

prescriptionSchema.index({ petOwner: 1, petName: 1, createdAt: -1 });
prescriptionSchema.index({ vet: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
