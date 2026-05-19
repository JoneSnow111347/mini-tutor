'use strict';

const { User } = require('../../db');

const SMS_PROVIDER = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
const CODE_TTL_MS = Number(process.env.SMS_CODE_TTL_SECONDS || 300) * 1000;
const VERIFIED_TTL_MS = Number(process.env.SMS_VERIFIED_TTL_SECONDS || 1800) * 1000;
const PHONE_REGEX = /^1\d{10}$/;

const smsCodeStore = new Map();
const verifiedPhoneStore = new Map();

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

function purgeExpired(store, phone) {
  const entry = store.get(phone);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(phone);
    return null;
  }
  return entry;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendWithMockProvider(phone, code) {
  console.log(`[mock-sms] phone=${phone} code=${code}`);
  return { provider: 'mock' };
}

async function sendWithRealProvider(phone, code) {
  if (!process.env.SMS_API_KEY || !process.env.SMS_API_URL) {
    const err = new Error('Real SMS provider is not configured');
    err.status = 500;
    throw err;
  }

  // Placeholder: replace with a real provider SDK or HTTP call later.
  console.log(`[real-sms-placeholder] phone=${phone} code=${code}`);
  return { provider: 'real', api_url: process.env.SMS_API_URL };
}

async function sendCode(rawPhone) {
  const phone = normalizePhone(rawPhone);
  assertValidPhone(phone);

  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MS;
  smsCodeStore.set(phone, { code, expiresAt });
  verifiedPhoneStore.delete(phone);

  if (SMS_PROVIDER === 'production' || SMS_PROVIDER === 'real') {
    await sendWithRealProvider(phone, code);
  } else {
    await sendWithMockProvider(phone, code);
  }

  return {
    phone,
    expires_in: Math.floor(CODE_TTL_MS / 1000),
    mock_code: SMS_PROVIDER === 'mock' ? code : undefined,
    provider: SMS_PROVIDER === 'real' ? 'production' : SMS_PROVIDER,
  };
}

async function verifyCode(rawPhone, rawCode) {
  const phone = normalizePhone(rawPhone);
  const code = String(rawCode || '').trim();
  assertValidPhone(phone);

  if (!/^\d{6}$/.test(code)) {
    const err = new Error('Invalid verification code');
    err.status = 400;
    throw err;
  }

  const entry = purgeExpired(smsCodeStore, phone);
  if (!entry) {
    const err = new Error('Verification code expired');
    err.status = 400;
    throw err;
  }

  if (entry.code !== code) {
    const err = new Error('Verification code is incorrect');
    err.status = 400;
    throw err;
  }

  smsCodeStore.delete(phone);
  verifiedPhoneStore.set(phone, { expiresAt: Date.now() + VERIFIED_TTL_MS });

  const user = await User.findOne({ where: { phone } });
  if (user && !user.sms_verified) {
    user.sms_verified = true;
    user.sms_verified_at = new Date();
    await user.save();
  }

  return {
    phone,
    verified: true,
    verified_until: new Date(Date.now() + VERIFIED_TTL_MS).toISOString(),
    user_id: user ? user.id : null,
  };
}

function ensurePhoneVerified(rawPhone) {
  const phone = normalizePhone(rawPhone);
  assertValidPhone(phone);

  const verifiedEntry = purgeExpired(verifiedPhoneStore, phone);
  if (!verifiedEntry) {
    const err = new Error('Phone number is not verified by SMS');
    err.status = 403;
    throw err;
  }

  return true;
}

async function ensureSmsVerifiedForUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  assertValidPhone(user.phone);

  if (user.sms_verified) {
    return user;
  }

  const verifiedEntry = purgeExpired(verifiedPhoneStore, user.phone);
  if (!verifiedEntry) {
    const err = new Error('Phone number is not verified by SMS');
    err.status = 403;
    throw err;
  }

  user.sms_verified = true;
  user.sms_verified_at = new Date();
  await user.save();
  return user;
}

module.exports = {
  sendCode,
  verifyCode,
  ensurePhoneVerified,
  ensureSmsVerifiedForUser,
  assertValidPhone,
  PHONE_REGEX,
};
