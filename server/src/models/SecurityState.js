const mongoose = require('mongoose');

const securityStateSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['bootstrap', 'keyring'],
      required: true,
      unique: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.SecurityState || mongoose.model('SecurityState', securityStateSchema);
