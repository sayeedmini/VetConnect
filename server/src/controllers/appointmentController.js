const Appointment = require('../models/Appointment');
const VetClinic = require('../models/VetClinic');

const SLOT_DURATION_MINUTES = 30;
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parseMinutes = (timeValue = '') => {
  const [hours, minutes] = timeValue.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const formatMinutes = (minutes) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
};

const buildDateTime = (dateValue, timeValue) => new Date(`${dateValue}T${timeValue}:00`);

const isValidDateString = (value = '') => /^\d{4}-\d{2}-\d{2}$/.test(value);

const createSlotLabel = (startMinutes, endMinutes) =>
  `${formatMinutes(startMinutes)} - ${formatMinutes(endMinutes)}`;

const overlapQuery = (clinicId, startTime, endTime, excludeAppointmentId = null) => {
  const query = {
    clinic: clinicId,
    status: 'scheduled',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  return query;
};

const serializeSlot = ({ label, startTime, endTime }) => ({
  id: startTime.toISOString(),
  label,
  startTime: startTime.toISOString(),
  endTime: endTime.toISOString(),
});

const generateAvailableSlots = async ({ clinic, dateValue, excludeAppointmentId = null }) => {
  if (clinic?.appointmentsEnabled === false) {
    return [];
  }

  const requestedDay = WEEK_DAYS[new Date(`${dateValue}T00:00:00`).getDay()];
  const workingDays = Array.isArray(clinic?.workingDays) && clinic.workingDays.length
    ? clinic.workingDays
    : WEEK_DAYS.slice(1, 6);

  if (!workingDays.includes(requestedDay)) {
    return [];
  }

  const openMinutes = parseMinutes(clinic?.workingHours?.openTime);
  const closeMinutes = parseMinutes(clinic?.workingHours?.closeTime);

  if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
    return [];
  }

  const existingAppointments = await Appointment.find({
    clinic: clinic._id,
    appointmentDate: dateValue,
    status: 'scheduled',
    ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
  }).select('startTime endTime');

  const now = new Date();
  const slots = [];

  for (
    let slotStartMinutes = openMinutes;
    slotStartMinutes + SLOT_DURATION_MINUTES <= closeMinutes;
    slotStartMinutes += SLOT_DURATION_MINUTES
  ) {
    const slotEndMinutes = slotStartMinutes + SLOT_DURATION_MINUTES;
    const startTime = buildDateTime(dateValue, formatMinutes(slotStartMinutes));
    const endTime = buildDateTime(dateValue, formatMinutes(slotEndMinutes));

    if (startTime <= now) {
      continue;
    }

    const isBooked = existingAppointments.some((appointment) => {
      return startTime < appointment.endTime && endTime > appointment.startTime;
    });

    if (!isBooked) {
      slots.push(
        serializeSlot({
          label: createSlotLabel(slotStartMinutes, slotEndMinutes),
          startTime,
          endTime,
        })
      );
    }
  }

  return slots;
};

const populateAppointmentQuery = (query) =>
  query
    .populate('petOwner', 'name email role')
    .populate('clinicOwner', 'name email role')
    .populate('clinic', 'clinicName address contactNumber workingHours consultationFee');

const getAvailableSlots = async (req, res) => {
  try {
    const { clinicId, date, excludeAppointmentId } = req.query;

    if (!clinicId || !date) {
      return res.status(400).json({
        success: false,
        message: 'clinicId and date are required',
      });
    }

    if (!isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format',
      });
    }

    const clinic = await VetClinic.findById(clinicId);
    const workingDays =
      Array.isArray(clinic?.workingDays) && clinic.workingDays.length
        ? clinic.workingDays
        : WEEK_DAYS.slice(1, 6);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Vet clinic not found',
      });
    }

    const slots = await generateAvailableSlots({
      clinic,
      dateValue: date,
      excludeAppointmentId: excludeAppointmentId || null,
    });

    return res.status(200).json({
      success: true,
      date,
      clinic: {
        _id: clinic._id,
        clinicName: clinic.clinicName,
        workingHours: clinic.workingHours,
        workingDays,
        appointmentsEnabled: clinic.appointmentsEnabled !== false,
      },
      slots,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots',
      error: error.message,
    });
  }
};

