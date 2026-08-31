const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const posts = db.posts.map(p => {
    const user = db.users[p.user_id];
    const likes_count = db.likes.filter(l => l.post_id === p.id).length;
    const comments_count = db.comments.filter(c => c.post_id === p.id).length;
    return { ...p, username: user?.username, display_name: user?.display_name, avatar: user?.avatar, likes_count, comments_count };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ posts });
});

router.post('/', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });
  
  try {
    const decoded = jwt.verify(auth.split(' ')[1], 'mysimplekey');
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: '请输入内容' });
    
    const post = {
      id: db.posts.length,
      user_id: decoded.userId,
      content,
      created_at: new Date().toISOString()
    };
    db.posts.push(post);
    res.status(201).json({ post });
  } catch { res.status(401).json({ error: '请先登录' }); }
});

const jwt = require('jsonwebtoken');

router.post('/:id/like', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], 'mysimplekey');
    const existing = db.likes.find(l => l.post_id === parseInt(req.params.id) && l.user_id === decoded.userId);
    if (existing) {
      db.likes = db.likes.filter(l => !(l.post_id === parseInt(req.params.id) && l.user_id === decoded.userId));
      res.json({ liked: false });
    } else {
      db.likes.push({ post_id: parseInt(req.params.id), user_id: decoded.userId });
      res.json({ liked: true });
    }
  } catch { res.status(401).json({ error: '请先登录' }); }
});

module.exports = router;
