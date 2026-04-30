// utils/request.js — Unified HTTP helper for WeChat Mini Program
//
// MOCK_MODE = true  → runs entirely on local in-memory data; no backend needed.
// MOCK_MODE = false → hits the real server at BASE_URL.

const MOCK_MODE = false
const BASE_URL = 'https://whututor.cn/api'
// ── Mock database ────────────────────────────────────────────────────────────

const MOCK_DB = {
  users: [
    { id: 1, phone: '13800138001', role: 'parent',  nickname: '张妈妈', status: 'active' },
    { id: 2, phone: '13900139001', role: 'teacher', nickname: '王老师', status: 'active' },
  ],
  teachers: [
    {
      id: 1, user_id: 2,
      real_name: '王大明',
      teaching_subjects: '数学,物理,化学',
      is_public: true,
      verification_status: 'verified',
      createdAt: '2025-02-01T00:00:00.000Z',
    },
  ],
  demands: [
    {
      id: 1, user_id: 1,
      title: '初二数学辅导',
      subject: '数学', grade_level: '初中二年级',
      area: '武汉市洪山区', class_mode: '线下',
      description: '孩子数学成绩不稳定，希望每周补课两次，重点加强代数和几何。',
      contact_name: '张妈妈', contact_phone: '13800138001',
      status: 'open',
      createdAt: '2025-02-05T08:00:00.000Z',
    },
    {
      id: 2, user_id: 1,
      title: '高一英语口语提升',
      subject: '英语', grade_level: '高中一年级',
      area: '武汉市武昌区', class_mode: '均可',
      description: '孩子英语基础不错，希望重点提升口语和写作，为高考做准备。',
      contact_name: '张妈妈', contact_phone: '13800138001',
      status: 'open',
      createdAt: '2025-02-10T10:00:00.000Z',
    },
    {
      id: 3, user_id: 1,
      title: '小学语文作文辅导',
      subject: '语文', grade_level: '小学五年级',
      area: '武汉市江汉区', class_mode: '线下',
      description: '孩子作文基础薄弱，需要老师一对一针对性辅导写作技巧。',
      contact_name: '张妈妈', contact_phone: '13800138001',
      status: 'closed',
      createdAt: '2025-01-15T09:00:00.000Z',
    },
  ],
  applies: [
    {
      id: 1, demand_id: 1, teacher_user_id: 2,
      message: '本人有六年初中数学辅导经验，代数几何均擅长，多名学生成绩显著提升，欢迎沟通。',
      status: 'pending',
      createdAt: '2025-02-06T14:00:00.000Z',
    },
  ],
  _seq: { users: 3, teachers: 2, demands: 4, applies: 2 },
}

function _ok(data)  { return new Promise(r  => setTimeout(() => r({ success: true, data }), 250)) }
function normalizeMessage(msg) {
  const text = String(msg || '')
  const lower = text.toLowerCase()
  if (lower.includes('already registered')) return '该手机号已注册'
  if (lower.includes('not found')) return '未找到相关记录'
  if (lower.includes('teacher profile already exists')) return '老师资料已存在'
  if (lower.includes('already applied')) return '您已申请过该需求'
  if (lower.includes('missing required fields')) return '请填写必填信息'
  if (lower.includes('no updatable fields provided')) return '没有可保存的资料变更'
  if (lower.includes('invalid role')) return '请选择正确的身份'
  if (lower.includes('inactive')) return '账号已停用'
  if (lower.includes('user')) return '用户不存在'
  if (lower.includes('teacher')) return '老师资料不存在'
  if (lower.includes('demand')) return '需求不存在'
  if (lower.includes('apply')) return '申请不存在'
  return /[一-龥]/.test(text) ? text : '请求失败，请稍后重试'
}
function _err(msg)  {
  const text = normalizeMessage(msg)
  return new Promise((_, rej) => setTimeout(() => {
    wx.showToast({ title: text, icon: 'none', duration: 2500 })
    rej({ success: false, message: text })
  }, 250))
}

// ── Mock API ─────────────────────────────────────────────────────────────────

