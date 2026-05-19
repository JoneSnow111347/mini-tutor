'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Admin } = require('../../db');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'tutor_admin_jwt_secret';

function serializeAdmin(admin) {
  const json = admin.toJSON ? admin.toJSON() : { ...admin };
  delete json.password_hash;
  return json;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, derived] = String(storedHash || '').split(':');
  if (!salt || !derived) return false;
  const inputHash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(inputHash, 'hex'));
}

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, type: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '12h' }
  );
}

async function ensureDefaultAdmin() {
  const username = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123456';
  const existing = await Admin.findOne({ where: { username } });

  if (existing) return existing;

  return Admin.create({
    username,
    password_hash: hashPassword(password),
    status: 'active',
  });
}

async function login(username, password) {
  if (!String(username || '').trim()) {
    const err = new Error('username is required');
    err.status = 400;
    throw err;
  }
  if (String(password || '').length < 6) {
    const err = new Error('password must be at least 6 characters');
    err.status = 400;
    throw err;
  }

  const admin = await Admin.findOne({ where: { username: String(username).trim() } });
  if (!admin || admin.status !== 'active') {
    const err = new Error('Admin account not found');
    err.status = 404;
    throw err;
  }

  if (!verifyPassword(password, admin.password_hash)) {
    const err = new Error('Invalid admin password');
    err.status = 401;
    throw err;
  }

  admin.last_login_at = new Date();
  await admin.save();

  return {
    admin: serializeAdmin(admin),
    token: signAdminToken(admin),
  };
}

async function getAdminProfile(adminId) {
  const admin = await Admin.findByPk(adminId);
  if (!admin) {
    const err = new Error('Admin account not found');
    err.status = 404;
    throw err;
  }
  return serializeAdmin(admin);
}

module.exports = {
  ensureDefaultAdmin,
  login,
  getAdminProfile,
};
