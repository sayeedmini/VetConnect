const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginChallenge = require('../models/LoginChallenge');
const Session = require('../models/Session');
const { buildLookupDigest } = require('../security/secureField');
const {
  normalizeEmail,
  buildUserResponse,
  ensureEncryptedUserRecord,
} = require('../services/userSecurityService');
const {
  buildSessionFingerprint,
  createSessionId,
} = require('../services/sessionSecurityService');
const {
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotp,
} = require('../services/totpService');

const ACCESS_TOKEN_TTL = '2h';
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const PUBLIC_REGISTRATION_ROLES = ['petOwner', 'vet'];

const generateToken = (user, sessionId) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      sid: sessionId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_TTL,
    }
  );

const findUserByNormalizedEmail = async (normalizedEmail) => {
  const emailLookup = buildLookupDigest(normalizedEmail);

  const user = await User.findOne({
    $or: [
      { emailLookup },
      { email: normalizedEmail },
    ],
  });

  if (!user) {
    return null;
  }

  await ensureEncryptedUserRecord(user);
  return user;
};

const buildAuthenticatorSetupPayload = (user, secret) => {
  const issuer = process.env.TOTP_ISSUER || 'VetConnect';
  const accountName = normalizeEmail(user.email);

  return {
    issuer,
    accountName,
    manualEntryKey: secret,
    otpauthUrl: buildOtpAuthUrl({
      issuer,
      accountName,
      secret,
    }),
  };
};

const createTwoFactorChallenge = async ({ user, challengeType, pendingTwoFactorSecret = '' }) => {
  await LoginChallenge.deleteMany({ user: user._id, fulfilledAt: null });

  return LoginChallenge.create({
    user: user._id,
    challengeType,
    pendingTwoFactorSecret,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
};

const createAuthenticatedSession = async (req, user, challenge) => {
  const sessionId = createSessionId();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await Session.create({
    user: user._id,
    sessionId,
    fingerprintHash: buildSessionFingerprint(req),
    expiresAt,
  });

  if (challenge) {
    challenge.fulfilledAt = new Date();
    await challenge.save();
  }

  return {
    token: generateToken(user, sessionId),
    user: buildUserResponse(user),
  };
};

const registerUser = async (req, res) => {
  try {
    const { name, email, contactInfo, password, role } = req.body;

    if (!name || !email || !contactInfo || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, contact info, and password are required',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is missing in .env file',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const trimmedName = String(name).trim();
    const trimmedContactInfo = String(contactInfo).trim();
    const selectedRole = PUBLIC_REGISTRATION_ROLES.includes(role) ? role : 'petOwner';

    const existingUser = await User.findOne({
      emailLookup: buildLookupDigest(normalizedEmail),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      contactInfo: trimmedContactInfo,
      emailLookup: buildLookupDigest(normalizedEmail),
      password: hashedPassword,
      role: selectedRole,
      twoFactorEnabled: false,
      twoFactorMethod: 'totp',
      twoFactorSecret: '',
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully. Please log in and set up your authenticator app.',
      user: buildUserResponse(newUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is missing in .env file',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await findUserByNormalizedEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.twoFactorSecret) {
      const secret = generateTotpSecret();
      const challenge = await createTwoFactorChallenge({
        user,
        challengeType: 'setup',
        pendingTwoFactorSecret: secret,
      });

      return res.status(200).json({
        success: true,
        requiresTwoFactorSetup: true,
        message: 'Set up your authenticator app to complete sign-in.',
        challengeId: challenge._id,
        expiresAt: challenge.expiresAt,
        ...buildAuthenticatorSetupPayload(user, secret),
      });
    }

    const challenge = await createTwoFactorChallenge({
      user,
      challengeType: 'verify',
    });

    return res.status(200).json({
      success: true,
      requiresTwoFactor: true,
      message: 'Primary credentials verified. Enter the code from your authenticator app.',
      challengeId: challenge._id,
      expiresAt: challenge.expiresAt,
      twoFactorMethod: 'totp',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Login failed',
      error: error.message,
    });
  }
};

const verifyTwoFactor = async (req, res) => {
  try {
    const { challengeId, code } = req.body;

    if (!challengeId || !code) {
      return res.status(400).json({
        success: false,
        message: 'challengeId and verification code are required',
      });
    }

    const challenge = await LoginChallenge.findById(challengeId).populate('user');

    if (!challenge || challenge.fulfilledAt) {
      return res.status(400).json({
        success: false,
        message: 'This verification challenge is no longer valid',
      });
    }

    if (challenge.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'The verification challenge has expired. Please log in again.',
      });
    }

    if (challenge.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Too many invalid attempts. Please log in again.',
      });
    }

    const user = await ensureEncryptedUserRecord(challenge.user);

    if (challenge.challengeType === 'setup') {
      const pendingSecret = challenge.pendingTwoFactorSecret;

      if (!pendingSecret) {
        return res.status(400).json({
          success: false,
          message: 'This authenticator setup is no longer available. Please log in again.',
        });
      }

      const isValidSetupCode = verifyTotp({
        secret: pendingSecret,
        code,
      });

      if (!isValidSetupCode) {
        challenge.attempts += 1;
        await challenge.save();

        return res.status(401).json({
          success: false,
          message: 'Invalid authenticator code',
        });
      }

      user.twoFactorSecret = pendingSecret;
      user.twoFactorEnabled = true;
      user.twoFactorMethod = 'totp';
      await user.save();

      const session = await createAuthenticatedSession(req, user, challenge);

      return res.status(200).json({
        success: true,
        message: 'Authenticator app linked successfully',
        ...session,
      });
    }

    const isValidCode = verifyTotp({
      secret: user.twoFactorSecret,
      code,
    });

    if (!isValidCode) {
      challenge.attempts += 1;
      await challenge.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid authenticator code',
      });
    }

    const session = await createAuthenticatedSession(req, user, challenge);

    return res.status(200).json({
      success: true,
      message: 'Two-step verification successful',
      ...session,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('-password -emailLookup');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get current user',
      error: error.message,
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    if (req.authSession) {
      req.authSession.revokedAt = new Date();
      await req.authSession.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to log out',
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyTwoFactor,
  logoutUser,
  getMe,
};
