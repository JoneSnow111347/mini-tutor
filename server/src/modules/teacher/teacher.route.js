'use strict';

const express = require('express');
const teacherController = require('./teacher.controller');

const router = express.Router();

router.get('/',        teacherController.listTeachers);
router.get('/:id',    teacherController.getTeacherById);
router.post('/',      teacherController.createTeacher);
router.put('/:id',    teacherController.updateTeacherById);
router.delete('/:id', teacherController.deleteTeacherById);

module.exports = router;
