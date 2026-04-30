'use strict';

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  'tutor_miniapp',
  'root',
  '123456', // ← 这里改
  {
    host: '127.0.0.1',
    port: 3306,
    dialect: 'mysql',
    logging: false
  }
);
const User = sequelize.define('User', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  role: { type: DataTypes.ENUM('parent', 'teacher', 'both'), allowNull: false },
  nickname: { type: DataTypes.STRING(64), defaultValue: null },
  avatar_url: { type: DataTypes.STRING(512), defaultValue: null },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' }
}, { tableName: 'users', timestamps: true });

const Teacher = sequelize.define('Teacher', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  real_name: { type: DataTypes.STRING(64), allowNull: false },
  teaching_subjects: { type: DataTypes.STRING(256), allowNull: false },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  is_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  bio: { type: DataTypes.TEXT, defaultValue: null },
  phone: { type: DataTypes.STRING(20), defaultValue: null }
}, { tableName: 'teachers', timestamps: true });

const Demand = sequelize.define('Demand', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: null },
  title: { type: DataTypes.STRING(128), allowNull: false },
  subject: { type: DataTypes.STRING(64), allowNull: false },
  grade_level: { type: DataTypes.STRING(64), allowNull: false },
  area: { type: DataTypes.STRING(128), allowNull: false },
  class_mode: { type: DataTypes.STRING(64), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  contact_name: { type: DataTypes.STRING(64), allowNull: false },
  contact_phone: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' }
}, { tableName: 'demands', timestamps: true });

const Apply = sequelize.define('Apply', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  demand_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  teacher_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  message: { type: DataTypes.TEXT, defaultValue: null },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  }
}, { tableName: 'applies', timestamps: true });

const Favorite = sequelize.define('Favorite', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  target_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  target_type: { type: DataTypes.ENUM('demand', 'teacher'), allowNull: false }
}, { tableName: 'favorites', timestamps: true });

const Message = sequelize.define('Message', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  type: {
    type: DataTypes.ENUM('apply_submitted', 'apply_accepted', 'apply_rejected'),
    allowNull: false
  },
  apply_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: null },
  demand_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: null },
  content: { type: DataTypes.STRING(512), allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'messages', timestamps: true });

// Associations
User.hasOne(Teacher, { foreignKey: 'user_id' });
Teacher.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Demand, { foreignKey: 'user_id' });
Demand.belongsTo(User, { foreignKey: 'user_id' });

Demand.hasMany(Apply, { foreignKey: 'demand_id' });
Apply.belongsTo(Demand, { foreignKey: 'demand_id' });

module.exports = { sequelize, User, Teacher, Demand, Apply, Favorite, Message };
