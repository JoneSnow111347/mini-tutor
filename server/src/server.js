'use strict';

require('./load-env')();

const app = require('./app');
const { sequelize, formatDatabaseStartupError } = require('./db');

const APP_PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    await sequelize.sync({ alter: true });
    console.log('DB synced');

    app.listen(APP_PORT, () => {
      console.log(`Server listening on http://localhost:${APP_PORT}`);
    });
  } catch (err) {
    const hints = formatDatabaseStartupError(err);
    if (hints) {
      for (const line of hints) {
        console.error(line);
      }
    }
    console.error('DB connection failed:', err.message);
    process.exit(1);
  }
}

start();

module.exports = { app, sequelize };
