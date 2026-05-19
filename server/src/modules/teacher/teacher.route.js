'use strict';

const express = require('express');
const auth = require('../../middleware/auth');
const teacherController = require('./teacher.controller');

const router = express.Router();

router.get('/',        teacherController.listTeachers);
router.get('/:id',    teacherController.getTeacherById);
router.post('/',      auth, teacherController.createTeacher);
router.put('/:id',    auth, teacherController.updateTeacherById);
router.delete('/:id', auth, teacherController.deleteTeacherById);

module.exports = router;
