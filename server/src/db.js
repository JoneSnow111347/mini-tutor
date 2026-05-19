'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const loadEnv = require('./load-env');

loadEnv();

function getDbConfig() {
  const port = Number(process.env.DB_PORT || 3306);

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number.isFinite(port) ? port : 3306,
    database: process.env.DB_NAME || 'tutor_miniapp',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
  };
}

const dbConfig = getDbConfig();

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

function formatDatabaseStartupError(error) {
  const original = error?.original || error?.parent || error;
  const code = original?.code || error?.name;
  const address = original?.address || dbConfig.host;
  const port = original?.port || dbConfig.port;

  if (code === 'ECONNREFUSED' || error?.name === 'SequelizeConnectionRefusedError') {
    return [
      `Database connection refused at ${address}:${port}.`,
      'MySQL is likely not running, or the configured port is wrong.',
      `Check server/.env: DB_HOST=${dbConfig.host}, DB_PORT=${dbConfig.port}.`,
      'If MySQL is installed as a Windows service, start it and retry `npm start`.',
    ];
  }

  if (code === 'ER_ACCESS_DENIED_ERROR' || error?.name === 'SequelizeAccessDeniedError') {
    return [
      `MySQL rejected the credentials for user "${dbConfig.username}".`,
      `Check server/.env: DB_USER=${dbConfig.username} and DB_PASSWORD.`,
      'If the password is correct, verify that this MySQL user is allowed to connect from the configured host.',
    ];
  }

  if (code === 'ER_BAD_DB_ERROR' || error?.name === 'SequelizeDatabaseError') {
    const message = String(original?.message || error?.message || '');
    if (message.includes('Unknown database')) {
      return [
        `Database "${dbConfig.database}" does not exist.`,
        'Create it first, then retry `npm start`.',
        `Expected database from server/.env: DB_NAME=${dbConfig.database}.`,
      ];
    }
  }

  if (code === 'ETIMEDOUT' || error?.name === 'SequelizeConnectionTimedOutError') {
    return [
      `Timed out while connecting to MySQL at ${address}:${port}.`,
      'Check DB_HOST, DB_PORT, firewall settings, and whether MySQL is reachable on that address.',
    ];
  }

  return null;
}

const User = sequelize.define('User', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  role: { type: DataTypes.ENUM('parent', 'teacher', 'both'), allowNull: false },
  nickname: { type: DataTypes.STRING(64), defaultValue: null },
  avatar_url: { type: DataTypes.STRING(512), defaultValue: null },
  password_hash: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
  sms_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  sms_verified_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  identity_status: {
    type: DataTypes.ENUM('unverified', 'pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'unverified',
  },
  identity_verified_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, { tableName: 'users', timestamps: true });

const Admin = sequelize.define('Admin', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
  last_login_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, { tableName: 'admins', timestamps: true });

const Teacher = sequelize.define('Teacher', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  real_name: { type: DataTypes.STRING(64), allowNull: false },
  teaching_subjects: { type: DataTypes.STRING(256), allowNull: false },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
  is_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  bio: { type: DataTypes.TEXT, defaultValue: null },
  phone: { type: DataTypes.STRING(20), defaultValue: null },
}, { tableName: 'teachers', timestamps: true });

const Demand = sequelize.define('Demand', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: null },
  title: { type: DataTypes.STRING(128), allowNull: false },
  subject: { type: DataTypes.STRING(64), allowNull: false },
  grade_level: { type: DataTypes.STRING(64), allowNull: false },
  area: { type: DataTypes.STRING(128), allowNull: false },
  address: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, defaultValue: null },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, defaultValue: null },
  class_mode: { type: DataTypes.STRING(64), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  contact_name: { type: DataTypes.STRING(64), allowNull: false },
  contact_phone: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
}, { tableName: 'demands', timestamps: true });

const Apply = sequelize.define('Apply', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  demand_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  teacher_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  message: { type: DataTypes.TEXT, defaultValue: null },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, { tableName: 'applies', timestamps: true });

const Favorite = sequelize.define('Favorite', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  target_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  target_type: { type: DataTypes.ENUM('demand', 'teacher'), allowNull: false },
}, { tableName: 'favorites', timestamps: true });

const Message = sequelize.define('Message', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  type: {
    type: DataTypes.ENUM('apply_submitted', 'apply_accepted', 'apply_rejected'),
    allowNull: false,
  },
  apply_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: null },
  demand_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: null },
  content: { type: DataTypes.STRING(512), allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'messages', timestamps: true });

const IdentityVerification = sequelize.define('IdentityVerification', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  document_type: {
    type: DataTypes.ENUM('student_id', 'admission_notice'),
    allowNull: false,
  },
  file_name: { type: DataTypes.STRING(255), allowNull: false },
  file_path: { type: DataTypes.STRING(512), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
  review_note: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  reviewed_by: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
  reviewed_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, { tableName: 'identity_verifications', timestamps: true });

User.hasOne(Teacher, { foreignKey: 'user_id' });
Teacher.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Demand, { foreignKey: 'user_id' });
Demand.belongsTo(User, { foreignKey: 'user_id' });

Demand.hasMany(Apply, { foreignKey: 'demand_id' });
Apply.belongsTo(Demand, { foreignKey: 'demand_id' });

User.hasMany(IdentityVerification, { foreignKey: 'user_id' });
IdentityVerification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  dbConfig,
  formatDatabaseStartupError,
  Admin,
  User,
  Teacher,
  Demand,
  Apply,
  Favorite,
  Message,
  IdentityVerification,
};
