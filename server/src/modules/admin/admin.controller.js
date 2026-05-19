'use strict';

const adminService = require('./admin.service');
const { success, failure } = require('../../utils/response');

function handleError(res, err) {
  return failure(res, err, 'Admin request failed');
}

async function login(req, res) {
  try {
    const data = await adminService.login(req.body.username, req.body.password);
    return success(res, {
      message: 'Admin login successful',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function profile(req, res) {
  try {
    const data = await adminService.getAdminProfile(req.admin.id);
    return success(res, {
      message: 'Admin profile loaded',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  login,
  profile,
};
