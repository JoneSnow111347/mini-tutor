const config = require('../src/config/config.js')

function getToken() {
  const userInfo = wx.getStorageSync('userInfo')
  return (userInfo && userInfo.token) || null
}

let authRedirecting = false

function getBaseUrl() {
  return config.getBaseUrl()
}

function getUploadBaseUrl() {
  return config.getUploadBaseUrl()
}

function stopCurrentPagePolling() {
  if (typeof getCurrentPages !== 'function') return
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  if (!page) return
  if (typeof page.stopPolling === 'function') page.stopPolling()
  if (typeof page._stopPolling === 'function') page._stopPolling()
  if (page._pollTimer) {
    clearInterval(page._pollTimer)
    page._pollTimer = null
  }
}

function handleUnauthorized() {
  if (authRedirecting) return
  authRedirecting = true
  stopCurrentPagePolling()
  wx.showToast({ title: '登录已失效，请重新登录', icon: 'none', duration: 2000 })
  setTimeout(() => {
    const app = typeof getApp === 'function' ? getApp() : null
    if (app && typeof app.logout === 'function') {
      app.logout()
    } else {
      wx.clearStorageSync()
      wx.reLaunch({ url: '/pages/login/login' })
    }
    setTimeout(() => { authRedirecting = false }, 800)
  }, 200)
}

function buildUrl(url, params) {
  let fullUrl = `${getBaseUrl()}${url}`
  const pairs = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (pairs.length > 0) {
    const query = pairs
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    fullUrl += `?${query}`
  }
  return fullUrl
}

function normalizeErrorMessage(error, fallback) {
  return (error && error.message) || fallback || '请求失败，请重试'
}

function request({ url, method = 'GET', data, params = {}, silent = false, headers = {} }) {
  const fullUrl = buildUrl(url, method === 'GET' ? params : {})
  const token = getToken()
  const header = { 'Content-Type': 'application/json', ...headers }
  if (token) header.Authorization = `Bearer ${token}`

  if (!silent) {
    wx.showLoading({ title: '加载中', mask: true })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      timeout: config.TIMEOUT,
      data: method === 'GET' ? undefined : data,
      header,
      success(res) {
        if (!silent) wx.hideLoading()

        const body = res.data || {}
        if (res.statusCode === 401) {
          handleUnauthorized()
          reject({ statusCode: 401, message: '登录已失效，请重新登录', data: body })
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && body.success !== false) {
          resolve({
            success: true,
            message: body.message || '请求成功',
            data: body.data,
          })
          return
        }

        const message = body.message || `请求失败 ${res.statusCode}`
        if (!silent) {
          wx.showToast({ title: message, icon: 'none', duration: 2500 })
        }
        reject({
          statusCode: res.statusCode,
          success: false,
          data: body.data,
          message,
          errors: body.errors,
        })
      },
      fail(err) {
        if (!silent) wx.hideLoading()
        const message = '网络错误，请检查服务地址或稍后重试'
        if (!silent) {
          wx.showToast({ title: message, icon: 'none', duration: 2500 })
        }
        reject({
          success: false,
          message,
          detail: err,
          url: fullUrl,
        })
      },
    })
  })
}

function uploadIdentityVerification({ filePath, documentType }) {
  const token = getToken()
  const header = {}
  if (token) {
    header.Authorization = `Bearer ${token}`
  }

  wx.showLoading({ title: '上传中', mask: true })

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getBaseUrl()}/identity/upload`,
      filePath,
      name: 'document',
      formData: { document_type: documentType },
      header,
      success(res) {
        wx.hideLoading()

        let body = res.data
        try {
          body = typeof body === 'string' ? JSON.parse(body) : body
        } catch (error) {
          reject({ success: false, message: '上传响应解析失败' })
          return
        }

        if (res.statusCode === 401) {
          handleUnauthorized()
          reject({ success: false, statusCode: 401, message: '登录已失效，请重新登录', data: body })
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && body.success !== false) {
          resolve({
            success: true,
            message: body.message || '上传成功',
            data: body.data,
          })
          return
        }

        const message = (body && body.message) || `上传失败 ${res.statusCode}`
        wx.showToast({ title: message, icon: 'none', duration: 2500 })
        reject({
          success: false,
          statusCode: res.statusCode,
          data: body && body.data,
          message,
          errors: body && body.errors,
        })
      },
      fail(err) {
        wx.hideLoading()
        const message = '上传失败，请检查网络后重试'
        wx.showToast({ title: message, icon: 'none', duration: 2500 })
        reject({ success: false, message, detail: err })
      },
    })
  })
}

const api = {
  register: (data) => request({ url: '/users', method: 'POST', data }),
  createUser: (data) => request({ url: '/users', method: 'POST', data }),
  login: (phone, password) => request({ url: '/users/login', method: 'POST', data: { phone, password } }),
  getUser: (id) => request({ url: `/users/${id}` }),
  updateUser: (id, data) => request({ url: `/users/${id}`, method: 'PUT', data }),
  sendSmsCode: (phone) => request({ url: '/sms/send', method: 'POST', data: { phone } }),
  verifySmsCode: (phone, code) => request({ url: '/sms/verify', method: 'POST', data: { phone, code } }),

  createTeacher: (data) => request({ url: '/teachers', method: 'POST', data }),
  listTeachers: (silent = false) => request({ url: '/teachers', silent }),
  getTeacher: (id) => request({ url: `/teachers/${id}` }),
  updateTeacher: (id, data) => request({ url: `/teachers/${id}`, method: 'PUT', data }),

  createDemand: (data) => request({ url: '/demands', method: 'POST', data }),
  listDemands: (silent = false) => request({ url: '/demands', silent }),
  getDemand: (id) => request({ url: `/demands/${id}` }),
  updateDemand: (id, data) => request({ url: `/demands/${id}`, method: 'PUT', data }),
  closeDemand: (id) => request({ url: `/demands/${id}`, method: 'PUT', data: { status: 'closed' } }),

  createApply: (data) => request({ url: '/applies', method: 'POST', data }),
  listApplies: (params, silent = false) => request({ url: '/applies', params, silent }),
  getApply: (id) => request({ url: `/applies/${id}` }),
  updateApply: (id, status) => request({ url: `/applies/${id}`, method: 'PUT', data: { status } }),

  getFavorites: (params, silent = false) => request({ url: '/favorites', params, silent }),
  addFavorite: (data) => request({ url: '/favorites', method: 'POST', data }),
  removeFavorite: (data) => request({ url: '/favorites', method: 'DELETE', data }),

  getMyIdentityVerification: (silent = false) => request({ url: '/identity/me', silent }),
  getAdminVerifications: (params, silent = false) => request({ url: '/admin/verifications', params, silent }),
  getAdminVerificationDetail: (id, silent = false) => request({ url: `/admin/verifications/${id}`, silent }),
  reviewIdentityVerification: (id, data) => request({ url: `/admin/verifications/${id}/review`, method: 'POST', data }),

  getMessages: (params, silent = false) => request({ url: '/messages', params, silent }),
  markMessagesRead: (data) => request({ url: '/messages/read', method: 'PUT', data }),
}

module.exports = {
  request,
  api,
  uploadIdentityVerification,
  getBaseUrl,
  getUploadBaseUrl,
  normalizeErrorMessage,
}
