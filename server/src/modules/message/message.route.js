'use strict';

const router = require('express').Router();
const ctrl = require('./message.controller');

router.get('/', ctrl.list);
router.put('/read', ctrl.markRead);

module.exports = router;
