'use strict';

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'tutor_miniapp_secret_key';

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, data: null, message: 'Unauthorized: missing token' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, data: null, message: 'Unauthorized: invalid or expired token' });
  }
};
