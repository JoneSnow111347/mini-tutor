'use strict';

const express = require('express');
const adminController = require('./admin.controller');

const publicRouter = express.Router();
const protectedRouter = express.Router();

publicRouter.post('/login', adminController.login);
protectedRouter.get('/profile', adminController.profile);

module.exports = {
  publicRouter,
  protectedRouter,
};
