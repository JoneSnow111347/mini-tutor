'use strict';

const { Teacher, User } = require('../db');

module.exports = async function requireVerifiedTeacher(req, res, next) {
  try {
    const userId = Number(req.user && req.user.id);
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found',
      });
    }

    if (!['teacher', 'both'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Only teacher accounts can access this feature',
      });
    }

    const teacher = await Teacher.findOne({ where: { user_id: userId } });
    if (!teacher) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Please complete your teacher profile first',
      });
    }

    if (user.identity_status !== 'approved' || teacher.verification_status !== 'verified') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Only verified teachers can access this feature',
      });
    }

    req.teacherProfile = teacher;
    return next();
  } catch (error) {
    return next(error);
  }
};
