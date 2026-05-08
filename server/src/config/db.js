const mongoose = require('mongoose');
const Session = require('../models/Session');

const removeLegacySessionIndex = async () => {
  const indexes = await Session.collection.indexes();
  const legacySessionIdIndex = indexes.find((index) => index.name === 'sessionId_1');

  if (!legacySessionIdIndex) {
    return;
  }

  await Session.collection.dropIndex('sessionId_1');
  console.log('Removed legacy sessions index: sessionId_1');
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await removeLegacySessionIndex();
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
