const express = require('express');
const {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  createComment,
  updateComment,
  deleteComment,
} = require('../controllers/postController');
const { protectOptional, protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protectOptional, getPosts);
router.get('/:id', protectOptional, getPostById);
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.post('/:id/comments', protect, createComment);
router.put('/:id/comments/:commentId', protect, updateComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);

module.exports = router;
