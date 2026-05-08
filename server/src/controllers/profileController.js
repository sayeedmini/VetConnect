const User = require('../models/User');
const {
  normalizeEmail,
  buildUserResponse,
  buildLookupDigest,
} = require('../services/userSecurityService');
const { replaceBackupCodes } = require('../services/twoFactorRecoveryService');
const { getPasswordRecord, verifyPassword } = require('../security/passwordHasher');

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      '-password -passwordHash -passwordSalt -passwordIterations -emailLookup'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load profile',
      error: error.message,
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const nextName = String(req.body.name || '').trim();
    const nextEmail = normalizeEmail(req.body.email || '');
    const nextContactInfo = String(req.body.contactInfo || '').trim();

    if (!nextName || !nextEmail || !nextContactInfo) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and contact info are required',
      });
    }

    const nextEmailLookup = buildLookupDigest(nextEmail);
    const existingUser = await User.findOne({
      _id: { $ne: user._id },
      emailLookup: nextEmailLookup,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Another account already uses that email',
      });
    }

    user.name = nextName;
    user.email = nextEmail;
    user.contactInfo = nextContactInfo;
    user.emailLookup = nextEmailLookup;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

const regenerateBackupCodes = async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Set up your authenticator app before creating backup codes',
      });
    }

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required to regenerate backup codes',
      });
    }

    const passwordRecord = getPasswordRecord(user);
    const isPasswordValid =
      Boolean(passwordRecord) &&
      verifyPassword(
        currentPassword,
        passwordRecord.salt,
        passwordRecord.hash,
        passwordRecord.iterations
      );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const backupCodes = replaceBackupCodes(user);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'New backup codes generated successfully',
      backupCodes,
      data: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate backup codes',
      error: error.message,
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  regenerateBackupCodes,
};
