const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare(
      'SELECT id, username, email, display_name, bio, avatar FROM users WHERE id = ?'
    ).get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: '登录已过期，请重新登录' });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare(
      'SELECT id, username, email, display_name, bio, avatar FROM users WHERE id = ?'
    ).get(decoded.userId);
    req.user = user || null;
  } catch (error) {
    req.user = null;
  }
  next();
};

module.exports = { authenticateToken, optionalAuth };
