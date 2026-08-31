const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('只支持图片文件'));
  }
});

// 获取时间线帖子
router.get('/', optionalAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const userId = req.user ? req.user.id : null;

    const posts = db.prepare(`
      SELECT 
        p.id, p.content, p.image_url, p.retweet_from, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id) as retweets_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as liked_by_me,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id AND user_id = ?) as retweeted_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.retweet_from IS NULL
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, userId, limit, offset);

    // 获取转发原帖
    for (let post of posts) {
      if (post.retweet_from) {
        const retweetPost = db.prepare(
          `SELECT p.id, p.content, p.image_url, p.created_at, u.username, u.display_name, u.avatar
           FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`
        ).get(post.retweet_from);
        post.retweet_post = retweetPost || null;
      }
    }

    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个帖子
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const post = db.prepare(`
      SELECT 
        p.id, p.content, p.image_url, p.retweet_from, p.created_at,
        u.id as user_id, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id) as retweets_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as liked_by_me,
        (SELECT COUNT(*) FROM posts WHERE retweet_from = p.id AND user_id = ?) as retweeted_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(userId, userId, id);

    if (!post) return res.status(404).json({ error: '帖子不存在' });
    res.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发帖
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const { content, retweet_from } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '请输入内容' });
    }

    if (content.length > 280) {
      return res.status(400).json({ error: '内容不能超过280个字符' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const stmt = db.prepare(
      `INSERT INTO posts (user_id, content, image_url, retweet_from) VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(req.user.id, content, image_url, retweet_from || null);

    const post = db.prepare(
      `SELECT p.*, u.username, u.display_name, u.avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json({ 
      message: '发帖成功', 
      post: { ...post, likes_count: 0, comments_count: 0, retweets_count: 0 }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除帖子
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id);
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    if (post.user_id !== req.user.id) return res.status(403).json({ error: '只能删除自己的帖子' });

    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 点赞
router.post('/:id/like', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const existingLike = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, id);

    if (existingLike) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(req.user.id, id);
      res.json({ liked: false, message: '取消点赞' });
    } else {
      db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.user.id, id);
      res.json({ liked: true, message: '点赞成功' });
    }
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 转发
router.post('/:id/retweet', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const existingRetweet = db.prepare('SELECT id FROM posts WHERE user_id = ? AND retweet_from = ?').get(req.user.id, id);

    if (existingRetweet) {
      db.prepare('DELETE FROM posts WHERE id = ?').run(existingRetweet.id);
      res.json({ retweeted: false, message: '取消转发' });
    } else {
      db.prepare('INSERT INTO posts (user_id, content, retweet_from) VALUES (?, \'\', ?)').run(req.user.id, id);
      res.json({ retweeted: true, message: '转发成功' });
    }
  } catch (error) {
    console.error('Retweet error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取评论
router.get('/:id/comments', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;

    const comments = db.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `).all(id);

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发表评论
router.post('/:id/comments', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '请输入评论内容' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const stmt = db.prepare('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)');
    const result = stmt.run(req.user.id, id, content);

    const comment = db.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ comment, message: '评论成功' });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
