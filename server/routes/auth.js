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

    await db.read();
    
    // 检查用户是否存在
    const existingUser = db.data.users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已被使用' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const newUser = {
      id: db.data.users.length,
      username,
      email,
      password: hashedPassword,
      display_name: display_name || username,
      bio: '',
      avatar,
      created_at: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    // 生成 Token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: newUser
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

    await db.read();
    const user = db.data.users.find(u => u.email === email);
    
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
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户
router.get('/me', authenticateToken, async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.user.id);
  res.json({ user });
});

// 更新个人资料
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { display_name, bio, avatar } = req.body;
    
    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === req.user.id);
    
    if (userIndex !== -1) {
      db.data.users[userIndex].display_name = display_name || db.data.users[userIndex].display_name;
      db.data.users[userIndex].bio = bio || db.data.users[userIndex].bio;
      db.data.users[userIndex].avatar = avatar || db.data.users[userIndex].avatar;
      await db.write();
      res.json({ user: db.data.users[userIndex], message: '资料更新成功' });
    } else {
      res.status(404).json({ error: '用户不存在' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
