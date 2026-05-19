'use strict';

const smsService = require('./sms.service');
const { success, failure } = require('../../utils/response');

function handleError(res, err) {
  return failure(res, err, 'SMS request failed');
}

async function sendCode(req, res) {
  try {
    const data = await smsService.sendCode(req.body.phone);
    return success(res, {
      message: data.provider === 'mock' ? 'Mock verification code generated' : 'Verification code sent',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function verifyCode(req, res) {
  try {
    const data = await smsService.verifyCode(req.body.phone, req.body.code);
    return success(res, {
      message: 'Verification code is valid',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { sendCode, verifyCode };
