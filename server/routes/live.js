const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

const router = express.Router();

// 创建直播间
router.post('/create', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');

    const { title, description } = req.body;
    const stream_key = uuidv4();

    const result = await pool.query(
      'INSERT INTO live_rooms (user_id, title, description, stream_key) VALUES ($1, $2, $3, $4) RETURNING *',
      [decoded.userId, title || '直播间', description || '', stream_key]
    );

    res.status(201).json({ room: result.rows[0], message: '直播间创建成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 开始直播
router.post('/start/:roomId', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');

    const room = await pool.query(
      'SELECT * FROM live_rooms WHERE id = $1 AND user_id = $2',
      [req.params.roomId, decoded.userId]
    );

    if (room.rows.length === 0) return res.status(404).json({ error: '直播间不存在' });

    await pool.query(
      'UPDATE live_rooms SET is_live = true, started_at = CURRENT_TIMESTAMP, viewer_count = 0 WHERE id = $1',
      [req.params.roomId]
    );

    res.json({ message: '直播已开始' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 结束直播
router.post('/end/:roomId', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');

    await pool.query(
      'UPDATE live_rooms SET is_live = false, ended_at = CURRENT_TIMESTAMP, viewer_count = 0 WHERE id = $1 AND user_id = $2',
      [req.params.roomId, decoded.userId]
    );

    res.json({ message: '直播已结束' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取直播列表
router.get('/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.username, u.display_name, u.avatar
      FROM live_rooms r
      JOIN users u ON r.user_id = u.id
      WHERE r.is_live = true
      ORDER BY r.started_at DESC
    `);
    res.json({ rooms: result.rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取直播间详情
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.username, u.display_name, u.avatar
      FROM live_rooms r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: '直播间不存在' });
    res.json({ room: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取我的直播间
router.get('/my-room', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });

  try {
    const token = auth.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');

    const result = await pool.query(
      'SELECT * FROM live_rooms WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ room: null });
    }

    res.json({ room: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
