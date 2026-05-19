'use strict';

require('../load-env')();

const { sequelize } = require('../db');

async function cleanDB() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    await sequelize.query('DELETE FROM applies;');
    await sequelize.query('DELETE FROM demands;');
    await sequelize.query('DELETE FROM teachers;');
    await sequelize.query('DELETE FROM users;');

    console.log('Database cleaned successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning database:', err);
    process.exit(1);
  }
}

cleanDB();
