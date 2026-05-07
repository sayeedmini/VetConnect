const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  verifyTwoFactor,
  logoutUser,
  getMe,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-2fa', verifyTwoFactor);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);

module.exports = router;
