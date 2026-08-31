const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

const router = express.Router();

// multer 配置
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// 获取帖子列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        p.*, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id) as retweets_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.retweet_from IS NULL
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ posts: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户帖子
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT 
        p.*, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1 AND p.retweet_from IS NULL
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json({ posts: result.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发帖（支持图片）
router.post('/', upload.single('media'), async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');

    const { content, location, retweet_from } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '请输入内容' });
    }

    let image_url = null;
    let video_url = null;

    if (req.file) {
      const ext = req.file.mimetype;
      if (ext.startsWith('video/')) {
        video_url = `/uploads/${req.file.filename}`;
      } else {
        image_url = `/uploads/${req.file.filename}`;
      }
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, content, image_url, video_url, location, retweet_from) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [decoded.userId, content, image_url, video_url, location, retweet_from || null]
    );

    const postWithUser = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar 
       FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ post: { ...postWithUser.rows[0], likes_count: 0, comments_count: 0 } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除帖子
router.delete('/:id', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');

    const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (post.rows.length === 0) return res.status(404).json({ error: '帖子不存在' });
    if (post.rows[0].user_id !== decoded.userId) return res.status(403).json({ error: '只能删除自己的帖子' });

    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 点赞
router.post('/:id/like', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');

    const existing = await pool.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [decoded.userId, req.params.id]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [decoded.userId, req.params.id]);
      res.json({ liked: false, message: '取消点赞' });
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [decoded.userId, req.params.id]);
      res.json({ liked: true, message: '点赞成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 转发
router.post('/:id/retweet', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');

    const existing = await pool.query(
      'SELECT id FROM posts WHERE user_id = $1 AND retweet_from = $2',
      [decoded.userId, req.params.id]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM posts WHERE id = $1', [existing.rows[0].id]);
      res.json({ retweeted: false, message: '取消转发' });
    } else {
      await pool.query('INSERT INTO posts (user_id, content, retweet_from) VALUES ($1, \'\', $2)', [decoded.userId, req.params.id]);
      res.json({ retweeted: true, message: '转发成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 评论
router.get('/:id/comments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
    `, [req.params.id]);
    res.json({ comments: result.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发表回复
router.post('/:id/comments', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: '请输入评论内容' });

    const result = await pool.query(
      'INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *',
      [decoded.userId, req.params.id, content]
    );

    const commentWithUser = await pool.query(
      'SELECT c.*, u.username, u.display_name, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1',
      [result.rows[0].id]
    );

    res.status(201).json({ comment: commentWithUser.rows[0] });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
