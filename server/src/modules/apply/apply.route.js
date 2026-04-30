'use strict';

const express = require('express');
const applyController = require('./apply.controller');

const router = express.Router();

router.get('/',     applyController.listApplies);
router.get('/:id',  applyController.getApplyById);
router.post('/',    applyController.createApply);
router.put('/:id',  applyController.updateApplyStatus);

module.exports = router;
