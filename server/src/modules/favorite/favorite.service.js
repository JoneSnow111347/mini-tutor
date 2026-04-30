'use strict';

const { Favorite } = require('../../db');

async function listFavorites(user_id, target_type) {
  const where = { user_id };
  if (target_type) where.target_type = target_type;
  return Favorite.findAll({ where });
}

async function addFavorite(user_id, target_id, target_type) {
  if (!user_id || !target_id || !target_type) {
    const err = new Error('Missing required fields');
    err.status = 400;
    throw err;
  }
  const [fav] = await Favorite.findOrCreate({
    where: { user_id, target_id, target_type }
  });
  return fav;
}

async function removeFavorite(user_id, target_id, target_type) {
  const deleted = await Favorite.destroy({
    where: { user_id, target_id, target_type }
  });
  if (!deleted) {
    const err = new Error('Favorite not found');
    err.status = 404;
    throw err;
  }
}

module.exports = { listFavorites, addFavorite, removeFavorite };
