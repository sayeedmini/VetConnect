const express = require('express');
const {
  getPublicKeys,
  getManagedKeys,
  rotateManagedKey,
} = require('../controllers/keyManagementController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/public-keys', getPublicKeys);
router.get('/keys', protect, authorize('admin'), getManagedKeys);
router.post('/keys/rotate/:algorithm', protect, authorize('admin'), rotateManagedKey);

module.exports = router;
