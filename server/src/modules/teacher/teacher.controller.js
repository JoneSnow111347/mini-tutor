'use strict';

const teacherService = require('./teacher.service');
const { success, failure } = require('../../utils/response');

function handleError(res, err) {
  return failure(res, err, 'Teacher request failed');
}

async function listTeachers(req, res) {
  try {
    const data = await teacherService.listTeachers();
    return success(res, { message: 'Teacher profiles loaded', data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getTeacherById(req, res) {
  try {
    const teacher = await teacherService.getTeacherById(parseInt(req.params.id, 10));
    return success(res, { message: 'Teacher profile loaded', data: teacher });
  } catch (err) {
    return handleError(res, err);
  }
}

async function createTeacher(req, res) {
  try {
    const teacher = await teacherService.createTeacher({
      ...req.body,
      user_id: req.user.id,
    });
    return success(res, { status: 201, message: 'Teacher profile created', data: teacher });
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateTeacherById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const updatable = ['user_id', 'real_name', 'teaching_subjects', 'is_public', 'bio', 'phone'];
    const payload = {};
    updatable.forEach((f) => {
      if (req.body[f] !== undefined) {
        payload[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
      }
    });

    if (Object.keys(payload).length === 0) {
      return failure(res, { status: 400, message: 'No updatable fields provided' });
    }

    const teacher = await teacherService.updateTeacherById(id, payload, req.user.id);
    return success(res, { message: 'Teacher profile updated', data: teacher });
  } catch (err) {
    return handleError(res, err);
  }
}

async function deleteTeacherById(req, res) {
  try {
    await teacherService.deleteTeacherById(parseInt(req.params.id, 10), req.user.id);
    return success(res, { message: 'Teacher profile deleted' });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listTeachers, getTeacherById, createTeacher, updateTeacherById, deleteTeacherById };
