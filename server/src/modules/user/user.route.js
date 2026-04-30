'use strict';

const express = require('express');
const userController = require('./user.controller');

const router = express.Router();

router.get('/',        userController.listUsers);
router.get('/:id',    userController.getUserById);
router.post('/',      userController.createUser);
router.post('/login', userController.login);
router.put('/:id',    userController.updateUserById);

module.exports = router;
