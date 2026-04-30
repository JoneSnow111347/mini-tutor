'use strict';

const { Message } = require('../../db');

async function createMessage({ user_id, type, apply_id, demand_id, content }) {
  return Message.create({ user_id, type, apply_id: apply_id || null, demand_id: demand_id || null, content });
}

async function listMessages(user_id) {
  return Message.findAll({
    where: { user_id },
    order: [['createdAt', 'DESC']]
  });
}

async function markRead(user_id, ids) {
  const where = { user_id };
  if (ids && ids.length) where.id = ids;
  await Message.update({ is_read: true }, { where });
}

module.exports = { createMessage, listMessages, markRead };
