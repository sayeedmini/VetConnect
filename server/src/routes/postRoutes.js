const express = require('express');
const {
  getPosts,
  getPostById,
  createPost,
  updatePost,
} = require('../controllers/postController');
const { protectOptional, protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protectOptional, getPosts);
router.get('/:id', protectOptional, getPostById);
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);

module.exports = router;
