const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const VetClinic = require('../models/VetClinic');
const { buildSessionFingerprint } = require('../services/sessionSecurityService');

const resolveTokenFromRequest = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1];
  }

  return null;
};

const authenticateRequest = async (req, { allowAnonymous = false } = {}) => {
  const token = resolveTokenFromRequest(req);

  if (!token) {
    if (allowAnonymous) {
      req.user = null;
      req.authSession = null;
      return;
    }

    const error = new Error('Not authorized. No token provided');
    error.statusCode = 401;
    throw error;
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is missing in .env file');
    error.statusCode = 500;
    throw error;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    const error = new Error('User no longer exists');
    error.statusCode = 401;
    throw error;
  }

  const sessionId = decoded.sid;

  if (!sessionId) {
    const error = new Error('Session metadata is missing from the token');
    error.statusCode = 401;
    throw error;
  }

  const session = await Session.findOne({
    sessionId,
    user: user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    const error = new Error('The session is no longer active');
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
      message: error.message || 'Invalid or expired token',
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
      message: error.message || 'Invalid or expired token',
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
