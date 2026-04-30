const { Sequelize } = require('sequelize');

// 使用你的 MySQL 用户 root，密码 123456
const sequelize = new Sequelize('tutor_miniapp', 'root', '123456', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false // 关闭 SQL 输出
});

async function cleanDB() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // 清理所有表数据（保留表结构）
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