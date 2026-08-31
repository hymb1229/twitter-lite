const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  await db.read();
  const userId = req.user?.id;
  
  const posts = db.data.posts
    .filter(p => !p.retweet_from)
    .map(post => {
      const user = db.data.users[post.user_id] || {};
      const likes_count = db.data.likes.filter(l => l.post_id === post.id).length;
      const comments_count = db.data.comments.filter(c => c.post_id === post.id).length;
      return {
        ...post,
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar,
        likes_count,
        comments_count,
        liked_by_me: userId ? db.data.likes.some(l => l.post_id === post.id && l.user_id === userId) ? 1 : 0 : 0
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ posts });
});

router.post('/', express.json(), async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '请输入内容' });
  
  await db.read();
  const token = req.headers.authorization?.split(' ')[1];
  // For now, allow anonymous posts
  const newPost = {
    id: db.data.posts.length,
    user_id: 0,
    content,
    created_at: new Date().toISOString()
  };
  db.data.posts.push(newPost);
  await db.write();
  
  res.json({ message: '发帖成功', post: newPost });
});

module.exports = router;
