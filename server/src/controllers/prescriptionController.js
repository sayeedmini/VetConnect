const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');

const normalizeMedicines = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      name: String(item?.name || '').trim(),
      dosage: String(item?.dosage || '').trim(),
      frequency: String(item?.frequency || '').trim(),
      duration: String(item?.duration || '').trim(),
      instructions: String(item?.instructions || '').trim(),
    }))
    .filter((item) => item.name && item.dosage);
};

const populatePrescriptionQuery = (query) =>
  query
    .populate('appointment', 'appointmentDate slotLabel startTime endTime status petName petType reason')
    .populate('clinic', 'clinicName address contactNumber')
    .populate('vet', 'name email role')
    .populate('petOwner', 'name email role');

const upsertPrescriptionByAppointment = async (req, res) => {
  try {
    if (!['vet', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only vets or admin can create prescriptions',
      });
    }

    const { appointmentId } = req.params;
    const { diagnosis, medicines, notes } = req.body;

    if (!diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Diagnosis is required',
      });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('clinic', 'clinicName address contactNumber')
      .populate('petOwner', 'name email role')
      .populate('clinicOwner', 'name email role');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const isClinicOwner = appointment.clinicOwner?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isClinicOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned vet or admin can manage this prescription',
      });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Prescription can only be created for completed appointments',
      });
    }

    const normalizedMedicines = normalizeMedicines(medicines);
    let prescription = await Prescription.findOne({ appointment: appointment._id });

    if (prescription) {
      prescription.diagnosis = diagnosis;
      prescription.medicines = normalizedMedicines;
      prescription.notes = notes || '';
      prescription.vet = isAdmin ? appointment.clinicOwner._id : req.user._id;
      prescription.issuedAt = new Date();
      await prescription.save();
    } else {
      prescription = await Prescription.create({
        appointment: appointment._id,
        clinic: appointment.clinic._id,
        vet: isAdmin ? appointment.clinicOwner._id : req.user._id,
        petOwner: appointment.petOwner._id,
        petName: appointment.petName,
        petType: appointment.petType,
        diagnosis,
        medicines: normalizedMedicines,
        notes: notes || '',
        issuedAt: new Date(),
      });
    }

    const populatedPrescription = await populatePrescriptionQuery(
      Prescription.findById(prescription._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Prescription saved successfully',
      data: populatedPrescription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save prescription',
      error: error.message,
    });
  }
};

const getPrescriptionByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
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
        message: 'You do not have permission to view this prescription',
      });
    }

    const prescription = await populatePrescriptionQuery(
      Prescription.findOne({ appointment: appointmentId })
    );

    return res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription',
      error: error.message,
    });
  }
};

const getMyPrescriptions = async (req, res) => {
  try {
    const { petName = '' } = req.query;
    const query = {};

    if (req.user.role === 'petOwner') {
      query.petOwner = req.user._id;
    } else if (req.user.role === 'vet') {
      query.vet = req.user._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view prescriptions',
      });
    }

    const prescriptions = await populatePrescriptionQuery(
      Prescription.find(query).sort({ createdAt: -1 })
    );

    const filteredPrescriptions = petName
      ? prescriptions.filter((item) =>
          String(item.petName || '').toLowerCase().includes(String(petName).trim().toLowerCase())
        )
      : prescriptions;

    return res.status(200).json({
      success: true,
      count: filteredPrescriptions.length,
      data: filteredPrescriptions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription history',
      error: error.message,
    });
  }
};

module.exports = {
  upsertPrescriptionByAppointment,
  getPrescriptionByAppointment,
  getMyPrescriptions,
};
