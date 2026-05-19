const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const routes = require('./routes');
const { success } = require('./utils/response');

const app = express();
const uploadRoot = path.resolve(__dirname, '../uploads');
const adminRoot = path.resolve(__dirname, '../public/admin');

fs.mkdirSync(path.join(uploadRoot, 'identity'), { recursive: true });
fs.mkdirSync(adminRoot, { recursive: true });

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadRoot));
app.use('/admin', express.static(adminRoot));

app.get('/health', (req, res) => {
  success(res, {
    message: 'Server is running',
    data: { uptime: process.uptime() },
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(adminRoot, 'index.html'));
});

app.use('/api', routes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'File size must be smaller than 5MB',
      });
    }
    return res.status(400).json({
      success: false,
      data: null,
      message: err.message || 'File upload failed',
    });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Invalid JSON body',
    });
  }

  if (err) {
    return res.status(err.status || 500).json({
      success: false,
      data: null,
      message: err.message || 'Internal server error',
    });
  }

  return next();
});

module.exports = app;
