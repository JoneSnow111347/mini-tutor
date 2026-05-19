// app.js — WeChat Mini Program entry point
App({

  globalData: {
    userInfo: null,
    userId: null,
    role: null,
    teacherId: null,
    currentDemandId: null,
    currentApplyId: null,

    // Parent badge
    pendingCount: 0,

    // Teacher notifications
    studentNotifications: [],
    lastBrowseDemandsTime: 0,
    newDemandsCount: 0,

    // Favorites (persisted per-user in localStorage)
    favoriteDemandIds: [],
    favoriteTeacherIds: [],
  },

  onLaunch() {
    this._restoreSession()
  },

  _restoreSession() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) return
    this.globalData.userInfo  = userInfo
    this.globalData.userId    = userInfo.id
    this.globalData.role      = userInfo.role
    const tid = wx.getStorageSync('teacherId')
    this.globalData.teacherId = ['teacher', 'both'].includes(userInfo.role) && tid ? Number(tid) : null
    if (!['teacher', 'both'].includes(userInfo.role)) {
      wx.removeStorageSync('teacherId')
    }
    if (userInfo.id) this.loadFavorites(userInfo.id)
  },

  setSession(user, teacherId = null) {
    this.globalData.userInfo             = user
    this.globalData.userId               = user.id
    this.globalData.role                 = user.role
    this.globalData.teacherId            = teacherId
    this.globalData.pendingCount          = 0
    this.globalData.studentNotifications  = []
    this.globalData.lastBrowseDemandsTime = 0
    this.globalData.newDemandsCount       = 0
    wx.setStorageSync('userInfo', user)
    if (teacherId) wx.setStorageSync('teacherId', teacherId)
    else wx.removeStorageSync('teacherId')
    this.loadFavorites(user.id)
  },

  logout() {
    this.globalData.userInfo              = null
    this.globalData.userId                = null
    this.globalData.role                  = null
    this.globalData.teacherId             = null
    this.globalData.currentDemandId       = null
    this.globalData.currentApplyId        = null
    this.globalData.pendingCount          = 0
    this.globalData.studentNotifications  = []
    this.globalData.lastBrowseDemandsTime = 0
    this.globalData.newDemandsCount       = 0
    this.globalData.favoriteDemandIds     = []
    this.globalData.favoriteTeacherIds    = []
    wx.clearStorageSync()
    wx.reLaunch({ url: '/pages/login/login' })
  },

  // ── Favorites ──────────────────────────────────────────────────────────────

  loadFavorites(userId) {
    const { api } = require('./utils/request')
    api.getFavorites({ user_id: userId, type: 'demand' }, true)
      .then(r => { this.globalData.favoriteDemandIds = (r.data || []).map(f => f.target_id) })
      .catch(() => {})
    api.getFavorites({ user_id: userId, type: 'teacher' }, true)
      .then(r => { this.globalData.favoriteTeacherIds = (r.data || []).map(f => f.target_id) })
      .catch(() => {})
  },

  /** Toggle demand favorite; returns true if now favorited, false if removed. */
  toggleFavoriteDemand(id) {
    const uid = this.globalData.userId
    if (!uid) return false
    const list = this.globalData.favoriteDemandIds
    const idx  = list.indexOf(id)
    const added = idx < 0
    if (idx >= 0) list.splice(idx, 1)
    else list.push(id)
    const { api } = require('./utils/request')
    const call = added
      ? api.addFavorite({ user_id: uid, target_id: id, target_type: 'demand' })
      : api.removeFavorite({ user_id: uid, target_id: id, target_type: 'demand' })
    call.catch(() => {
      const i = list.indexOf(id)
      if (added && i >= 0) list.splice(i, 1)
      else if (!added && i < 0) list.push(id)
    })
    return added
  },

  isFavoriteDemand(id) {
    return this.globalData.favoriteDemandIds.includes(id)
  },

  /** Toggle teacher favorite; returns true if now favorited, false if removed. */
  toggleFavoriteTeacher(id) {
    const uid = this.globalData.userId
    if (!uid) return false
    const list = this.globalData.favoriteTeacherIds
    const idx  = list.indexOf(id)
    const added = idx < 0
    if (idx >= 0) list.splice(idx, 1)
    else list.push(id)
    const { api } = require('./utils/request')
    const call = added
      ? api.addFavorite({ user_id: uid, target_id: id, target_type: 'teacher' })
      : api.removeFavorite({ user_id: uid, target_id: id, target_type: 'teacher' })
    call.catch(() => {
      const i = list.indexOf(id)
      if (added && i >= 0) list.splice(i, 1)
      else if (!added && i < 0) list.push(id)
    })
    return added
  },

  isFavoriteTeacher(id) {
    return this.globalData.favoriteTeacherIds.includes(id)
  },

  // ── Parent badge helpers ───────────────────────────────────────────────────

  async refreshPendingCount() {
    const uid = this.globalData.userId
    if (!uid || this.globalData.role === 'teacher') {
      this.globalData.pendingCount = 0
      return 0
    }
    try {
      const { api } = require('./utils/request')
      const dr = await api.listDemands(true)
      const myDemandIds = (dr.data || []).filter(d => Number(d.user_id) === Number(uid)).map(d => d.id)
      if (myDemandIds.length === 0) { this.globalData.pendingCount = 0; return 0 }
      const ar = await api.listApplies({}, true)
      const count = (ar.data || []).filter(a => myDemandIds.includes(a.demand_id) && a.status === 'pending').length
      this.globalData.pendingCount = count
      return count
    } catch (_) {
      return this.globalData.pendingCount
    }
  },

  decrementPending() {
    if (this.globalData.pendingCount > 0) this.globalData.pendingCount--
  },

  // ── Teacher notification helpers ───────────────────────────────────────────

  addStudentNotification({ applyId, demandId, status, demandTitle }) {
    const list = this.globalData.studentNotifications
    const idx  = list.findIndex(n => n.applyId === applyId)
    const entry = { applyId, demandId, status, demandTitle, timestamp: Date.now(), read: false }
    if (idx >= 0) list[idx] = entry
    else list.push(entry)
  },

  getUnreadNotificationCount() {
    return this.globalData.studentNotifications.filter(n => !n.read).length
  },

  markAllNotificationsRead() {
    this.globalData.studentNotifications.forEach(n => { n.read = true })
  },

  // ── Teacher new-demand tracking ────────────────────────────────────────────

  setLastBrowseDemandsTime() {
    this.globalData.lastBrowseDemandsTime = Date.now()
    this.globalData.newDemandsCount = 0
  },

  async refreshNewDemandsCount() {
    if (this.globalData.role !== 'teacher') { this.globalData.newDemandsCount = 0; return 0 }
    const since = this.globalData.lastBrowseDemandsTime
    if (!since) return 0
    try {
      const { api } = require('./utils/request')
      const dr = await api.listDemands(true)
      const count = (dr.data || []).filter(d => d.status === 'open' && new Date(d.createdAt).getTime() > since).length
      this.globalData.newDemandsCount = count
      return count
    } catch (_) {
      return this.globalData.newDemandsCount
    }
  },
})
