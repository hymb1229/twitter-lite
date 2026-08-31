const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/search/:query', (req, res) => {
  const q = req.params.query.toLowerCase();
  const users = db.users.filter(u => u.username.toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q))
    .map(u => ({ id: u.id, username: u.username, display_name: u.display_name, avatar: u.avatar }));
  res.json({ users });
});

router.get('/:username', (req, res) => {
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const followers_count = db.follows.filter(f => f.following_id === user.id).length;
  const following_count = db.follows.filter(f => f.follower_id === user.id).length;
  const posts_count = db.posts.filter(p => p.user_id === user.id).length;
  res.json({ user: { ...user, followers_count, following_count, posts_count } });
});

module.exports = router;
