'use strict';

const demandService = require('./demand.service');
const { success, failure } = require('../../utils/response');

function handleError(res, err) {
  return failure(res, err, 'Demand request failed');
}

function getAuthenticatedUserId(req) {
  const rawUserId = req.user && (req.user.id ?? req.user.userId);
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    const err = new Error('Unauthorized: missing authenticated user id');
    err.status = 401;
    throw err;
  }

  return userId;
}

async function listDemands(req, res) {
  try {
    const data = await demandService.listDemands();
    return success(res, { message: 'Demands loaded', data });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getDemandById(req, res) {
  try {
    const demand = await demandService.getDemandById(parseInt(req.params.id, 10));
    return success(res, { message: 'Demand loaded', data: demand });
  } catch (err) {
    return handleError(res, err);
  }
}

async function createDemand(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const demand = await demandService.createDemand({
      ...req.body,
      user_id: userId,
    });
    return success(res, { status: 201, message: 'Demand created', data: demand });
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateDemandById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const updatable = [
      'title', 'subject', 'grade_level', 'area', 'address', 'latitude', 'longitude',
      'class_mode', 'description', 'contact_name', 'contact_phone', 'status'
    ];
    const payload = {};
    updatable.forEach((f) => {
      if (req.body[f] !== undefined) {
        payload[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
      }
    });

    if (Object.keys(payload).length === 0) {
      return failure(res, { status: 400, message: 'No updatable fields provided' });
    }

    const demand = await demandService.updateDemandById(id, payload, req.user.id);
    return success(res, { message: 'Demand updated', data: demand });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listDemands, getDemandById, createDemand, updateDemandById };
