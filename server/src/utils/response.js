'use strict';

function success(res, { status = 200, message = 'OK', data = null } = {}) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

function failure(res, err, fallbackMessage) {
  const status = err.status || 500;
  const body = {
    success: false,
    data: null,
    message: err.message || fallbackMessage || 'Internal server error',
  };

  if (err.fields) {
    body.errors = err.fields;
  }

  return res.status(status).json(body);
}

module.exports = {
  success,
  failure,
};
