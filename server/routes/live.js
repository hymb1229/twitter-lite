const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/list', (req, res) => {
  const rooms = db.liveRooms.filter(r => r.is_live).map(r => {
    const user = db.users[r.user_id];
    return { ...r, username: user?.username, display_name: user?.display_name, avatar: user?.avatar };
  });
  res.json({ rooms });
});

module.exports = router;
