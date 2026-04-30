'use strict';

const svc = require('./favorite.service');

async function list(req, res, next) {
  try {
    const userId = req.user.id;
    const { type: target_type } = req.query;
    const rows = await svc.listFavorites(userId, target_type);
    res.json({ data: rows });
  } catch (e) { next(e); }
}

async function add(req, res, next) {
  try {
    const userId = req.user.id;
    const { target_id, target_type } = req.body;
    const fav = await svc.addFavorite(userId, Number(target_id), target_type);
    res.status(201).json({ data: fav });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const userId = req.user.id;
    const { target_id, target_type } = req.body;
    await svc.removeFavorite(userId, Number(target_id), target_type);
    res.json({ success: true });
  } catch (e) { next(e); }
}

module.exports = { list, add, remove };
