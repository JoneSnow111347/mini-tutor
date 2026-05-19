'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../../db');
const smsService = require('../sms/sms.service');

const JWT_SECRET = process.env.JWT_SECRET || 'tutor_miniapp_secret_key';
const JWT_EXPIRES = '7d';

const VALID_ROLES = ['parent', 'teacher', 'both'];
const PHONE_REGEX = /^1\d{10}$/;
const PASSWORD_MIN_LENGTH = 6;

function normalizePhone(phone) {
  return String(phone || '').trim();
}

function assertValidPhone(phone) {
  if (!PHONE_REGEX.test(phone)) {
    const err = new Error('Invalid phone number');
    err.status = 400;
    throw err;
  }
}

function assertValidPassword(password) {
  if (String(password || '').trim().length < PASSWORD_MIN_LENGTH) {
    const err = new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    err.status = 400;
    throw err;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return true;
  const [salt, derived] = String(storedHash).split(':');
  if (!salt || !derived) return false;
  const inputHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(inputHash, 'hex'));
}

function serializeUser(user) {
  const json = user.toJSON ? user.toJSON() : { ...user };
  delete json.password_hash;
  return json;
}

function buildAuthPayload(user) {
  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { ...serializeUser(user), token };
}

async function listUsers() {
  const users = await User.findAll();
  return users.map(serializeUser);
}

async function getUserById(id) {
  const user = await User.findByPk(id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return serializeUser(user);
}

async function loginUser(phone, password) {
  if (!phone || normalizePhone(phone) === '') {
    const err = new Error('phone is required');
    err.status = 400;
    throw err;
  }
  assertValidPassword(password);
  const normalizedPhone = normalizePhone(phone);
  assertValidPhone(normalizedPhone);
  const user = await User.findOne({ where: { phone: normalizedPhone } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (!verifyPassword(String(password).trim(), user.password_hash)) {
    const err = new Error('Invalid password');
    err.status = 401;
    throw err;
  }

  return buildAuthPayload(user);
}

async function createUser(data) {
  const missing = [];
  if (!data.phone || String(data.phone).trim() === '') missing.push('phone');
  if (!data.password || String(data.password).trim() === '') missing.push('password');
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

  const normalizedPhone = normalizePhone(data.phone);
  assertValidPhone(normalizedPhone);
  assertValidPassword(data.password);
  smsService.ensurePhoneVerified(normalizedPhone);

  try {
    const user = await User.create({
      phone:      normalizedPhone,
      role:       data.role,
      nickname:   data.nickname   || null,
      avatar_url: data.avatar_url || null,
      status:     'active',
      password_hash: hashPassword(String(data.password).trim()),
      sms_verified: true,
      sms_verified_at: new Date(),
    });
    return buildAuthPayload(user);
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

  if (data.phone !== undefined) {
    data.phone = normalizePhone(data.phone);
    assertValidPhone(data.phone);
  }

  const allowed = ['phone', 'role', 'nickname', 'avatar_url', 'status'];
  allowed.forEach((key) => { if (data[key] !== undefined) user[key] = data[key]; });

  try {
    const saved = await user.save();
    return serializeUser(saved);
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
