const User = require('../models/User');
const Post = require('../models/Post');
const { buildUserResponse } = require('../services/userSecurityService');
const { listManagedKeys, rotateKey } = require('../security/keyManagementService');

const populatePostQuery = (query) =>
  query
    .populate('author', 'name email role')
    .populate('comments.author', 'name email role');

const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users.map((user) => buildUserResponse(user)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

const getAdminPosts = async (req, res) => {
  try {
    const posts = await populatePostQuery(Post.find({}).sort({ updatedAt: -1 }));

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message,
    });
  }
};

const getAdminKeys = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: listManagedKeys(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch key metadata',
      error: error.message,
    });
  }
};

const rotateAdminKey = async (req, res) => {
  try {
    const algorithm = String(req.params.algorithm || '').toLowerCase();

    if (!['rsa', 'ecc'].includes(algorithm)) {
      return res.status(400).json({
        success: false,
        message: 'Only rsa and ecc key rotation are supported',
      });
    }

    const nextKey = await rotateKey(algorithm);

    return res.status(200).json({
      success: true,
      message: `${algorithm.toUpperCase()} key rotated successfully`,
      data: nextKey,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to rotate key',
      error: error.message,
    });
  }
};

module.exports = {
  getAdminUsers,
  getAdminPosts,
  getAdminKeys,
  rotateAdminKey,
};
