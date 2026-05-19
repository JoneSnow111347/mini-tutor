'use strict';

const userService = require('./user.service');
const { success, failure } = require('../../utils/response');

function handleError(res, err) {
  return failure(res, err, 'User request failed');
}

async function listUsers(req, res) {
  try {
    const data = await userService.listUsers();
    return success(res, { message: 'Users loaded', data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getUserById(req, res) {
  try {
    const user = await userService.getUserById(parseInt(req.params.id, 10));
    return success(res, { message: 'User loaded', data: user });
  } catch (err) {
    return handleError(res, err);
  }
}

async function login(req, res) {
  try {
    const user = await userService.loginUser(req.body.phone, req.body.password);
    return success(res, { message: 'Login successful', data: user });
  } catch (err) {
    return handleError(res, err);
  }
}

async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.body);
    return success(res, { status: 201, message: 'User created', data: user });
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateUserById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const updatable = ['phone', 'role', 'nickname', 'avatar_url', 'status'];
    const payload = {};
    updatable.forEach((f) => {
      if (req.body[f] !== undefined) {
        payload[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
      }
    });

    if (Object.keys(payload).length === 0) {
      return failure(res, { status: 400, message: 'No updatable fields provided' });
    }

    const user = await userService.updateUserById(id, payload);
    return success(res, { message: 'User updated', data: user });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listUsers, getUserById, login, createUser, updateUserById };
