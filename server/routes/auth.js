const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '请填写所有必填项' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    const result = await pool.query(
      'INSERT INTO users (username, email, password, display_name, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, email, hashedPassword, display_name || username, avatar]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: '注册成功', token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '服务器错误: ' + error.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(400).json({ error: '邮箱或密码错误' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: '登录成功', token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '服务器错误: ' + error.message });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { display_name, bio, avatar } = req.body;
    const result = await pool.query(
      `UPDATE users SET display_name = COALESCE($1, display_name), bio = COALESCE($2, bio), avatar = COALESCE($3, avatar) WHERE id = $4 RETURNING *`,
      [display_name, bio, avatar, req.user.id]
    );
    res.json({ user: result.rows[0], message: '资料更新成功' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '服务器错误: ' + error.message });
  }
});

module.exports = router;
