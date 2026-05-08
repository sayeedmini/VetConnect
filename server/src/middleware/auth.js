const User = require('../models/User');
const Session = require('../models/Session');
const VetClinic = require('../models/VetClinic');
const { buildSessionFingerprint } = require('../services/sessionSecurityService');
const { parseCookies } = require('../utils/cookies');
const {
  getSessionCookieName,
  parseSessionCookieValue,
  hashSessionToken,
} = require('../services/sessionSecurityService');

const resolveSessionTokenFromRequest = (req) => {
  const parsedCookies =
    req.cookies && typeof req.cookies === 'object'
      ? req.cookies
      : parseCookies(req.headers.cookie || '');
  const cookieValue = parsedCookies[getSessionCookieName()];

  return parseSessionCookieValue(cookieValue);
};

const authenticateRequest = async (req, { allowAnonymous = false } = {}) => {
  const sessionToken = resolveSessionTokenFromRequest(req);

  if (!sessionToken) {
    if (allowAnonymous) {
      req.user = null;
      req.authSession = null;
      return;
    }

    const error = new Error('Not authorized. No active session provided');
    error.statusCode = 401;
    throw error;
  }

  const session = await Session.findOne({
    sessionTokenHash: hashSessionToken(sessionToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate('user', '-password');

  if (!session) {
    const error = new Error('The session is no longer active');
    error.statusCode = 401;
    throw error;
  }

  const user = session.user;

  if (!user) {
    const error = new Error('User no longer exists');
    error.statusCode = 401;
    throw error;
  }

  const fingerprintHash = buildSessionFingerprint(req);
  if (session.fingerprintHash !== fingerprintHash) {
    const error = new Error('Session fingerprint validation failed');
    error.statusCode = 401;
    throw error;
  }

  req.user = user;
  req.authSession = session;
};

const protect = async (req, res, next) => {
  try {
    await authenticateRequest(req);
    next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Invalid or expired session',
      error: error.message,
    });
  }
};

const protectOptional = async (req, res, next) => {
  try {
    await authenticateRequest(req, { allowAnonymous: true });
    next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Invalid or expired session',
      error: error.message,
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

const verifyVetClinicOwner = async (req, res, next) => {
  try {
    const clinic = await VetClinic.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Vet clinic not found',
      });
    }

    const isOwner = clinic.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the clinic owner or admin can modify this clinic',
      });
    }

    req.clinic = clinic;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Ownership verification failed',
      error: error.message,
    });
  }
};

module.exports = {
  protect,
  protectOptional,
  authorize,
  verifyVetClinicOwner,
};
