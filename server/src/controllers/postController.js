const Post = require('../models/Post');

const populatePostQuery = (query) => query.populate('author', 'name email role');

const getPosts = async (req, res) => {
  try {
    const query = {};

    if (!req.user) {
      query.status = 'published';
    } else if (req.user.role === 'admin') {
      // Admin can see everything.
    } else {
      query.$or = [
        { status: 'published' },
        { author: req.user._id },
      ];
    }

    const posts = await populatePostQuery(Post.find(query).sort({ updatedAt: -1 }));

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

const getPostById = async (req, res) => {
  try {
    const post = await populatePostQuery(Post.findById(req.params.id));

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const isAuthor = req.user && post.author?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (post.status !== 'published' && !isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this post',
      });
    }

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message,
    });
  }
};

const createPost = async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const status = req.body.status === 'draft' ? 'draft' : 'published';

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    const post = await Post.create({
      author: req.user._id,
      title,
      content,
      status,
    });

    const populatedPost = await populatePostQuery(Post.findById(post._id));

    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: populatedPost,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create post',
      error: error.message,
    });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this post',
      });
    }

    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    post.title = title;
    post.content = content;
    post.status = req.body.status === 'draft' ? 'draft' : 'published';
    await post.save();

    const populatedPost = await populatePostQuery(Post.findById(post._id));

    return res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: populatedPost,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update post',
      error: error.message,
    });
  }
};

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
};
