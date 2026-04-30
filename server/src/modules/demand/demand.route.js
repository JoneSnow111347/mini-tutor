'use strict';

const express = require('express');
const demandController = require('./demand.controller');

const router = express.Router();

router.get('/', demandController.listDemands);
router.get('/:id', demandController.getDemandById);
router.post('/', demandController.createDemand);
router.put('/:id', demandController.updateDemandById);

module.exports = router;
