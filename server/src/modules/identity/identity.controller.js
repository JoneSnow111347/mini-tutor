'use strict';

const identityService = require('./identity.service');
const { success, failure } = require('../../utils/response');

function handleError(res, err) {
  return failure(res, err, 'Identity verification request failed');
}

async function getMine(req, res) {
  try {
    const data = await identityService.getMyVerification(req.user.id);
    return success(res, {
      message: data ? 'Identity verification loaded' : 'No identity verification found',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function submit(req, res) {
  try {
    const data = await identityService.submitVerification(
      req.user.id,
      req.body.document_type,
      req.file
    );
    return success(res, {
      status: 201,
      message: 'Identity verification submitted',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function review(req, res) {
  try {
    const data = await identityService.reviewVerification(
      Number(req.params.userId),
      req.body.status,
      req.body.review_note,
      (req.admin && req.admin.username) || req.headers['x-admin-name'] || 'admin'
    );
    return success(res, {
      message: 'Identity verification updated',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function listForAdmin(req, res) {
  try {
    const data = await identityService.listVerifications({
      status: req.query.status,
    });
    return success(res, {
      message: 'Identity verifications loaded',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getDetailForAdmin(req, res) {
  try {
    const data = await identityService.getVerificationDetail(Number(req.params.id));
    return success(res, {
      message: 'Identity verification detail loaded',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function reviewById(req, res) {
  try {
    const data = await identityService.reviewVerificationById(
      Number(req.params.id),
      req.body.status,
      req.body.review_note,
      (req.admin && req.admin.username) || req.headers['x-admin-name'] || 'admin'
    );
    return success(res, {
      message: 'Identity verification updated',
      data,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { getMine, submit, review, listForAdmin, getDetailForAdmin, reviewById };
