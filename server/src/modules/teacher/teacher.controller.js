'use strict';

const teacherService = require('./teacher.service');

function handleError(res, err) {
  const status = err.status || 500;
  const body = { success: false, message: err.message };
  if (err.fields) body.errors = err.fields;
  return res.status(status).json(body);
}

async function listTeachers(req, res) {
  try {
    const data = await teacherService.listTeachers();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getTeacherById(req, res) {
  try {
    const teacher = await teacherService.getTeacherById(parseInt(req.params.id, 10));
    return res.status(200).json({ success: true, data: teacher });
  } catch (err) {
    return handleError(res, err);
  }
}

async function createTeacher(req, res) {
  try {
    const teacher = await teacherService.createTeacher(req.body);
    return res.status(201).json({ success: true, message: 'Teacher profile created', data: teacher });
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateTeacherById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const updatable = ['user_id', 'real_name', 'teaching_subjects', 'verification_status', 'is_public'];
    const payload = {};
    updatable.forEach((f) => {
      if (req.body[f] !== undefined) {
        payload[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
      }
    });

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const teacher = await teacherService.updateTeacherById(id, payload);
    return res.status(200).json({ success: true, message: 'Teacher profile updated', data: teacher });
  } catch (err) {
    return handleError(res, err);
  }
}

async function deleteTeacherById(req, res) {
  try {
    await teacherService.deleteTeacherById(parseInt(req.params.id, 10));
    return res.status(200).json({ success: true, message: 'Teacher profile deleted' });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listTeachers, getTeacherById, createTeacher, updateTeacherById, deleteTeacherById };
