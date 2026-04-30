'use strict';

const userService = require('./user.service');

function handleError(res, err) {
  const status = err.status || 500;
  const body = { success: false, message: err.message };
  if (err.fields) body.errors = err.fields;
  return res.status(status).json(body);
}

async function listUsers(req, res) {
  try {
    const data = await userService.listUsers();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getUserById(req, res) {
  try {
    const user = await userService.getUserById(parseInt(req.params.id, 10));
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return handleError(res, err);
  }
}

async function login(req, res) {
  try {
    const user = await userService.loginUser(req.body.phone);
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return handleError(res, err);
  }
}

async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json({ success: true, message: 'User created', data: user });
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
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const user = await userService.updateUserById(id, payload);
    return res.status(200).json({ success: true, message: 'User updated', data: user });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listUsers, getUserById, login, createUser, updateUserById };
