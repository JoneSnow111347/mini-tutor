'use strict';

const { Demand } = require('../../db');

const REQUIRED_FIELDS = [
  'title', 'subject', 'grade_level', 'area',
  'class_mode', 'description', 'contact_name', 'contact_phone'
];

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

  return Demand.create({
    user_id: data.user_id || null,
    title: String(data.title).trim(),
    subject: String(data.subject).trim(),
    grade_level: String(data.grade_level).trim(),
    area: String(data.area).trim(),
    class_mode: String(data.class_mode).trim(),
    description: String(data.description).trim(),
    contact_name: String(data.contact_name).trim(),
    contact_phone: String(data.contact_phone).trim(),
    status: 'open'
  });
}

async function updateDemandById(id, data) {
  const demand = await Demand.findByPk(id);
  if (!demand) {
    const err = new Error('Demand not found');
    err.status = 404;
    throw err;
  }

  const allowed = [
    'title', 'subject', 'grade_level', 'area',
    'class_mode', 'description', 'contact_name', 'contact_phone', 'status'
  ];
  allowed.forEach((key) => {
    if (data[key] !== undefined) demand[key] = data[key];
  });

  return demand.save();
}

module.exports = { listDemands, getDemandById, createDemand, updateDemandById };
