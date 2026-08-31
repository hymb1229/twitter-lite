const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = 'mysimplekey';

router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, display_name } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: '请填写所有必填项' });
  
  if (db.users.find(u => u.username === username || u.email === email)) {
    return res.status(400).json({ error: '用户名或邮箱已被使用' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: db.users.length,
    username,
    email,
    password: hashedPassword,
    display_name: display_name || username,
    bio: '',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  };
  
  db.users.push(user);
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(400).json({ error: '邮箱或密码错误' });
  }
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name, avatar: user.avatar, bio: user.bio } });
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = db.users.find(u => u.id === decoded.userId);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    res.json({ user });
  } catch { res.status(401).json({ error: '无效token' }); }
});

module.exports = router;
