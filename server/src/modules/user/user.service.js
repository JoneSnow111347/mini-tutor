'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || 'tutor_miniapp_secret_key';
const JWT_EXPIRES = '7d';

const VALID_ROLES = ['parent', 'teacher', 'both'];

async function listUsers() {
  return User.findAll();
}

async function getUserById(id) {
  const user = await User.findByPk(id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
}

async function loginUser(phone) {
  if (!phone || String(phone).trim() === '') {
    const err = new Error('phone is required');
    err.status = 400;
    throw err;
  }
  const user = await User.findOne({ where: { phone: String(phone).trim() } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );


  return { ...user.toJSON(), token };
}

async function createUser(data) {
  const missing = [];
  if (!data.phone || String(data.phone).trim() === '') missing.push('phone');
  if (!data.role  || String(data.role).trim()  === '') missing.push('role');
  if (missing.length > 0) {
    const err = new Error('Missing required fields');
    err.status = 400;
    err.fields = missing;
    throw err;
  }

  if (!VALID_ROLES.includes(data.role)) {
    const err = new Error(`role must be one of: ${VALID_ROLES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  try {
    return await User.create({
      phone:      String(data.phone).trim(),
      role:       data.role,
      nickname:   data.nickname   || null,
      avatar_url: data.avatar_url || null,
      status:     'active'
    });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      const err = new Error('Phone number already registered');
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

async function updateUserById(id, data) {
  const user = await User.findByPk(id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (data.role && !VALID_ROLES.includes(data.role)) {
    const err = new Error(`role must be one of: ${VALID_ROLES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const allowed = ['phone', 'role', 'nickname', 'avatar_url', 'status'];
  allowed.forEach((key) => { if (data[key] !== undefined) user[key] = data[key]; });

  try {
    return await user.save();
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      const err = new Error('Phone number already registered');
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

module.exports = { listUsers, getUserById, loginUser, createUser, updateUserById, VALID_ROLES };
