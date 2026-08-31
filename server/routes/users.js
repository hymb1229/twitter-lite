const express = require('express');
const pool = require('../db');

const router = express.Router();

// 获取用户资料
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(
      'SELECT id, username, display_name, bio, avatar, cover_image, location, website, created_at FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = result.rows[0];
    
    // 获取统计数据
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = $1) as posts_count
    `, [user.id]);

    res.json({ user: { ...user, ...stats.rows[0] } });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新个人资料
router.put('/profile', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');
    const { display_name, bio, avatar, cover_image, location, website } = req.body;

    const result = await pool.query(
      `UPDATE users SET 
        display_name = COALESCE($1, display_name),
        bio = COALESCE($2, bio),
        avatar = COALESCE($3, avatar),
        cover_image = COALESCE($4, cover_image),
        location = COALESCE($5, location),
        website = COALESCE($6, website),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, username, email, display_name, bio, avatar, cover_image, location, website`,
      [display_name, bio, avatar, cover_image, location, website, decoded.userId]
    );

    res.json({ user: result.rows[0], message: '资料更新成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 关注用户
router.post('/:id/follow', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');
    const targetId = parseInt(req.params.id);

    if (targetId === decoded.userId) {
      return res.status(400).json({ error: '不能关注自己' });
    }

    const targetUser = await pool.query('SELECT id FROM users WHERE id = $1', [targetId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const existing = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [decoded.userId, targetId]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [decoded.userId, targetId]);
      res.json({ following: false, message: '取消关注' });
    } else {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [decoded.userId, targetId]);
      res.json({ following: true, message: '关注成功' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取粉丝
router.get('/:id/followers', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.bio
      FROM follows f JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
    `, [id]);
    res.json({ followers: result.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取关注
router.get('/:id/following', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.bio
      FROM follows f JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
    `, [id]);
    res.json({ following: result.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 搜索用户
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await pool.query(`
      SELECT id, username, display_name, avatar, bio
      FROM users 
      WHERE username ILIKE $1 OR display_name ILIKE $1
      LIMIT 20
    `, [`%${query}%`]);
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
