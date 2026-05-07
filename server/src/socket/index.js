const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const {
  Appointment,
  canAccessAppointmentMessages,
} = require('../services/messageAccessService');
const { buildSessionFingerprint } = require('../services/sessionSecurityService');

let ioInstance = null;

const getUserRoom = (userId) => `user:${userId}`;
const getAppointmentRoom = (appointmentId) => `appointment:${appointmentId}`;

const initializeSocketServer = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Not authorized. No token provided'));
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error('JWT_SECRET is missing in .env file'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User no longer exists'));
      }

      if (!decoded.sid) {
        return next(new Error('Session metadata is missing from the token'));
      }

      const session = await Session.findOne({
        sessionId: decoded.sid,
        user: user._id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        return next(new Error('The session is no longer active'));
      }

      const fingerprintHash = buildSessionFingerprint({
        headers: socket.handshake.headers,
      });

      if (session.fingerprintHash !== fingerprintHash) {
        return next(new Error('Session fingerprint validation failed'));
      }

      socket.user = user;
      socket.authSession = session;
      return next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    socket.join(getUserRoom(userId));

    socket.on('conversation:join', async ({ appointmentId } = {}, callback) => {
      try {
        if (!appointmentId) {
          throw new Error('appointmentId is required');
        }

        const appointment = await Appointment.findById(appointmentId)
          .populate('petOwner', '_id')
          .populate('clinicOwner', '_id');

        if (!appointment) {
          throw new Error('Appointment not found');
        }

        if (!canAccessAppointmentMessages(appointment, socket.user)) {
          throw new Error('You do not have permission to join this conversation');
        }

        socket.join(getAppointmentRoom(appointmentId));
        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('conversation:leave', ({ appointmentId } = {}) => {
      if (appointmentId) {
        socket.leave(getAppointmentRoom(appointmentId));
      }
    });
  });

  return ioInstance;
};

const getIo = () => ioInstance;

const emitConversationRefresh = ({ appointmentId, userIds = [] }) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(getAppointmentRoom(appointmentId)).emit('conversation:refresh', {
    appointmentId,
  });

  userIds.forEach((userId) => {
    ioInstance.to(getUserRoom(userId)).emit('conversations:refresh', {
      appointmentId,
    });
  });
};

const emitMessageCreated = ({ appointmentId, message, userIds = [] }) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(getAppointmentRoom(appointmentId)).emit('message:new', {
    appointmentId,
    message,
  });

  userIds.forEach((userId) => {
    ioInstance.to(getUserRoom(userId)).emit('conversations:refresh', {
      appointmentId,
    });
  });
};

const emitConversationRead = ({ appointmentId, readByUserId, userIds = [] }) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(getAppointmentRoom(appointmentId)).emit('conversation:read', {
    appointmentId,
    readByUserId,
  });

  userIds.forEach((userId) => {
    ioInstance.to(getUserRoom(userId)).emit('conversations:refresh', {
      appointmentId,
    });
  });
};

module.exports = {
  initializeSocketServer,
  emitConversationRefresh,
  emitMessageCreated,
  emitConversationRead,
};
