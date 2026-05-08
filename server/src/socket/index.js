const { Server } = require('socket.io');
const User = require('../models/User');
const Session = require('../models/Session');
const {
  Appointment,
  canAccessAppointmentMessages,
} = require('../services/messageAccessService');
const { buildSessionFingerprint } = require('../services/sessionSecurityService');
const { parseCookies } = require('../utils/cookies');
const {
  getSessionCookieName,
  parseSessionCookieValue,
  hashSessionToken,
} = require('../services/sessionSecurityService');

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
      const cookies = parseCookies(socket.handshake.headers?.cookie || '');
      const sessionToken = parseSessionCookieValue(cookies[getSessionCookieName()]);

      if (!sessionToken) {
        return next(new Error('Not authorized. No active session provided'));
      }

      const session = await Session.findOne({
        sessionTokenHash: hashSessionToken(sessionToken),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).populate('user', '-password -passwordHash -passwordSalt -passwordIterations -emailLookup');

      if (!session) {
        return next(new Error('The session is no longer active'));
      }

      const user = session.user;

      if (!user) {
        return next(new Error('User no longer exists'));
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
      return next(new Error('Invalid or expired session'));
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