const mockApi = {
  register({ phone, role, nickname }) {
    if (MOCK_DB.users.find(u => u.phone === phone)) return _err('该手机号已注册')
    const user = { id: MOCK_DB._seq.users++, phone, role, nickname: nickname || '用户', status: 'active' }
    MOCK_DB.users.push(user)
    return _ok(user)
  },
  createUser(data) { return this.register(data) },
  login(phone) {
    const user = MOCK_DB.users.find(u => u.phone === phone)
    return user ? _ok(user) : _err('手机号未注册')
  },
  getUser(id) {
    const u = MOCK_DB.users.find(u => u.id === Number(id))
    return u ? _ok(u) : _err('用户不存在')
  },
  updateUser(id, data) {
    const i = MOCK_DB.users.findIndex(u => u.id === Number(id))
    if (i === -1) return _err('用户不存在')
    return _ok(Object.assign(MOCK_DB.users[i], data))
  },
  createTeacher({ user_id, real_name, teaching_subjects }) {
    if (MOCK_DB.teachers.find(t => t.user_id === Number(user_id))) return _err('老师资料已存在')
    const t = { id: MOCK_DB._seq.teachers++, user_id: Number(user_id), real_name, teaching_subjects, is_public: true, verification_status: 'pending', createdAt: new Date().toISOString() }
    MOCK_DB.teachers.push(t)
    return _ok(t)
  },
  listTeachers(_silent)   { return _ok([...MOCK_DB.teachers]) },
  getTeacher(id) {
    const t = MOCK_DB.teachers.find(t => t.id === Number(id))
    return t ? _ok(t) : _err('老师资料不存在')
  },
  updateTeacher(id, data) {
    const i = MOCK_DB.teachers.findIndex(t => t.id === Number(id))
    if (i === -1) return _err('老师资料不存在')
    return _ok(Object.assign(MOCK_DB.teachers[i], data))
  },
  createDemand(data) {
    const d = { id: MOCK_DB._seq.demands++, ...data, status: 'open', createdAt: new Date().toISOString() }
    MOCK_DB.demands.push(d)
    return _ok(d)
  },
  listDemands(_silent) { return _ok([...MOCK_DB.demands]) },
  getDemand(id) {
    const d = MOCK_DB.demands.find(d => d.id === Number(id))
    return d ? _ok(d) : _err('需求不存在')
  },
  updateDemand(id, data) {
    const i = MOCK_DB.demands.findIndex(d => d.id === Number(id))
    if (i === -1) return _err('需求不存在')
    return _ok(Object.assign(MOCK_DB.demands[i], data))
  },
  closeDemand(id) { return this.updateDemand(id, { status: 'closed' }) },
  createApply({ demand_id, teacher_user_id, message }) {
    const dup = MOCK_DB.applies.find(a => a.demand_id === Number(demand_id) && a.teacher_user_id === Number(teacher_user_id))
    if (dup) return _err('您已申请过该需求')
    const a = { id: MOCK_DB._seq.applies++, demand_id: Number(demand_id), teacher_user_id: Number(teacher_user_id), message: message || null, status: 'pending', createdAt: new Date().toISOString() }
    MOCK_DB.applies.push(a)
    return _ok(a)
  },
  listApplies({ demand_id, teacher_user_id } = {}, _silent) {
    let rows = [...MOCK_DB.applies]
    if (demand_id)       rows = rows.filter(a => a.demand_id       === Number(demand_id))
    if (teacher_user_id) rows = rows.filter(a => a.teacher_user_id === Number(teacher_user_id))
    return _ok(rows)
  },
  getApply(id) {
    const a = MOCK_DB.applies.find(a => a.id === Number(id))
    return a ? _ok(a) : _err('申请不存在')
  },
  updateApply(id, status) {
    const i = MOCK_DB.applies.findIndex(a => a.id === Number(id))
    if (i === -1) return _err('申请不存在')
    MOCK_DB.applies[i] = { ...MOCK_DB.applies[i], status }
    return _ok(MOCK_DB.applies[i])
  },
  getFavorites({ user_id, type: target_type } = {}) {
    let rows = MOCK_DB.favorites || []
    rows = rows.filter(f => f.user_id === Number(user_id))
    if (target_type) rows = rows.filter(f => f.target_type === target_type)
    return _ok(rows)
  },
  addFavorite({ user_id, target_id, target_type }) {
    if (!MOCK_DB.favorites) MOCK_DB.favorites = []
    const exists = MOCK_DB.favorites.find(f => f.user_id === Number(user_id) && f.target_id === Number(target_id) && f.target_type === target_type)
    if (!exists) MOCK_DB.favorites.push({ user_id: Number(user_id), target_id: Number(target_id), target_type })
    return _ok({})
  },
  removeFavorite({ user_id, target_id, target_type }) {
    if (!MOCK_DB.favorites) MOCK_DB.favorites = []
    MOCK_DB.favorites = MOCK_DB.favorites.filter(f => !(f.user_id === Number(user_id) && f.target_id === Number(target_id) && f.target_type === target_type))
    return _ok({})
  },
  getMessages({ user_id } = {}) { return _ok([]) },
  markMessagesRead({ user_id, ids } = {}) { return _ok({}) },
}

// ── Real HTTP request ────────────────────────────────────────────────────────

function request({ url, method = 'GET', data, params = {}, silent = false }) {
  let fullUrl = BASE_URL + url
  if (method === 'GET') {
    const pairs = Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    if (pairs.length > 0) {
      fullUrl += '?' + pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    }
  }
  const token = wx.getStorageSync('token')
  const header = { 'Content-Type': 'application/json' }
  if (token) header['Authorization'] = `Bearer ${token}`

  if (!silent) wx.showLoading({ title: '加载中', mask: true })
  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl, method,
      data: method !== 'GET' ? data : undefined,
      header,
      success(res) {
        if (!silent) wx.hideLoading()
        const body = res.data
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ data: body != null && body.data !== undefined ? body.data : body })
        } else {
          const msg = normalizeMessage((body && (body.message || body.error)) || ('请求失败 ' + res.statusCode))
          wx.showToast({ title: msg, icon: 'none', duration: 2500 })
          reject(body ? { ...body, message: msg } : { message: msg })
        }
      },
      fail(err) {
        if (!silent) wx.hideLoading()
        wx.showToast({ title: '网络错误，请重试', icon: 'none', duration: 2500 })
        reject(err)
      },
    })
  })
}

const realApi = {
  register: (data) => request({ url: '/users', method: 'POST', data }),
  createUser: (data) => request({ url: '/users', method: 'POST', data }),
  login: (phone) => request({ url: '/users/login', method: 'POST', data: { phone } }),
  getUser: (id) => request({ url: `/users/${id}` }),
  updateUser: (id, data) => request({ url: `/users/${id}`, method: 'PUT', data }),
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
  getMessages: (params, silent = false) => request({ url: '/messages', params, silent }),
  markMessagesRead: (data) => request({ url: '/messages/read', method: 'PUT', data }),
}

const api = MOCK_MODE ? mockApi : realApi

module.exports = { request, api, MOCK_MODE }
