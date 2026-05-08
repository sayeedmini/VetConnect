const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  regenerateBackupCodes,
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.post('/me/backup-codes/regenerate', protect, regenerateBackupCodes);

module.exports = router;
