const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    req.user = null;
    return next();
  }
  
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey2024');
    req.user = decoded;
  } catch (e) {
    req.user = null;
  }
  next();
};

module.exports = { optionalAuth };
