const express = require('express');
const {
  upsertPrescriptionByAppointment,
  getPrescriptionByAppointment,
  getMyPrescriptions,
} = require('../controllers/prescriptionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/my', protect, getMyPrescriptions);
router.get('/appointments/:appointmentId', protect, getPrescriptionByAppointment);
router.put('/appointments/:appointmentId', protect, upsertPrescriptionByAppointment);

module.exports = router;
