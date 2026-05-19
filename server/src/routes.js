const express = require('express');
const auth = require('./middleware/auth');
const admin = require('./middleware/admin');
const userRoutes = require('./modules/user/user.route');
const teacherRoutes = require('./modules/teacher/teacher.route');
const demandRoutes = require('./modules/demand/demand.route');
const applyRoutes = require('./modules/apply/apply.route');
const favoriteRoutes = require('./modules/favorite/favorite.route');
const messageRoutes = require('./modules/message/message.route');
const smsRoutes = require('./modules/sms/sms.route');
const identityRoutes = require('./modules/identity/identity.route');
const adminRoutes = require('./modules/admin/admin.route');

const router = express.Router();

router.use('/sms', smsRoutes);
router.use('/users', userRoutes);
router.use('/teachers', teacherRoutes);
router.use('/admin/auth', adminRoutes.publicRouter);

router.use('/demands', auth, demandRoutes);
router.use('/applies', auth, applyRoutes);
router.use('/favorites', auth, favoriteRoutes);
router.use('/messages', auth, messageRoutes);
router.use('/identity', auth, identityRoutes.userRouter);
router.use('/admin', admin, identityRoutes.adminRouter);
router.use('/admin', admin, adminRoutes.protectedRouter);

module.exports = router;
