'use strict';

const { Teacher, User } = require('../../db');

const REQUIRED_FIELDS = ['user_id', 'real_name', 'teaching_subjects'];

function mapIdentityStatusToTeacherStatus(identityStatus) {
  if (identityStatus === 'approved') return 'verified';
  if (identityStatus === 'rejected') return 'rejected';
  return 'pending';
}

function assertTeacherRole(user) {
  if (!['teacher', 'both'].includes(user.role)) {
    const err = new Error('Only teacher accounts can manage teacher profiles');
    err.status = 403;
    throw err;
  }
}

async function getUserOrThrow(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
}

async function listTeachers() {
  return Teacher.findAll();
}

async function getTeacherById(id) {
  const teacher = await Teacher.findByPk(id);
  if (!teacher) {
    const err = new Error('Teacher not found');
    err.status = 404;
    throw err;
  }
  return teacher;
}

async function createTeacher(data) {
  const missing = REQUIRED_FIELDS.filter(
    (f) => data[f] === undefined || data[f] === null || String(data[f]).trim() === ''
  );
  if (missing.length > 0) {
    const err = new Error('Missing required fields');
    err.status = 400;
    err.fields = missing;
    throw err;
  }

  const user = await getUserOrThrow(data.user_id);
  assertTeacherRole(user);

  return Teacher.create({
    user_id:             data.user_id,
    real_name:           String(data.real_name).trim(),
    teaching_subjects:   data.teaching_subjects,
    verification_status: mapIdentityStatusToTeacherStatus(user.identity_status),
    is_public:           data.is_public !== undefined ? data.is_public : true,
    bio:                 data.bio || null,
    phone:               data.phone || user.phone || null,
  });
}

async function updateTeacherById(id, data, currentUserId) {
  const teacher = await Teacher.findByPk(id);
  if (!teacher) {
    const err = new Error('Teacher not found');
    err.status = 404;
    throw err;
  }
  if (currentUserId && Number(teacher.user_id) !== Number(currentUserId)) {
    const err = new Error('You can only edit your own teacher profile');
    err.status = 403;
    throw err;
  }

  if (data.user_id !== undefined) {
    await getUserOrThrow(data.user_id);
  }

  const allowed = ['user_id', 'real_name', 'teaching_subjects', 'is_public', 'bio', 'phone'];
  allowed.forEach((key) => { if (data[key] !== undefined) teacher[key] = data[key]; });

  const statusUserId = data.user_id !== undefined ? data.user_id : teacher.user_id;
  const user = await getUserOrThrow(statusUserId);
  assertTeacherRole(user);
  teacher.verification_status = mapIdentityStatusToTeacherStatus(user.identity_status);

  return teacher.save();
}

async function syncTeacherVerificationStatusForUser(userId) {
  const teacher = await Teacher.findOne({ where: { user_id: Number(userId) } });
  if (!teacher) return null;

  const user = await getUserOrThrow(userId);
  teacher.verification_status = mapIdentityStatusToTeacherStatus(user.identity_status);
  await teacher.save();
  return teacher;
}

async function deleteTeacherById(id, currentUserId) {
  const teacher = await Teacher.findByPk(id);
  if (!teacher) {
    const err = new Error('Teacher not found');
    err.status = 404;
    throw err;
  }
  if (currentUserId && Number(teacher.user_id) !== Number(currentUserId)) {
    const err = new Error('You can only delete your own teacher profile');
    err.status = 403;
    throw err;
  }
  await teacher.destroy();
}

module.exports = {
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacherById,
  deleteTeacherById,
  syncTeacherVerificationStatusForUser,
  mapIdentityStatusToTeacherStatus,
};
