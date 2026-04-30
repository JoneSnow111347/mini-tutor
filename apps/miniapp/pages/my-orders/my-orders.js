const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')

const POLL_INTERVAL_MS = 5000

const STATUS_TEXT = { open: '开放中', applied: '待处理', accepted: '已接单', closed: '已关闭', pending: '待处理', rejected: '未通过' }

function parentDemandStatus(demand, applies) {
  const acceptedCount = applies.filter(a => a.status === 'accepted').length
  const pendingCount = applies.filter(a => a.status === 'pending').length
  const rejectedCount = applies.filter(a => a.status === 'rejected').length
  if (demand.status === 'closed') return { displayStatus: 'closed', statusText: '已关闭' }
  if (acceptedCount > 0) return { displayStatus: 'accepted', statusText: '已接单' }
  if (pendingCount > 0) return { displayStatus: 'applied', statusText: '待处理' }
  if (rejectedCount > 0) return { displayStatus: 'rejected', statusText: '未通过' }
  return { displayStatus: 'open', statusText: '开放中' }
}

Page({
  data: {
    role: null,
    activeTab: 'all',
    loading: false,

    demands: [],
    closingDemandId: null,
    prevDemandStatuses: {},

    applies: [],
    prevApplyStatuses: {},

    favDemands: [],
    favTeachers: [],
  },

  _pollTimer: null,

  onLoad(options) {
    this.setData({ activeTab: options.favorites === '1' ? 'favorites' : 'all' })
  },

  onShow() {
    const role = getApp().globalData.role || 'parent'
    this.setData({ role })
    this._loadAll()
  },

  onHide() { this._stopPolling() },
  onUnload() { this._stopPolling() },

  async onPullDownRefresh() {
    await this._loadAll()
    wx.stopPullDownRefresh()
  },

  async _loadAll() {
    const role = this.data.role
    if (role === 'teacher') {
      await Promise.all([this._loadTeacherApplies(), this._loadFavDemands()])
    } else {
      await Promise.all([this._loadParentOrders(), this._loadFavTeachers()])
    }
    this._startPolling()
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  // ── Parent: my orders ──────────────────────────────────────────────────────

  async _loadParentOrders(background = false) {
    const uid = getApp().globalData.userId
    if (!uid) return
    if (!background) this.setData({ loading: true })
    try {
      const [demandsRes, appliesRes] = await Promise.all([
        api.listDemands(true),
        api.listApplies({}, true),
      ])
      const myDemands = (demandsRes.data || [])
        .filter(d => d.user_id === uid)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      const demands = myDemands.map(d => {
        const rel = (appliesRes.data || []).filter(a => a.demand_id === d.id)
        const acceptedCount = rel.filter(a => a.status === 'accepted').length
        const display = parentDemandStatus(d, rel)
        const prevStatus = this.data.prevDemandStatuses[d.id]
        return {
          ...d,
          displayStatus:  display.displayStatus,
          statusText:     display.statusText,
          dateText:       d.createdAt ? d.createdAt.slice(0, 10) : '',
          applicantCount: rel.length,
          pendingCount:   rel.filter(a => a.status === 'pending').length,
          acceptedCount,
          canClose:       display.displayStatus === 'accepted',
          statusChanged:  !!(prevStatus && prevStatus !== display.displayStatus),
        }
      })
      const nextStatuses = {}
      demands.forEach(d => { nextStatuses[d.id] = d.displayStatus })
      this.setData({ demands, prevDemandStatuses: nextStatuses })
      if (demands.some(d => d.statusChanged)) {
        setTimeout(() => {
          const updated = this.data.demands.map(d => ({ ...d, statusChanged: false }))
          this.setData({ demands: updated })
        }, 1200)
      }
    } catch (_) {
      if (!background) this.setData({ demands: [] })
    } finally {
      if (!background) this.setData({ loading: false })
    }
  },

  viewApplications(e) {
    const demandId = Number(e.currentTarget.dataset.id)
    getApp().globalData.currentDemandId = demandId
    wx.navigateTo({ url: `/pages/view-applications/view-applications?demandId=${demandId}` })
  },

  showDemandDetail(e) {
    const demand = this.data.demands.find(d => d.id === Number(e.currentTarget.dataset.id))
    if (!demand) return
    wx.showModal({
      title: demand.title,
      content: '状态：' + demand.statusText + '\n科目：' + demand.subject + '\n年级：' + demand.grade_level + '\n区域：' + demand.area + '\n方式：' + demand.class_mode + '\n联系人：' + (demand.contact_name || '未填写') + '\n电话：' + (demand.contact_phone || '未填写') + '\n\n' + (demand.description || '暂无描述'),
      confirmText: '知道了',
      showCancel: false,
    })
  },

  closeDemand(e) {
    const demandId = Number(e.currentTarget.dataset.id)
    const demand = this.data.demands.find(d => d.id === demandId)
    if (!demand || !demand.canClose) return
    wx.showModal({
      title: '关闭订单',
      content: '确定关闭此需求吗？关闭后该教师申请将隐藏并不再显示。',
      confirmText: '关闭',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.closeDemand(demandId)
          this.setData({ closingDemandId: demandId })
          setTimeout(() => {
            const demands = this.data.demands.map(d => d.id === demandId
              ? { ...d, status: 'closed', displayStatus: 'closed', statusText: '已关闭', canClose: false, statusChanged: true }
              : d)
            this.setData({ demands, closingDemandId: null })
            setTimeout(() => {
              const updated = this.data.demands.map(d => ({ ...d, statusChanged: false }))
              this.setData({ demands: updated })
            }, 1200)
            wx.showToast({ title: '订单已关闭', icon: 'success' })
          }, 380)
        } catch (_) {}
      },
    })
  },

  // ── Parent: favorite teachers ──────────────────────────────────────────────

  async _loadFavTeachers() {
    const userId = getApp().globalData.userId
    if (!userId) { this.setData({ favTeachers: [] }); return }
    try {
      const [favRes, teachersRes] = await Promise.all([
        api.getFavorites({ user_id: userId, type: 'teacher' }, true),
        api.listTeachers(true),
      ])
      const favIds = new Set((favRes.data || []).map(f => f.target_id))
      getApp().globalData.favoriteTeacherIds = [...favIds]
      const favTeachers = (teachersRes.data || [])
        .filter(t => favIds.has(t.id))
        .map(t => ({
          ...t,
          initial: (t.real_name || '师').slice(0, 1),
          verifiedText: t.verification_status === 'verified' ? '已认证' : '待认证',
        }))
      this.setData({ favTeachers })
    } catch (_) { this.setData({ favTeachers: [] }) }
  },

  unfavTeacher(e) {
    const teacherId = Number(e.currentTarget.dataset.id)
    const uid = getApp().globalData.userId
    if (!uid) return
    const old = this.data.favTeachers
    this.setData({ favTeachers: old.filter(t => t.id !== teacherId) })
    wx.showToast({ title: '已取消收藏', icon: 'none' })
    api.removeFavorite({ user_id: uid, target_id: teacherId, target_type: 'teacher' })
      .catch(() => { this.setData({ favTeachers: old }) })
  },

  goTeacherProfile(e) {
    const teacherId = Number(e.currentTarget.dataset.id)
    const userId    = Number(e.currentTarget.dataset.userId)
    wx.navigateTo({ url: `/pages/teacher-profile/teacher-profile?teacherId=${teacherId}&userId=${userId}&readonly=1` })
  },

  // ── Teacher: my applies ────────────────────────────────────────────────────

  async _loadTeacherApplies(background = false) {
    const userId = getApp().globalData.userId
    if (!userId) return
    if (!background) this.setData({ loading: true })
    try {
      const [appliesRes, demandsRes] = await Promise.all([
        api.listApplies({ teacher_user_id: userId }, true),
        api.listDemands(true),
      ])
      const demandMap = {}
      ;(demandsRes.data || []).forEach(d => { demandMap[d.id] = d })

      const prevStatuses = this.data.prevApplyStatuses || {}
      const applies = (appliesRes.data || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(a => {
          const d = demandMap[a.demand_id] || {}
          const prevStatus = prevStatuses[a.id]
          const statusChanged = !!(prevStatus && prevStatus !== a.status)
          return {
            ...a,
            demandTitle:   d.title || `需求 #${a.demand_id}`,
            demandSubject: d.subject || '',
            demandArea:    d.area    || '',
            demandMode:    d.class_mode || '',
            statusText:    STATUS_TEXT[a.status] || a.status,
            dateText:      a.createdAt ? a.createdAt.slice(0, 10) : '',
            statusChanged,
          }
        })

      const nextStatuses = {}
      applies.forEach(a => { nextStatuses[a.id] = a.status })

      this.setData({ applies, prevApplyStatuses: nextStatuses })

      if (applies.some(a => a.statusChanged)) {
        setTimeout(() => {
          const updated = this.data.applies.map(a => ({ ...a, statusChanged: false }))
          this.setData({ applies: updated })
        }, 1200)
      }
    } catch (_) {
      if (!background) this.setData({ applies: [] })
    } finally {
      if (!background) this.setData({ loading: false })
    }
  },

  goApplyDetail(e) {
    const demandId = e.currentTarget.dataset.demandId
    wx.navigateTo({ url: `/pages/apply-demand/apply-demand?demandId=${demandId}` })
  },

  // ── Teacher: favorite demands ──────────────────────────────────────────────

  async _loadFavDemands() {
    const userId = getApp().globalData.userId
    if (!userId) { this.setData({ favDemands: [] }); return }
    try {
      const [favRes, demandsRes] = await Promise.all([
        api.getFavorites({ user_id: userId, type: 'demand' }, true),
        api.listDemands(true),
      ])
      const favIds = new Set((favRes.data || []).map(f => f.target_id))
      getApp().globalData.favoriteDemandIds = [...favIds]
      const favDemands = (demandsRes.data || [])
        .filter(d => favIds.has(d.id))
        .map(d => ({
          ...d,
          dateText: d.createdAt ? d.createdAt.slice(0, 10) : '',
          statusText: STATUS_TEXT[d.status] || d.status,
        }))
      this.setData({ favDemands })
    } catch (_) { this.setData({ favDemands: [] }) }
  },

  unfavDemand(e) {
    const demandId = Number(e.currentTarget.dataset.id)
    const uid = getApp().globalData.userId
    if (!uid) return
    const old = this.data.favDemands
    this.setData({ favDemands: old.filter(d => d.id !== demandId) })
    wx.showToast({ title: '已取消收藏', icon: 'none' })
    api.removeFavorite({ user_id: uid, target_id: demandId, target_type: 'demand' })
      .catch(() => { this.setData({ favDemands: old }) })
  },

  goFavDemandDetail(e) {
    const demandId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/apply-demand/apply-demand?demandId=${demandId}` })
  },

  // ── Polling ────────────────────────────────────────────────────────────────

  _startPolling() {
    this._stopPolling()
    this._pollTimer = setInterval(() => {
      if (this.data.role === 'teacher') {
        this._loadTeacherApplies(true)
      } else {
        this._loadParentOrders(true)
      }
    }, POLL_INTERVAL_MS)
  },

  _stopPolling() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null }
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
