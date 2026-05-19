'use strict';

const svc = require('./message.service');
const { success } = require('../../utils/response');

async function list(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await svc.listMessages(userId);
    success(res, { message: 'Messages loaded', data: rows });
  } catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { ids } = req.body;
    await svc.markRead(userId, ids || []);
    success(res, { message: 'Messages marked as read' });
  } catch (e) { next(e); }
}

module.exports = { list, markRead };
