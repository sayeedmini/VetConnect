const User = require('../models/User');
const {
  normalizeEmail,
  buildUserResponse,
  buildLookupDigest,
} = require('../services/userSecurityService');

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -emailLookup');

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

module.exports = {
  getMyProfile,
  updateMyProfile,
};
