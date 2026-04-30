const express = require('express');
const auth = require('./middleware/auth');
const userRoutes = require('./modules/user/user.route');
const teacherRoutes = require('./modules/teacher/teacher.route');
const demandRoutes = require('./modules/demand/demand.route');
const applyRoutes = require('./modules/apply/apply.route');
const favoriteRoutes = require('./modules/favorite/favorite.route');
const messageRoutes = require('./modules/message/message.route');

const router = express.Router();

// Public routes
router.use('/users', userRoutes);
router.use('/teachers', teacherRoutes);

// Protected routes
router.use('/demands', auth, demandRoutes);
router.use('/applies', auth, applyRoutes);
router.use('/favorites', auth, favoriteRoutes);
router.use('/messages', auth, messageRoutes);

module.exports = router;
