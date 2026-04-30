'use strict';

const applyService = require('./apply.service');

function handleError(res, err) {
  const status = err.status || 500;
  const body = { success: false, message: err.message };
  if (err.fields) body.errors = err.fields;
  return res.status(status).json(body);
}

async function listApplies(req, res) {
  try {
    const filter = {};
    if (req.query.demand_id !== undefined) filter.demand_id = parseInt(req.query.demand_id, 10);
    const data = await applyService.listApplies(filter);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getApplyById(req, res) {
  try {
    const apply = await applyService.getApplyById(parseInt(req.params.id, 10));
    return res.status(200).json({ success: true, data: apply });
  } catch (err) {
    return handleError(res, err);
  }
}

async function createApply(req, res) {
  try {
    const { demand_id, message } = req.body;
    const apply = await applyService.createApply({
      demand_id,
      teacher_user_id: req.user.id,
      message,
    });
    return res.status(201).json({ success: true, message: 'Application submitted', data: apply });
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateApplyStatus(req, res) {
  try {
    const id     = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    const apply = await applyService.updateApplyStatus(id, status);
    return res.status(200).json({ success: true, message: 'Application status updated', data: apply });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listApplies, getApplyById, createApply, updateApplyStatus };
