const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const Prescription = require('../models/Prescription');
const Review = require('../models/Review');
const Post = require('../models/Post');
const { ensureKeyRing } = require('../security/keyManagementService');
const { buildLookupDigest } = require('../security/secureField');
const { normalizeEmail } = require('../services/userSecurityService');

const logStep = (label, count) => {
  console.log(`${label}: ${count}`);
};

const migrateUsers = async () => {
  const users = await User.find({});
  let migrated = 0;

  for (const user of users) {
    const rawName = user.get('name', null, { getters: false });
    const rawEmail = user.get('email', null, { getters: false });
    const rawContactInfo = user.get('contactInfo', null, { getters: false });
    let changed = false;

    if (rawName && !String(rawName).startsWith('enc::')) {
      user.name = user.name;
      changed = true;
    }

    if (rawEmail && !String(rawEmail).startsWith('enc::')) {
      user.email = normalizeEmail(user.email);
      changed = true;
    }

    if (rawContactInfo && !String(rawContactInfo).startsWith('enc::')) {
      user.contactInfo = user.contactInfo;
      changed = true;
    }

    const nextLookup = buildLookupDigest(normalizeEmail(user.email));
    if (user.emailLookup !== nextLookup) {
      user.emailLookup = nextLookup;
      changed = true;
    }

    if (changed) {
      await user.save();
      migrated += 1;
    }
  }

  return migrated;
};

const migrateAppointments = async () => {
  const appointments = await Appointment.find({});
  let migrated = 0;

  for (const appointment of appointments) {
    appointment.petName = appointment.petName;
    appointment.petType = appointment.petType;
    appointment.reason = appointment.reason;
    appointment.notes = appointment.notes;
    await appointment.save();
    migrated += 1;
  }

  return migrated;
};

const migrateMessages = async () => {
  const messages = await Message.find({});
  let migrated = 0;

  for (const message of messages) {
    message.content = message.content;
    await message.save();
    migrated += 1;
  }

  return migrated;
};

const migratePrescriptions = async () => {
  const prescriptions = await Prescription.find({});
  let migrated = 0;

  for (const prescription of prescriptions) {
    prescription.petName = prescription.petName;
    prescription.petType = prescription.petType;
    prescription.diagnosis = prescription.diagnosis;
    prescription.notes = prescription.notes;
    prescription.medicines = (prescription.medicines || []).map((item) => ({
      name: item.name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    }));
    await prescription.save();
    migrated += 1;
  }

  return migrated;
};

const migrateReviews = async () => {
  const reviews = await Review.find({});
  let migrated = 0;

  for (const review of reviews) {
    review.comment = review.comment;
    review.adminNote = review.adminNote;
    await review.save();
    migrated += 1;
  }

  return migrated;
};

const migratePosts = async () => {
  const posts = await Post.find({});
  let migrated = 0;

  for (const post of posts) {
    post.title = post.title;
    post.content = post.content;
    await post.save();
    migrated += 1;
  }

  return migrated;
};

const run = async () => {
  ensureKeyRing();
  await connectDB();

  logStep('Migrated users', await migrateUsers());
  logStep('Migrated appointments', await migrateAppointments());
  logStep('Migrated messages', await migrateMessages());
  logStep('Migrated prescriptions', await migratePrescriptions());
  logStep('Migrated reviews', await migrateReviews());
  logStep('Migrated posts', await migratePosts());

  process.exit(0);
};

run().catch((error) => {
  console.error('Sensitive data migration failed:', error);
  process.exit(1);
});
