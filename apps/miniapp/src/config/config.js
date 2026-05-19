const API_TARGETS = {
  local: 'http://127.0.0.1:3000/api',
  remote: 'http://124.222.137.31:3000/api',
}

// DevTools local testing:
// - use 'local' to hit the backend on the same PC at http://127.0.0.1:3000/api
// - use 'remote' to hit the deployed backend
const ACTIVE_TARGET = 'remote'
const TIMEOUT = 10000

function getBaseUrl() {
  return API_TARGETS[ACTIVE_TARGET] || API_TARGETS.remote
}

function getUploadBaseUrl() {
  return getBaseUrl().replace(/\/api$/, '')
}

module.exports = {
  API_TARGETS,
  ACTIVE_TARGET,
  BASE_URL: getBaseUrl(),
  UPLOAD_BASE_URL: getUploadBaseUrl(),
  TIMEOUT,
  getBaseUrl,
  getUploadBaseUrl,
}
