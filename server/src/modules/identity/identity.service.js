'use strict';

const path = require('path');
const { Op } = require('sequelize');
const { IdentityVerification, User, Teacher } = require('../../db');
const smsService = require('../sms/sms.service');
const teacherService = require('../teacher/teacher.service');

const DOCUMENT_TYPES = ['student_id', 'admission_notice'];
const PHONE_REGEX = smsService.PHONE_REGEX;

function assertValidDocumentType(documentType) {
  if (!DOCUMENT_TYPES.includes(documentType)) {
    const err = new Error(`document_type must be one of: ${DOCUMENT_TYPES.join(', ')}`);
    err.status = 400;
    throw err;
  }
}

function serializeVerification(record) {
  if (!record) return null;
  const json = record.toJSON ? record.toJSON() : record;
  return {
    ...json,
    file_url: `/uploads/identity/${path.basename(json.file_path)}`,
  };
}

function serializeUser(user) {
  if (!user) return null;
  const json = user.toJSON ? user.toJSON() : { ...user };
  delete json.password_hash;
  return json;
}

async function getUserById(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
}

async function getLatestVerification(userId) {
  return IdentityVerification.findOne({
    where: { user_id: Number(userId) },
    order: [['createdAt', 'DESC']],
  });
}

async function getMyVerification(userId) {
  const record = await getLatestVerification(userId);
  return serializeVerification(record);
}

async function attachTeacherInfo(records) {
  if (!records.length) return records;
  const userIds = [...new Set(records.map((record) => Number(record.user_id)))];
  const teachers = await Teacher.findAll({
    where: { user_id: { [Op.in]: userIds } },
  });
  const teacherMap = teachers.reduce((acc, teacher) => {
    acc[Number(teacher.user_id)] = teacher.toJSON();
    return acc;
  }, {});

  return records.map((record) => {
    const json = record.toJSON ? record.toJSON() : record;
    return {
      ...serializeVerification(record),
      user: json.User ? serializeUser(json.User) : null,
      teacher: teacherMap[Number(record.user_id)] || null,
    };
  });
}

async function listVerifications({ status } = {}) {
  const where = {};
  if (status && status !== 'all') {
    where.status = status;
  }

  const records = await IdentityVerification.findAll({
    where,
    include: [{
      model: User,
      attributes: ['id', 'phone', 'nickname', 'role', 'identity_status'],
    }],
    order: [['createdAt', 'DESC']],
  });

  return attachTeacherInfo(records);
}

async function getVerificationDetail(id) {
  const record = await IdentityVerification.findByPk(Number(id), {
    include: [{
      model: User,
      attributes: ['id', 'phone', 'nickname', 'role', 'identity_status'],
    }],
  });

  if (!record) {
    const err = new Error('Identity verification not found');
    err.status = 404;
    throw err;
  }

  const [detail] = await attachTeacherInfo([record]);
  return detail;
}

async function submitVerification(userId, documentType, file) {
  if (!file) {
    const err = new Error('Proof image is required');
    err.status = 400;
    throw err;
  }

  assertValidDocumentType(documentType);

  const user = await getUserById(userId);
  await smsService.ensureSmsVerifiedForUser(userId);

  if (!['teacher', 'both'].includes(user.role)) {
    const err = new Error('Only teacher accounts can submit identity verification');
    err.status = 403;
    throw err;
  }

  if (!PHONE_REGEX.test(String(user.phone || '').trim())) {
    const err = new Error('Invalid phone number');
    err.status = 400;
    throw err;
  }

  const latest = await getLatestVerification(userId);
  if (latest && latest.status === 'pending') {
    const err = new Error('You already have a pending identity verification');
    err.status = 409;
    throw err;
  }
  if (latest && latest.status === 'approved') {
    const err = new Error('Identity verification is already approved');
    err.status = 409;
    throw err;
  }

  const record = await IdentityVerification.create({
    user_id: userId,
    document_type: documentType,
    file_name: file.originalname,
    file_path: file.path,
    status: 'pending',
  });

  user.identity_status = 'pending';
  await user.save();
  await teacherService.syncTeacherVerificationStatusForUser(userId);

  return serializeVerification(record);
}

async function finalizeReview(record, user, status, reviewNote, reviewedBy) {
  if (record.status !== 'pending') {
    const err = new Error('Only pending identity verification can be reviewed');
    err.status = 409;
    throw err;
  }

  record.status = status;
  record.review_note = reviewNote || null;
  record.reviewed_by = reviewedBy || 'admin';
  record.reviewed_at = new Date();
  await record.save();

  user.identity_status = status;
  user.identity_verified_at = status === 'approved' ? new Date() : null;
  await user.save();
  await teacherService.syncTeacherVerificationStatusForUser(user.id);

  return {
    user: serializeUser(user),
    verification: serializeVerification(record),
  };
}

async function reviewVerification(userId, status, reviewNote, reviewedBy) {
  if (!['approved', 'rejected'].includes(status)) {
    const err = new Error('status must be approved or rejected');
    err.status = 400;
    throw err;
  }

  const user = await getUserById(userId);
  const record = await IdentityVerification.findOne({
    where: { user_id: Number(userId), status: 'pending' },
    order: [['createdAt', 'DESC']],
  });

  if (!record) {
    const err = new Error('Pending identity verification not found');
    err.status = 404;
    throw err;
  }

  return finalizeReview(record, user, status, reviewNote, reviewedBy);
}

async function reviewVerificationById(id, status, reviewNote, reviewedBy) {
  if (!['approved', 'rejected'].includes(status)) {
    const err = new Error('status must be approved or rejected');
    err.status = 400;
    throw err;
  }

  const record = await IdentityVerification.findByPk(Number(id));
  if (!record) {
    const err = new Error('Identity verification not found');
    err.status = 404;
    throw err;
  }

  const user = await getUserById(record.user_id);
  return finalizeReview(record, user, status, reviewNote, reviewedBy);
}

module.exports = {
  DOCUMENT_TYPES,
  getMyVerification,
  listVerifications,
  getVerificationDetail,
  submitVerification,
  reviewVerification,
  reviewVerificationById,
};