const createAppointment = async (req, res) => {
  try {
    if (!['petOwner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only pet owners or admin can book appointments',
      });
    }

    const {
      clinicId,
      appointmentDate,
      startTime: selectedStartTime,
      petName,
      petType,
      reason,
      notes,
    } = req.body;

    if (!clinicId || !appointmentDate || !selectedStartTime || !petName) {
      return res.status(400).json({
        success: false,
        message: 'clinicId, appointmentDate, startTime, and petName are required',
      });
    }

    if (!isValidDateString(appointmentDate)) {
      return res.status(400).json({
        success: false,
        message: 'appointmentDate must be in YYYY-MM-DD format',
      });
    }

    const clinic = await VetClinic.findById(clinicId).populate('owner', 'name email role');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Vet clinic not found',
      });
    }

    if (clinic.appointmentsEnabled === false) {
      return res.status(400).json({
        success: false,
        message: 'This clinic is not accepting appointments right now',
      });
    }

    const availableSlots = await generateAvailableSlots({
      clinic,
      dateValue: appointmentDate,
    });

    const selectedSlot = availableSlots.find((slot) => slot.startTime === selectedStartTime);

    if (!selectedSlot) {
      return res.status(409).json({
        success: false,
        message: 'Selected slot is no longer available',
      });
    }

    const selectedSlotStartTime = new Date(selectedSlot.startTime);
    const selectedSlotEndTime = new Date(selectedSlot.endTime);

    const clash = await Appointment.findOne(
      overlapQuery(clinic._id, selectedSlotStartTime, selectedSlotEndTime)
    );

    if (clash) {
      return res.status(409).json({
        success: false,
        message: 'This slot is already booked',
      });
    }

    const appointment = await Appointment.create({
      clinic: clinic._id,
      petOwner: req.user._id,
      clinicOwner: clinic.owner._id,
      petName,
      petType,
      reason,
      notes,
      appointmentDate,
      slotLabel: selectedSlot.label,
      startTime: selectedSlotStartTime,
      endTime: selectedSlotEndTime,
      reminderAt: new Date(selectedSlotStartTime.getTime() - 24 * 60 * 60 * 1000),
    });

    const populatedAppointment = await populateAppointmentQuery(
      Appointment.findById(appointment._id)
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: populatedAppointment,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to book appointment',
      error: error.message,
    });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (req.user.role === 'petOwner') {
      query.petOwner = req.user._id;
    } else if (req.user.role === 'vet') {
      query.clinicOwner = req.user._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view appointments',
      });
    }

    const appointments = await populateAppointmentQuery(
      Appointment.find(query).sort({ startTime: 1 })
    );

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const appointment = await populateAppointmentQuery(
      Appointment.findById(req.params.id)
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const isPetOwner = appointment.petOwner?._id?.toString() === req.user._id.toString();
    const isClinicOwner = appointment.clinicOwner?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPetOwner && !isClinicOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this appointment',
      });
    }

    return res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment',
      error: error.message,
    });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const isPetOwner = appointment.petOwner.toString() === req.user._id.toString();
    const isClinicOwner = appointment.clinicOwner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPetOwner && !isClinicOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this appointment',
      });
    }

    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled appointments can be cancelled',
      });
    }

    appointment.status = 'cancelled';
    appointment.cancelledBy = isAdmin ? 'admin' : isClinicOwner ? 'vet' : 'petOwner';
    await appointment.save();

    const populatedAppointment = await populateAppointmentQuery(
      Appointment.findById(appointment._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: populatedAppointment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message,
    });
  }
};

const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, startTime: selectedStartTime } = req.body;

    if (!appointmentDate || !selectedStartTime) {
      return res.status(400).json({
        success: false,
        message: 'appointmentDate and startTime are required',
      });
    }

    if (!isValidDateString(appointmentDate)) {
      return res.status(400).json({
        success: false,
        message: 'appointmentDate must be in YYYY-MM-DD format',
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const isPetOwner = appointment.petOwner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPetOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the pet owner or admin can reschedule this appointment',
      });
    }

    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled appointments can be rescheduled',
      });
    }

    const clinic = await VetClinic.findById(appointment.clinic).populate('owner', 'name email role');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Vet clinic not found',
      });
    }

    if (clinic.appointmentsEnabled === false) {
      return res.status(400).json({
        success: false,
        message: 'This clinic is not accepting appointments right now',
      });
    }

    const availableSlots = await generateAvailableSlots({
      clinic,
      dateValue: appointmentDate,
      excludeAppointmentId: appointment._id,
    });

    const selectedSlot = availableSlots.find((slot) => slot.startTime === selectedStartTime);

    if (!selectedSlot) {
      return res.status(409).json({
        success: false,
        message: 'Selected slot is not available for rescheduling',
      });
    }

    const selectedSlotStartTime = new Date(selectedSlot.startTime);
    const selectedSlotEndTime = new Date(selectedSlot.endTime);

    const clash = await Appointment.findOne(
      overlapQuery(clinic._id, selectedSlotStartTime, selectedSlotEndTime, appointment._id)
    );

    if (clash) {
      return res.status(409).json({
        success: false,
        message: 'This slot is already booked',
      });
    }

    appointment.appointmentDate = appointmentDate;
    appointment.slotLabel = selectedSlot.label;
    appointment.startTime = selectedSlotStartTime;
    appointment.endTime = selectedSlotEndTime;
    appointment.reminderAt = new Date(selectedSlotStartTime.getTime() - 24 * 60 * 60 * 1000);
    await appointment.save();

    const populatedAppointment = await populateAppointmentQuery(
      Appointment.findById(appointment._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: populatedAppointment,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to reschedule appointment',
      error: error.message,
    });
  }
};

const completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const isClinicOwner = appointment.clinicOwner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isClinicOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the clinic owner or admin can complete this appointment',
      });
    }

    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled appointments can be marked as completed',
      });
    }

    appointment.status = 'completed';
    await appointment.save();

    const populatedAppointment = await populateAppointmentQuery(
      Appointment.findById(appointment._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment marked as completed',
      data: populatedAppointment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to complete appointment',
      error: error.message,
    });
  }
};

module.exports = {
  getAvailableSlots,
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment,
};
