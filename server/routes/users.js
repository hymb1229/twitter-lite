const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/search/:query', async (req, res) => {
  await db.read();
  const q = req.params.query.toLowerCase();
  const users = db.data.users
    .filter(u => u.username.toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q))
    .map(u => ({ id: u.id, username: u.username, display_name: u.display_name, avatar: u.avatar }))
    .slice(0, 10);
  res.json({ users });
});

module.exports = router;
