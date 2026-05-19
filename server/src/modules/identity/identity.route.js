'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const identityController = require('./identity.controller');

const uploadDir = path.resolve(__dirname, '../../../uploads/identity');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png']);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${req.user.id}-${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();
  const allowed = allowedMimeTypes.has(mimeType) && allowedExtensions.has(ext);
  if (!allowed) {
    const err = new Error('Only jpg and png images are allowed');
    err.status = 400;
    return cb(err);
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const userRouter = express.Router();
const adminRouter = express.Router();

userRouter.get('/me', identityController.getMine);
userRouter.post('/upload', upload.single('document'), identityController.submit);

adminRouter.get('/verifications', identityController.listForAdmin);
adminRouter.get('/verifications/:id', identityController.getDetailForAdmin);
adminRouter.post('/verifications/:id/review', identityController.reviewById);
adminRouter.post('/verify/:userId', identityController.review);

module.exports = { userRouter, adminRouter };
