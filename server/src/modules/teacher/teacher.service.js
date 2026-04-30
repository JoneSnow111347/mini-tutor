'use strict';

const { Teacher } = require('../../db');

const REQUIRED_FIELDS = ['user_id', 'real_name', 'teaching_subjects'];

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

  return Teacher.create({
    user_id:             data.user_id,
    real_name:           String(data.real_name).trim(),
    teaching_subjects:   data.teaching_subjects,
    verification_status: data.verification_status || 'pending',
    is_public:           data.is_public !== undefined ? data.is_public : true
  });
}

async function updateTeacherById(id, data) {
  const teacher = await Teacher.findByPk(id);
  if (!teacher) {
    const err = new Error('Teacher not found');
    err.status = 404;
    throw err;
  }

  const allowed = ['user_id', 'real_name', 'teaching_subjects', 'verification_status', 'is_public', 'bio', 'phone'];
  allowed.forEach((key) => { if (data[key] !== undefined) teacher[key] = data[key]; });

  return teacher.save();
}

async function deleteTeacherById(id) {
  const teacher = await Teacher.findByPk(id);
  if (!teacher) {
    const err = new Error('Teacher not found');
    err.status = 404;
    throw err;
  }
  await teacher.destroy();
}

module.exports = { listTeachers, getTeacherById, createTeacher, updateTeacherById, deleteTeacherById };
