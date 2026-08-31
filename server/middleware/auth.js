const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await db.read();
    const user = db.data.users.find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    req.user = { id: user.id, username: user.username, email: user.email, display_name: user.display_name, bio: user.bio, avatar: user.avatar };
    next();
  } catch (error) {
    return res.status(403).json({ error: '登录已过期，请重新登录' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await db.read();
    const user = db.data.users.find(u => u.id === decoded.userId);
    req.user = user ? { id: user.id, username: user.username, email: user.email, display_name: user.display_name, bio: user.bio, avatar: user.avatar } : null;
  } catch (error) {
    req.user = null;
  }
  next();
};

module.exports = { authenticateToken, optionalAuth };
