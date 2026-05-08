const mongoose = require('mongoose');
const Session = require('../models/Session');
const User = require('../models/User');
const { upgradeLegacyPasswordRecord } = require('../security/passwordHasher');

const removeLegacySessionIndex = async () => {
  const indexes = await Session.collection.indexes();
  const legacySessionIdIndex = indexes.find((index) => index.name === 'sessionId_1');

  if (!legacySessionIdIndex) {
    return;
  }

  await Session.collection.dropIndex('sessionId_1');
  console.log('Removed legacy sessions index: sessionId_1');
};

const migrateLegacyPasswordStorage = async () => {
  const users = await User.find({
    $or: [
      { password: { $exists: true, $ne: null } },
      { passwordHash: { $exists: false } },
      { passwordSalt: { $exists: false } },
      { passwordIterations: { $exists: false } },
    ],
  }).select('+password +passwordHash +passwordSalt +passwordIterations');

  let migratedCount = 0;

  for (const user of users) {
    const didChange = upgradeLegacyPasswordRecord(user);

    if (!didChange) {
      continue;
    }

    await user.save();
    await User.updateOne({ _id: user._id }, { $unset: { password: 1 } });
    migratedCount += 1;
  }

  if (migratedCount > 0) {
    console.log(`Migrated ${migratedCount} user password record(s) to passwordHash/passwordSalt/passwordIterations`);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await removeLegacySessionIndex();
    await migrateLegacyPasswordStorage();
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
