'use strict';

const { sequelize } = require('../db');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows[0].cnt > 0;
}

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected to database.');

  // Extend teachers table with bio and phone
  if (!await columnExists('teachers', 'bio')) {
    await sequelize.query('ALTER TABLE teachers ADD COLUMN bio TEXT NULL AFTER teaching_subjects');
    console.log('Added teachers.bio');
  } else {
    console.log('teachers.bio already exists, skipping.');
  }
  if (!await columnExists('teachers', 'phone')) {
    await sequelize.query('ALTER TABLE teachers ADD COLUMN phone VARCHAR(20) NULL AFTER bio');
    console.log('Added teachers.phone');
  } else {
    console.log('teachers.phone already exists, skipping.');
  }

  // favorites table
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      target_id BIGINT UNSIGNED NOT NULL,
      target_type ENUM('demand','teacher') NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_fav (user_id, target_id, target_type),
      INDEX idx_user_type (user_id, target_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('favorites table ready.');

  // messages table
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      type ENUM('apply_submitted','apply_accepted','apply_rejected') NOT NULL,
      apply_id BIGINT UNSIGNED NULL,
      demand_id BIGINT UNSIGNED NULL,
      content VARCHAR(512) NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_user_unread (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('messages table ready.');

  await sequelize.close();
  console.log('Migration complete.');
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
