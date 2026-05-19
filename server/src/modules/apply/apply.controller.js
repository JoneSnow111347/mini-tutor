'use strict';

const applyService = require('./apply.service');
const { success, failure } = require('../../utils/response');

function handleError(res, err) {
  return failure(res, err, 'Application request failed');
}

async function listApplies(req, res) {
  try {
    const filter = {};
    if (req.query.demand_id !== undefined) filter.demand_id = parseInt(req.query.demand_id, 10);
    if (req.query.teacher_user_id !== undefined) {
      filter.teacher_user_id = parseInt(req.query.teacher_user_id, 10);
    }
    const data = await applyService.listApplies(filter);
    return success(res, { message: 'Applications loaded', data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getApplyById(req, res) {
  try {
    const apply = await applyService.getApplyById(parseInt(req.params.id, 10));
    return success(res, { message: 'Application loaded', data: apply });
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
    return success(res, { status: 201, message: 'Application submitted', data: apply });
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateApplyStatus(req, res) {
  try {
    const id     = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!status) {
      return failure(res, { status: 400, message: 'status is required' });
    }

    const apply = await applyService.updateApplyStatus(id, status);
    return success(res, { message: 'Application status updated', data: apply });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listApplies, getApplyById, createApply, updateApplyStatus };
