const express = require('express');
const {
  getConversationList,
  getConversationByAppointment,
  sendMessage,
  markConversationAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/my', protect, getConversationList);
router.get('/appointments/:appointmentId', protect, getConversationByAppointment);
router.post('/appointments/:appointmentId', protect, sendMessage);
router.patch('/appointments/:appointmentId/read', protect, markConversationAsRead);

module.exports = router;
