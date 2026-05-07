const Appointment = require('../models/Appointment');

const populateAppointment = (query) =>
  query
    .populate('petOwner', 'name email role')
    .populate('clinicOwner', 'name email role')
    .populate('clinic', 'clinicName address');

const canAccessAppointmentMessages = (appointment, user) => {
  if (!appointment || !user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  const userId = user._id.toString();

  return (
    appointment.petOwner?._id?.toString() === userId ||
    appointment.clinicOwner?._id?.toString() === userId
  );
};

const getParticipantForViewer = (appointment, viewerId) => {
  const isPetOwner = appointment.petOwner?._id?.toString() === viewerId;

  return isPetOwner ? appointment.clinicOwner : appointment.petOwner;
};

const getRecipientForSender = (appointment, senderId) =>
  appointment.petOwner?._id?.toString() === senderId
    ? appointment.clinicOwner
    : appointment.petOwner;

module.exports = {
  Appointment,
  populateAppointment,
  canAccessAppointmentMessages,
  getParticipantForViewer,
  getRecipientForSender,
};
