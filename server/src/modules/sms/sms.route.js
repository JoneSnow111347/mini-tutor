'use strict';

const express = require('express');
const smsController = require('./sms.controller');

const router = express.Router();

router.post('/send', smsController.sendCode);
router.post('/verify', smsController.verifyCode);

module.exports = router;
