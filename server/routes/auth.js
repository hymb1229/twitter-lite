const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
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

    // 检查用户是否存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已被使用' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const stmt = db.prepare(
      `INSERT INTO users (username, email, password, display_name, avatar) VALUES (?, ?, ?, ?, ?)`
    );
    const result = stmt.run(username, email, hashedPassword, display_name || username, avatar);

    const user = db.prepare('SELECT id, username, email, display_name, bio, avatar, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    // 生成 Token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        bio: user.bio,
        avatar: user.avatar,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 更新个人资料
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { display_name, bio, avatar } = req.body;
    
    const stmt = db.prepare(
      `UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), avatar = COALESCE(?, avatar), updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    stmt.run(display_name, bio, avatar, req.user.id);

    const user = db.prepare('SELECT id, username, email, display_name, bio, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ user, message: '资料更新成功' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
