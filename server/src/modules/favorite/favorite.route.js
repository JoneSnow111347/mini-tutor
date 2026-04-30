'use strict';

const router = require('express').Router();
const ctrl = require('./favorite.controller');

router.get('/', ctrl.list);
router.post('/', ctrl.add);
router.delete('/', ctrl.remove);

module.exports = router;
