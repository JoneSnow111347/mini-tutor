'use strict';

const svc = require('./favorite.service');
const { success } = require('../../utils/response');

async function list(req, res, next) {
  try {
    const userId = req.user.id;
    const { type: target_type } = req.query;
    const rows = await svc.listFavorites(userId, target_type);
    success(res, { message: 'Favorites loaded', data: rows });
  } catch (e) { next(e); }
}

async function add(req, res, next) {
  try {
    const userId = req.user.id;
    const { target_id, target_type } = req.body;
    const fav = await svc.addFavorite(userId, Number(target_id), target_type);
    success(res, { status: 201, message: 'Favorite saved', data: fav });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const userId = req.user.id;
    const { target_id, target_type } = req.body;
    await svc.removeFavorite(userId, Number(target_id), target_type);
    success(res, { message: 'Favorite removed' });
  } catch (e) { next(e); }
}

module.exports = { list, add, remove };
