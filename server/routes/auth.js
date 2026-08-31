const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  await db.read();
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: '邮箱或密码错误' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: '邮箱或密码错误' });
  
  const token = jwt.sign({ userId: user.id, username: user.username }, 'secret', { expiresIn: '7d' });
  res.json({ token, user });
});

router.post('/register', async (req, res) => {
  const { username, email, password, display_name } = req.body;
  await db.read();
  
  if (db.data.users.find(u => u.username === username || u.email === email)) {
    return res.status(400).json({ error: '用户名或邮箱已被使用' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: db.data.users.length,
    username,
    email,
    password: hashedPassword,
    display_name: display_name || username,
    bio: '',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  };
  
  db.data.users.push(newUser);
  await db.write();
  
  const token = jwt.sign({ userId: newUser.id, username: newUser.username }, 'secret', { expiresIn: '7d' });
  res.status(201).json({ token, user: newUser });
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '未登录' });
  
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, 'secret');
    await db.read();
    const user = db.data.users.find(u => u.id === decoded.userId);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: '无效token' });
  }
});

module.exports = router;
