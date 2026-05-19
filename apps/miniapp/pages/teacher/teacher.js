const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')

const ALL = '全部'
const POLL_INTERVAL_MS = 5000

function applyLabel(status) {
  return { pending: '待处理', accepted: '已接单', rejected: '未通过' }[status] || '开放中'
}

function shouldShowDemand(demand, myStatus, acceptedDemandIds) {
  if (demand.status !== 'open') return false
  if (acceptedDemandIds[demand.id]) return false
  return !myStatus || myStatus === 'pending'
}

Page({
  data: {
    teacherName: '老师',
    badgeCount: 0,
    subjects: [ALL],
    areas: [ALL],
    selectedSubject: ALL,
    selectedArea: ALL,
    demands: [],
    filteredDemands: [],
    appliedSet: {},
    syncTip: '',
    badgeFlash: false,
    leavingDemandIds: {},
    loading: false,
    verificationStatus: '',
  },

  _pollTimer: null,

  async onShow() {
    this.syncSession()
    const hasProfile = await this.ensureTeacherProfile()
    if (!hasProfile) return
    await getApp().refreshNewDemandsCount()
    await this.refreshBadges()
    const loaded = await this.loadDemands()
    if (loaded) this.startPolling()
  },

  onHide()   { this.stopPolling() },
  onUnload() { this.stopPolling() },

  async onPullDownRefresh() {
    const hasProfile = await this.ensureTeacherProfile()
    if (hasProfile) {
      await this.loadDemands()
      this.refreshBadges()
    }
    wx.stopPullDownRefresh()
  },

  syncSession() {
    const app = getApp()
    const user = app.globalData.userInfo
    this.setData({ teacherName: (user && user.nickname) || '老师' })
  },

  async refreshBadges() {
    const app = getApp()
    const userId = app.globalData.userId
    if (!userId) return
    try {
      const messagesRes = await api.getMessages({ user_id: userId }, true)
      const unread = (messagesRes.data || []).filter(m => !m.is_read).length
      const next = unread
      const badgeFlash = this.data.badgeCount !== next && next > 0
      this.setData({ badgeCount: next, badgeFlash })
      if (badgeFlash) {
        setTimeout(() => this.setData({ badgeFlash: false }), 900)
      }
    } catch (_) {}
  },

  async ensureTeacherProfile() {
    const app = getApp()
    const userId = app.globalData.userId
    if (!userId) return false
    try {
      const teachersRes = await api.listTeachers(true)
      const teacher = (teachersRes.data || []).find(t => t.user_id === userId)
      if (!teacher) { wx.redirectTo({ url: '/pages/teacher-profile/edit-teacher' }); return false }
      app.globalData.teacherId = teacher.id
      wx.setStorageSync('teacherId', teacher.id)
      this.setData({ verificationStatus: teacher.verification_status || 'unverified' })
      return true
    } catch (error) {
      if (error && error.statusCode === 401) return false
      return true
    }
  },

  async loadDemands(background = false) {
    const userId = getApp().globalData.userId
    if (!userId) { wx.reLaunch({ url: '/pages/login/login' }); return }

    if (!background) this.setData({ loading: true })
    try {
      const fetches = [api.listDemands(true), api.listApplies({}, true)]
      if (!background) fetches.push(api.getFavorites({ user_id: userId, type: 'demand' }, true))
      const [demandsRes, appliesRes, favRes] = await Promise.all(fetches)

      const favIds = new Set((favRes && favRes.data || []).map(f => f.target_id))

      const appliedSet = {}
      const acceptedDemandIds = {}
      ;(appliesRes.data || []).forEach(a => {
        if (a.teacher_user_id === userId) appliedSet[a.demand_id] = a.status
        if (a.status === 'accepted') acceptedDemandIds[a.demand_id] = true
      })

      const existingById = {}
      this.data.demands.forEach(d => { existingById[d.id] = { applyStatus: d.applyStatus, isFav: !!d.isFav } })

      const open = (demandsRes.data || [])
        .filter(d => shouldShowDemand(d, appliedSet[d.id], acceptedDemandIds))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(d => ({
          ...d,
          dateText:    d.createdAt ? d.createdAt.slice(0, 10) : '',
          applyStatus: appliedSet[d.id] || 'none',
          applyText:   applyLabel(appliedSet[d.id]),
          isFav:       background
            ? (existingById[d.id] !== undefined ? existingById[d.id].isFav : false)
            : favIds.has(d.id),
          statusChanged: background && existingById[d.id] && existingById[d.id].applyStatus !== (appliedSet[d.id] || 'none'),
        }))

      const subjects = [ALL, ...Array.from(new Set(open.map(d => d.subject).filter(Boolean)))]
      const areas    = [ALL, ...Array.from(new Set(open.map(d => d.area).filter(Boolean)))]

      const listChanged = background && (
        open.length !== this.data.demands.length ||
        this.data.demands.some(d => !open.find(n => n.id === d.id))
      )
      const statusChanged = open.some(d => d.statusChanged)
      const syncTip = listChanged ? '需求状态已更新' : (statusChanged ? '申请状态已更新' : this.data.syncTip)

      const leavingDemandIds = {}
      if (listChanged) {
        this.data.demands.forEach(d => {
          if (!open.find(n => n.id === d.id)) leavingDemandIds[d.id] = true
        })
      }
      if (background && Object.keys(leavingDemandIds).length > 0) {
        this.setData({ leavingDemandIds, syncTip })
        setTimeout(() => {
          this.setData({ demands: open, appliedSet, subjects, areas, leavingDemandIds: {} }, this.applyFilters)
        }, 320)
      } else {
        this.setData({ demands: open, appliedSet, subjects, areas, syncTip }, this.applyFilters)
      }
      if (background && (listChanged || statusChanged)) {
        this.refreshBadges()
        setTimeout(() => {
          const demands = this.data.demands.map(d => ({ ...d, statusChanged: false }))
          this.setData({ demands, syncTip: '' }, this.applyFilters)
        }, 1400)
      }
      return true
    } catch (error) {
      if (error && error.statusCode === 401) {
        this.stopPolling()
        return false
      }
      if (!background) {
        this.setData({ demands: [], filteredDemands: [], appliedSet: {} })
      }
      return false
    } finally {
      if (!background) this.setData({ loading: false })
    }
  },

  startPolling() {
    this.stopPolling()
    this._pollTimer = setInterval(() => this.loadDemands(true), POLL_INTERVAL_MS)
  },

  stopPolling() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null }
  },

  toggleFavDemand(e) {
    const id  = Number(e.currentTarget.dataset.id)
    const uid = getApp().globalData.userId
    if (!uid) return
    const demand = this.data.demands.find(d => d.id === id)
    if (!demand) return
    const added = !demand.isFav
    this.setData({ demands: this.data.demands.map(d => d.id === id ? { ...d, isFav: added } : d) }, this.applyFilters)
    wx.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
    const call = added
      ? api.addFavorite({ user_id: uid, target_id: id, target_type: 'demand' })
      : api.removeFavorite({ user_id: uid, target_id: id, target_type: 'demand' })
    call.catch(() => {
      this.setData({ demands: this.data.demands.map(d => d.id === id ? { ...d, isFav: !added } : d) }, this.applyFilters)
    })
  },

  selectSubject(e) {
    this.setData({ selectedSubject: e.currentTarget.dataset.value }, this.applyFilters)
  },

  selectArea(e) {
    this.setData({ selectedArea: e.currentTarget.dataset.value }, this.applyFilters)
  },

  resetFilters() {
    this.setData({ selectedSubject: ALL, selectedArea: ALL }, this.applyFilters)
  },

  applyFilters() {
    const { selectedSubject, selectedArea, demands } = this.data
    const filteredDemands = demands.filter(item => {
      const subjectMatched = selectedSubject === ALL || item.subject === selectedSubject
      const areaMatched    = selectedArea    === ALL || item.area    === selectedArea
      return subjectMatched && areaMatched
    })
    this.setData({ filteredDemands })
  },

  goDemandDetail(e) {
    const demandId = e.currentTarget.dataset.id
    getApp().globalData.currentDemandId = demandId
    wx.navigateTo({ url: `/pages/apply-demand/apply-demand?demandId=${demandId}` })
  },

  goBrowse() {
    wx.navigateTo({ url: '/pages/browse-demands/browse-demands' })
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notifications/notifications' })
  },

  goMyOrders() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders' })
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/teacher-profile/teacher-profile' })
  },

  goEditTeacher() {
    wx.navigateTo({ url: '/pages/teacher-profile/edit-teacher' })
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
