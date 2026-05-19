require('./load-env')();

const app = require('./app');
const { sequelize, formatDatabaseStartupError } = require('./db');
const adminService = require('./modules/admin/admin.service');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    await sequelize.sync({ alter: true });
    console.log('Database synced');

    await adminService.ensureDefaultAdmin();
    console.log('Default admin ensured');

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    const hints = formatDatabaseStartupError(error);
    if (hints) {
      for (const line of hints) {
        console.error(line);
      }
    }
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

start();
