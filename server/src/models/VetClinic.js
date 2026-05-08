const mongoose = require('mongoose');
const { createEncryptedStringField } = require('../security/secureField');

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_CLINIC_IMAGE = '/clinic-default.svg';

const vetClinicSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clinicName: {
      ...createEncryptedStringField('ecc'),
      required: true,
    },
    address: {
      ...createEncryptedStringField('ecc'),
      required: true,
    },
    contactNumber: {
      ...createEncryptedStringField('ecc'),
      required: true,
    },
    servicesOffered: {
      type: [createEncryptedStringField('ecc')],
      default: [],
    },
    workingHours: {
      openTime: {
        ...createEncryptedStringField('ecc'),
        required: true,
      },
      closeTime: {
        ...createEncryptedStringField('ecc'),
        required: true,
      },
    },
    workingDays: {
      type: [String],
      enum: WEEK_DAYS,
      default: WEEK_DAYS.slice(1, 6),
    },
    appointmentsEnabled: {
      type: Boolean,
      default: true,
    },
    consultationFee: {
      type: Number,
      required: true,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    clinicImage: {
      type: String,
      trim: true,
      default: DEFAULT_CLINIC_IMAGE,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return Array.isArray(value) && value.length === 2;
          },
          message: 'Location coordinates must be [longitude, latitude]',
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

vetClinicSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('VetClinic', vetClinicSchema);
