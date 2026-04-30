'use strict';

const { Apply, Demand } = require('../../db');
const msgSvc = require('../message/message.service');

const VALID_STATUSES = ['pending', 'accepted', 'rejected'];

async function listApplies(filter = {}) {
  const where = {};
  if (filter.demand_id        !== undefined) where.demand_id        = filter.demand_id;
  if (filter.teacher_user_id  !== undefined) where.teacher_user_id  = filter.teacher_user_id;
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
  if (!data.demand_id)       missing.push('demand_id');
  if (!data.teacher_user_id) missing.push('teacher_user_id');
  if (missing.length > 0) {
    const err = new Error('Missing required fields');
    err.status = 400;
    err.fields = missing;
    throw err;
  }

  const existing = await Apply.findOne({
    where: { demand_id: data.demand_id, teacher_user_id: data.teacher_user_id }
  });
  if (existing) {
    const err = new Error('Already applied to this demand');
    err.status = 409;
    throw err;
  }

  const apply = await Apply.create({
    demand_id:       data.demand_id,
    teacher_user_id: data.teacher_user_id,
    message:         data.message || null,
    status:          'pending'
  });

  // Notify teacher that submission was received
  const demand = await Demand.findByPk(data.demand_id);
  const demandTitle = demand ? demand.title : `需求 #${data.demand_id}`;
  msgSvc.createMessage({
    user_id:  data.teacher_user_id,
    type:     'apply_submitted',
    apply_id: apply.id,
    demand_id: data.demand_id,
    content:  `你已成功申请《${demandTitle}》，等待家长审核。`
  }).catch(() => {});

  // Notify demand owner (parent) that a new application arrived
  if (demand) {
    msgSvc.createMessage({
      user_id:  demand.user_id,
      type:     'apply_submitted',
      apply_id: apply.id,
      demand_id: data.demand_id,
      content:  `你的需求《${demandTitle}》收到了一条新申请。`
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

  // Notify teacher of the decision
  const demand = await Demand.findByPk(apply.demand_id);
  const demandTitle = demand ? demand.title : `需求 #${apply.demand_id}`;
  const msgType = status === 'accepted' ? 'apply_accepted' : 'apply_rejected';
  const msgContent = status === 'accepted'
    ? `你对《${demandTitle}》的申请已被接受，等待家长联系你。`
    : `你对《${demandTitle}》的申请未通过。`;
  msgSvc.createMessage({
    user_id:  apply.teacher_user_id,
    type:     msgType,
    apply_id: apply.id,
    demand_id: apply.demand_id,
    content:  msgContent
  }).catch(() => {});

  return apply;
}

module.exports = { listApplies, getApplyById, createApply, updateApplyStatus };
