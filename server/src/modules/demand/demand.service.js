'use strict';

const { Demand } = require('../../db');

const REQUIRED_FIELDS = [
  'title', 'subject', 'grade_level', 'area',
  'class_mode', 'description', 'contact_name', 'contact_phone'
];

function normalizeOptionalCoordinate(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    const err = new Error(`${fieldName} must be a valid number`);
    err.status = 400;
    throw err;
  }

  return numeric;
}

async function listDemands() {
  return Demand.findAll();
}

async function getDemandById(id) {
  const demand = await Demand.findByPk(id);
  if (!demand) {
    const err = new Error('Demand not found');
    err.status = 404;
    throw err;
  }
  return demand;
}

async function createDemand(data) {
  const missing = REQUIRED_FIELDS.filter(
    (f) => !data[f] || String(data[f]).trim() === ''
  );
  if (missing.length > 0) {
    const err = new Error('Missing required fields');
    err.status = 400;
    err.fields = missing;
    throw err;
  }

  const userId = Number(data.user_id);
  if (!Number.isInteger(userId) || userId <= 0) {
    const err = new Error('Authenticated user id is required');
    err.status = 401;
    throw err;
  }

  const payload = {
    user_id: userId,
    title: String(data.title).trim(),
    subject: String(data.subject).trim(),
    grade_level: String(data.grade_level).trim(),
    area: String(data.area).trim(),
    address: data.address ? String(data.address).trim() : null,
    latitude: normalizeOptionalCoordinate(data.latitude, 'latitude'),
    longitude: normalizeOptionalCoordinate(data.longitude, 'longitude'),
    class_mode: String(data.class_mode).trim(),
    description: String(data.description).trim(),
    contact_name: String(data.contact_name).trim(),
    contact_phone: String(data.contact_phone).trim(),
    status: 'open'
  };
  return Demand.create(payload);
}

async function updateDemandById(id, data, currentUserId) {
  const demand = await Demand.findByPk(id);
  if (!demand) {
    const err = new Error('Demand not found');
    err.status = 404;
    throw err;
  }

  if (currentUserId && Number(demand.user_id) !== Number(currentUserId)) {
    const err = new Error('You can only edit your own demand');
    err.status = 403;
    throw err;
  }

  const allowed = [
    'title', 'subject', 'grade_level', 'area', 'address',
    'class_mode', 'description', 'contact_name', 'contact_phone', 'status'
  ];
  allowed.forEach((key) => {
    if (data[key] !== undefined) demand[key] = data[key];
  });

  if (data.latitude !== undefined) {
    demand.latitude = normalizeOptionalCoordinate(data.latitude, 'latitude');
  }
  if (data.longitude !== undefined) {
    demand.longitude = normalizeOptionalCoordinate(data.longitude, 'longitude');
  }

  return demand.save();
}

module.exports = { listDemands, getDemandById, createDemand, updateDemandById };
