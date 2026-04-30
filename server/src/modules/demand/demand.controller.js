'use strict';

const demandService = require('./demand.service');

function handleError(res, err) {
  const status = err.status || 500;
  const body = { success: false, message: err.message };
  if (err.fields) body.errors = err.fields;
  return res.status(status).json(body);
}

async function listDemands(req, res) {
  try {
    const data = await demandService.listDemands();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getDemandById(req, res) {
  try {
    const demand = await demandService.getDemandById(parseInt(req.params.id, 10));
    return res.status(200).json({ success: true, data: demand });
  } catch (err) {
    return handleError(res, err);
  }
}

async function createDemand(req, res) {
  try {
    const demand = await demandService.createDemand(req.body);
    return res.status(201).json({ success: true, message: 'Demand created', data: demand });
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateDemandById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const updatable = [
      'title', 'subject', 'grade_level', 'area',
      'class_mode', 'description', 'contact_name', 'contact_phone', 'status'
    ];
    const payload = {};
    updatable.forEach((f) => {
      if (req.body[f] !== undefined) {
        payload[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
      }
    });

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const demand = await demandService.updateDemandById(id, payload);
    return res.status(200).json({ success: true, message: 'Demand updated', data: demand });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listDemands, getDemandById, createDemand, updateDemandById };
