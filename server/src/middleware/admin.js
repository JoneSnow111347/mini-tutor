'use strict';

const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'tutor_admin_jwt_secret';

module.exports = function adminMiddleware(req, res, next) {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, ADMIN_JWT_SECRET);
      if (payload.type !== 'admin') {
        throw new Error('Invalid admin token');
      }
      req.admin = {
        id: payload.id,
        username: payload.username,
        type: payload.type,
      };
      return next();
    } catch (_) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Unauthorized admin request',
      });
    }
  }

  const expected = process.env.ADMIN_VERIFY_SECRET || 'tutor_admin_secret';
  const provided = req.headers['x-admin-secret'];

  if (provided && provided === expected) {
    req.admin = {
      id: null,
      username: req.headers['x-admin-name'] || 'legacy-admin',
      type: 'legacy-admin',
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    data: null,
    message: 'Unauthorized admin request',
  });
};
