'use strict';

const { Apply, Demand } = require('../../db');
const msgSvc = require('../message/message.service');

const VALID_STATUSES = ['pending', 'accepted', 'rejected'];

async function listApplies(filter = {}) {
  const where = {};
  if (filter.demand_id !== undefined) where.demand_id = filter.demand_id;
  if (filter.teacher_user_id !== undefined) where.teacher_user_id = filter.teacher_user_id;
  return Apply.findAll({ where });
}

async function getApplyById(id) {
  const apply = await Apply.findByPk(id);
  if (!apply) {
    const err = new Error('Application not found');
    err.status = 404;
    throw err;
  }
  return apply;
}

async function createApply(data) {
  const missing = [];
  if (!data.demand_id) missing.push('demand_id');
  if (!data.teacher_user_id) missing.push('teacher_user_id');
  if (missing.length > 0) {
    const err = new Error('Missing required fields');
    err.status = 400;
    err.fields = missing;
    throw err;
  }

  const existing = await Apply.findOne({
    where: { demand_id: data.demand_id, teacher_user_id: data.teacher_user_id },
  });
  if (existing) {
    const err = new Error('Already applied to this demand');
    err.status = 409;
    throw err;
  }

  const demand = await Demand.findByPk(data.demand_id);
  if (!demand) {
    const err = new Error('Demand not found');
    err.status = 404;
    throw err;
  }

  if (demand.status !== 'open') {
    const err = new Error('This demand is no longer open');
    err.status = 409;
    throw err;
  }

  const apply = await Apply.create({
    demand_id: data.demand_id,
    teacher_user_id: data.teacher_user_id,
    message: data.message || null,
    status: 'pending',
  });

  const demandTitle = demand.title || `Demand #${data.demand_id}`;
  msgSvc.createMessage({
    user_id: data.teacher_user_id,
    type: 'apply_submitted',
    apply_id: apply.id,
    demand_id: data.demand_id,
    content: `Your application for "${demandTitle}" has been submitted and is awaiting review.`,
  }).catch(() => {});

  if (demand.user_id) {
    msgSvc.createMessage({
      user_id: demand.user_id,
      type: 'apply_submitted',
      apply_id: apply.id,
      demand_id: data.demand_id,
      content: `Your demand "${demandTitle}" received a new teacher application.`,
    }).catch(() => {});
  }

  return apply;
}

async function updateApplyStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const apply = await Apply.findByPk(id);
  if (!apply) {
    const err = new Error('Application not found');
    err.status = 404;
    throw err;
  }

  apply.status = status;
  await apply.save();

  const demand = await Demand.findByPk(apply.demand_id);
  const demandTitle = demand ? (demand.title || `Demand #${apply.demand_id}`) : `Demand #${apply.demand_id}`;
  const msgType = status === 'accepted' ? 'apply_accepted' : 'apply_rejected';
  const msgContent = status === 'accepted'
    ? `Your application for "${demandTitle}" has been accepted.`
    : `Your application for "${demandTitle}" was not accepted.`;

  msgSvc.createMessage({
    user_id: apply.teacher_user_id,
    type: msgType,
    apply_id: apply.id,
    demand_id: apply.demand_id,
    content: msgContent,
  }).catch(() => {});

  return apply;
}

module.exports = { listApplies, getApplyById, createApply, updateApplyStatus };
