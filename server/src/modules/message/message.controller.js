'use strict';

const svc = require('./message.service');

async function list(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await svc.listMessages(userId);
    res.json({ data: rows });
  } catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { ids } = req.body;
    await svc.markRead(userId, ids || []);
    res.json({ success: true });
  } catch (e) { next(e); }
}

module.exports = { list, markRead };
