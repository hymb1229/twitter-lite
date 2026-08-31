const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// 获取帖子
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    
    const posts = await pool.query(`
      SELECT 
        p.id, p.content, p.image_url, p.retweet_from, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id) as retweets_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = $1) as liked_by_me,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id AND user_id = $1) as retweeted_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.retweet_from IS NULL
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [userId || null]);

    // 获取转发原帖
    const postsWithRetweet = await Promise.all(posts.rows.map(async (post) => {
      if (post.retweet_from) {
        const retweetResult = await pool.query(
          `SELECT p.id, p.content, p.image_url, p.created_at, u.username, u.display_name, u.avatar
           FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
          [post.retweet_from]
        );
        post.retweet_post = retweetResult.rows[0] || null;
      }
      return post;
    }));

    res.json({ posts: postsWithRetweet });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个帖子
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const result = await pool.query(`
      SELECT p.*, u.username, u.display_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: '帖子不存在' });
    res.json({ post: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发帖
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { content, retweet_from } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '请输入内容' });
    }

    if (content.length > 280) {
      return res.status(400).json({ error: '内容不能超过280个字符' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const retweetId = retweet_from ? parseInt(retweet_from) : null;

    const result = await pool.query(
      'INSERT INTO posts (user_id, content, image_url, retweet_from) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, content, image_url, retweetId]
    );

    const postWithUser = await pool.query(
      'SELECT p.*, u.username, u.display_name, u.avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1',
      [result.rows[0].id]
    );

    res.status(201).json({ message: '发帖成功', post: { ...postWithUser.rows[0], likes_count: 0, comments_count: 0, retweets_count: 0 } });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除帖子
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (post.rows.length === 0) return res.status(404).json({ error: '帖子不存在' });
    if (post.rows[0].user_id !== req.user.id) return res.status(403).json({ error: '只能删除自己的帖子' });

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 点赞
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingLike = await pool.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, id]
    );

    if (existingLike.rows.length > 0) {
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.id, id]);
      res.json({ liked: false, message: '取消点赞' });
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [req.user.id, id]);
      res.json({ liked: true, message: '点赞成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 转发
router.post('/:id/retweet', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRetweet = await pool.query(
      'SELECT id FROM posts WHERE user_id = $1 AND retweet_from = $2',
      [req.user.id, id]
    );

    if (existingRetweet.rows.length > 0) {
      await pool.query('DELETE FROM posts WHERE id = $1', [existingRetweet.rows[0].id]);
      res.json({ retweeted: false, message: '取消转发' });
    } else {
      await pool.query('INSERT INTO posts (user_id, content, retweet_from) VALUES ($1, \'\', $2)', [req.user.id, id]);
      res.json({ retweeted: true, message: '转发成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取评论
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await pool.query(`
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1 ORDER BY c.created_at DESC
    `, [id]);
    res.json({ comments: comments.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发表评论
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '请输入评论内容' });
    }

    const result = await pool.query(
      'INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, id, content]
    );

    const commentWithUser = await pool.query(
      'SELECT c.*, u.username, u.display_name, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1',
      [result.rows[0].id]
    );

    res.status(201).json({ comment: commentWithUser.rows[0], message: '评论成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
