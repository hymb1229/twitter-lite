const jwt = require('jsonwebtoken');

const optionalAuth = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    req.user = null;
    return next();
  }
  
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, 'secret');
    req.user = { id: decoded.userId, username: decoded.username };
  } catch (e) {
    req.user = null;
  }
  next();
};

module.exports = { optionalAuth };
