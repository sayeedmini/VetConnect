const Message = require('../models/Message');
const {
  Appointment,
  populateAppointment,
  canAccessAppointmentMessages,
  getParticipantForViewer,
  getRecipientForSender,
} = require('../services/messageAccessService');
const {
  emitConversationRead,
  emitMessageCreated,
} = require('../socket');

const serializeMessage = (message) => ({
  _id: message._id,
  content: message.content,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  readAt: message.readAt,
  sender: message.sender,
  recipient: message.recipient,
});

const getConversationList = async (req, res) => {
  try {
    const appointmentQuery = {};

    if (req.user.role === 'petOwner') {
      appointmentQuery.petOwner = req.user._id;
    } else if (req.user.role === 'vet') {
      appointmentQuery.clinicOwner = req.user._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view conversations',
      });
    }

    const appointments = await populateAppointment(
      Appointment.find(appointmentQuery).sort({ updatedAt: -1, startTime: -1 })
    );

    const appointmentIds = appointments.map((appointment) => appointment._id);

    const [messages, unreadRows] = await Promise.all([
      appointmentIds.length
        ? Message.find({ appointment: { $in: appointmentIds } })
            .sort({ createdAt: -1 })
            .populate('sender', 'name email role')
        : [],
      appointmentIds.length
        ? Message.aggregate([
            {
              $match: {
                appointment: { $in: appointmentIds },
                recipient: req.user._id,
                readAt: null,
              },
            },
            {
              $group: {
                _id: '$appointment',
                count: { $sum: 1 },
              },
            },
          ])
        : [],
    ]);

    const latestMessageByAppointment = new Map();
    messages.forEach((message) => {
      const key = message.appointment.toString();
      if (!latestMessageByAppointment.has(key)) {
        latestMessageByAppointment.set(key, message);
      }
    });

    const unreadCountByAppointment = new Map(
      unreadRows.map((row) => [row._id.toString(), row.count])
    );

    const data = appointments.map((appointment) => {
      const appointmentId = appointment._id.toString();
      const participant = getParticipantForViewer(appointment, req.user._id.toString());
      const lastMessage = latestMessageByAppointment.get(appointmentId);

      return {
        appointment: {
          _id: appointment._id,
          status: appointment.status,
          appointmentDate: appointment.appointmentDate,
          slotLabel: appointment.slotLabel,
          petName: appointment.petName,
          clinic: appointment.clinic,
        },
        participant,
        unreadCount: unreadCountByAppointment.get(appointmentId) || 0,
        lastMessage: lastMessage
          ? {
              _id: lastMessage._id,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              readAt: lastMessage.readAt,
              sender: lastMessage.sender,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message,
    });
  }
};

const getConversationByAppointment = async (req, res) => {
  try {
    const appointment = await populateAppointment(
      Appointment.findById(req.params.appointmentId)
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (!canAccessAppointmentMessages(appointment, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this conversation',
      });
    }

    const messages = await Message.find({ appointment: appointment._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role');

    const unreadMessageIds = messages
      .filter(
        (message) =>
          message.recipient?._id?.toString() === req.user._id.toString() && !message.readAt
      )
      .map((message) => message._id);

    if (unreadMessageIds.length) {
      const readAt = new Date();
      await Message.updateMany(
        { _id: { $in: unreadMessageIds } },
        { $set: { readAt } }
      );

      emitConversationRead({
        appointmentId: appointment._id.toString(),
        readByUserId: req.user._id.toString(),
        userIds: [
          appointment.petOwner?._id?.toString(),
          appointment.clinicOwner?._id?.toString(),
        ].filter(Boolean),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        appointment: {
          _id: appointment._id,
          status: appointment.status,
          appointmentDate: appointment.appointmentDate,
          slotLabel: appointment.slotLabel,
          petName: appointment.petName,
          reason: appointment.reason,
          clinic: appointment.clinic,
        },
        participant: getParticipantForViewer(appointment, req.user._id.toString()),
        messages: messages.map((message) =>
          serializeMessage({
            ...message.toObject(),
            readAt:
              unreadMessageIds.some((id) => id.toString() === message._id.toString())
                ? new Date()
                : message.readAt,
          })
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const appointment = await populateAppointment(
      Appointment.findById(req.params.appointmentId)
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (!canAccessAppointmentMessages(appointment, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to message in this conversation',
      });
    }

    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin cannot send appointment messages',
      });
    }

    const senderId = req.user._id.toString();
    const recipient = getRecipientForSender(appointment, senderId);

    const message = await Message.create({
      appointment: appointment._id,
      sender: req.user._id,
      recipient: recipient._id,
      content: String(content).trim(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role');

    emitMessageCreated({
      appointmentId: appointment._id.toString(),
      message: serializeMessage(populatedMessage),
      userIds: [
        appointment.petOwner?._id?.toString(),
        appointment.clinicOwner?._id?.toString(),
      ].filter(Boolean),
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: serializeMessage(populatedMessage),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

const markConversationAsRead = async (req, res) => {
  try {
    const appointment = await populateAppointment(
      Appointment.findById(req.params.appointmentId)
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (!canAccessAppointmentMessages(appointment, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this conversation',
      });
    }

    const result = await Message.updateMany(
      {
        appointment: appointment._id,
        recipient: req.user._id,
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    );

    if (result.modifiedCount) {
      emitConversationRead({
        appointmentId: appointment._id.toString(),
        readByUserId: req.user._id.toString(),
        userIds: [
          appointment.petOwner?._id?.toString(),
          appointment.clinicOwner?._id?.toString(),
        ].filter(Boolean),
      });
    }

    return res.status(200).json({
      success: true,
      markedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message,
    });
  }
};

module.exports = {
  getConversationList,
  getConversationByAppointment,
  sendMessage,
  markConversationAsRead,
};
