const express = require('express');
const {
  getAdminUsers,
  getAdminPosts,
  getAdminKeys,
  rotateAdminKey,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/users', getAdminUsers);
router.get('/posts', getAdminPosts);
router.get('/keys', getAdminKeys);
router.post('/keys/rotate/:algorithm', rotateAdminKey);

module.exports = router;
