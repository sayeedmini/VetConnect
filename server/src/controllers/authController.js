const User = require('../models/User');
const LoginChallenge = require('../models/LoginChallenge');
const PasswordResetToken = require('../models/PasswordResetToken');
const Session = require('../models/Session');
const {
  normalizeEmail,
  buildUserResponse,
  ensureEncryptedUserRecord,
} = require('../services/userSecurityService');
const { buildPasswordResetUrl, sendPasswordResetEmail } = require('../services/emailService');
const {
  buildSessionFingerprint,
  createSessionCookieValue,
  createSessionToken,
  hashSessionToken,
  getSessionCookieOptions,
  getSessionCookieName,
  getClearedSessionCookieOptions,
} = require('../services/sessionSecurityService');
const {
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotp,
} = require('../services/totpService');
const { replaceBackupCodes, consumeBackupCode } = require('../services/twoFactorRecoveryService');
const { buildLookupDigest } = require('../security/secureField');
const {
  buildPasswordFields,
  getPasswordRecord,
  verifyPassword,
} = require('../security/passwordHasher');
const { hashToken, randomHex } = require('../security/token');
const { SESSION_TTL_MS } = require('../services/sessionSecurityService');

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 6;
const PUBLIC_REGISTRATION_ROLES = ['petOwner', 'vet'];
const PASSWORD_RESET_SUCCESS_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.';

const findUserByNormalizedEmail = async (normalizedEmail) => {
  const emailLookup = buildLookupDigest(normalizedEmail);

  const user = await User.findOne({
    $or: [{ emailLookup }, { email: normalizedEmail }],
  }).select('+passwordHash +passwordSalt +passwordIterations +password');

  if (!user) {
    return null;
  }

  await ensureEncryptedUserRecord(user);
  return user;
};

const buildAuthenticatorSetupPayload = (user, secret, fallbackEmail = '') => {
  const issuer = process.env.TOTP_ISSUER || 'VetConnect';
  const decryptedEmail = normalizeEmail(user.email);
  const normalizedFallbackEmail = normalizeEmail(fallbackEmail);
  const accountName =
    decryptedEmail && decryptedEmail.includes('@')
      ? decryptedEmail
      : normalizedFallbackEmail || 'user@vetconnect.local';

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

const applySessionCookie = (res, sessionToken) => {
  res.setHeader(
    'Set-Cookie',
    require('../utils/cookies').serializeCookie(
      getSessionCookieName(),
      createSessionCookieValue(sessionToken),
      getSessionCookieOptions()
    )
  );
};

const clearSessionCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    require('../utils/cookies').serializeCookie(
      getSessionCookieName(),
      '',
      getClearedSessionCookieOptions()
    )
  );
};

const createAuthenticatedSession = async (req, res, user, challenge) => {
  const sessionToken = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await Session.create({
    user: user._id,
    sessionTokenHash: hashSessionToken(sessionToken),
    fingerprintHash: buildSessionFingerprint(req),
    expiresAt,
  });

  if (challenge) {
    challenge.fulfilledAt = new Date();
    await challenge.save();
  }

  applySessionCookie(res, sessionToken);

  return {
    user: buildUserResponse(user),
  };
};

const createPasswordResetToken = async (user) => {
  await PasswordResetToken.deleteMany({ user: user._id });

  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
};

const findValidPasswordResetToken = async (token) => {
  return PasswordResetToken.findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate('user');
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

    if (String(password).length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
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

    const newUser = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      contactInfo: trimmedContactInfo,
      emailLookup: buildLookupDigest(normalizedEmail),
      ...buildPasswordFields(password),
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

    const normalizedEmail = normalizeEmail(email);
    const user = await findUserByNormalizedEmail(normalizedEmail);
    const passwordRecord = getPasswordRecord(user);

    if (
      !user ||
      !passwordRecord ||
      !verifyPassword(
        password,
        passwordRecord.salt,
        passwordRecord.hash,
        passwordRecord.iterations
      )
    ) {
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
        ...buildAuthenticatorSetupPayload(user, secret, normalizedEmail),
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
      const backupCodes = replaceBackupCodes(user);
      await user.save();

      const session = await createAuthenticatedSession(req, res, user, challenge);

      return res.status(200).json({
        success: true,
        message: 'Authenticator app linked successfully. Save your backup codes in a safe place.',
        backupCodes,
        ...session,
      });
    }

    const isValidCode = verifyTotp({
      secret: user.twoFactorSecret,
      code,
    });

    if (!isValidCode) {
      const usedBackupCode = await consumeBackupCode(user, code);

      if (usedBackupCode) {
        const session = await createAuthenticatedSession(req, res, user, challenge);

        return res.status(200).json({
          success: true,
          message:
            'Backup code accepted. You are signed in, and that backup code can no longer be used.',
          usedBackupCode: true,
          ...session,
        });
      }

      challenge.attempts += 1;
      await challenge.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid authenticator or backup code',
      });
    }

    const session = await createAuthenticatedSession(req, res, user, challenge);

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

const requestPasswordReset = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await findUserByNormalizedEmail(normalizedEmail);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: PASSWORD_RESET_SUCCESS_MESSAGE,
      });
    }

    const { token } = await createPasswordResetToken(user);
    let debugResetUrl = '';

    try {
      const emailResult = await sendPasswordResetEmail({
        email: normalizeEmail(user.email),
        name: user.name,
        token,
      });

      debugResetUrl = emailResult.resetUrl || '';
    } catch (emailError) {
      console.error('Failed to deliver password reset email:', emailError.message);
      if (process.env.NODE_ENV !== 'production') {
        debugResetUrl = buildPasswordResetUrl(token);
      }
    }

    const response = {
      success: true,
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    };

    if (process.env.NODE_ENV !== 'production' && debugResetUrl) {
      response.debugResetUrl = debugResetUrl;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to start password reset',
      error: error.message,
    });
  }
};

const validatePasswordResetToken = async (req, res) => {
  try {
    const resetToken = await findValidPasswordResetToken(req.params.token);

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link is invalid or has expired',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset token is valid',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate password reset token',
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
    }

    if (String(password).length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      });
    }

    const resetToken = await findValidPasswordResetToken(token);

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link is invalid or has expired',
      });
    }

    const user = await ensureEncryptedUserRecord(resetToken.user);
    Object.assign(user, buildPasswordFields(password));
    await user.save();

    resetToken.usedAt = new Date();
    await resetToken.save();

    await PasswordResetToken.deleteMany({
      user: user._id,
      _id: { $ne: resetToken._id },
    });
    await Session.updateMany(
      {
        user: user._id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );
    await LoginChallenge.deleteMany({ user: user._id, fulfilledAt: null });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully. Please sign in with your new password.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select(
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

    clearSessionCookie(res);

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
  requestPasswordReset,
  validatePasswordResetToken,
  resetPassword,
  logoutUser,
  getMe,
};
