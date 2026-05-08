const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  verifyTwoFactor,
  logoutUser,
  getMe,
  requestPasswordReset,
  validatePasswordResetToken,
  resetPassword,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-2fa', verifyTwoFactor);
router.post('/forgot-password', requestPasswordReset);
router.get('/reset-password/:token', validatePasswordResetToken);
router.post('/reset-password', resetPassword);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);

module.exports = router;
