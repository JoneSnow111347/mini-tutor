const { api } = require('../../utils/request')

const POLL_INTERVAL_MS = 5000

function badgeText(status) {
  return { pending: '待处理', accepted: '已接单', rejected: '未通过' }[status] || status
}

function decorateDemand(demand, applies) {
  const acceptedCount = applies.filter(a => a.status === 'accepted').length
  const pendingCount = applies.filter(a => a.status === 'pending').length
  const rejectedCount = applies.filter(a => a.status === 'rejected').length
  if (!demand) return null
  if (demand.status === 'closed') return { ...demand, displayStatus: 'closed', statusText: '已关闭', canClose: false }
  if (acceptedCount > 0) return { ...demand, displayStatus: 'accepted', statusText: '已接单', canClose: true }
  if (pendingCount > 0) return { ...demand, displayStatus: 'applied', statusText: '待处理', canClose: false }
  if (rejectedCount > 0) return { ...demand, displayStatus: 'rejected', statusText: '未通过', canClose: false }
  return { ...demand, displayStatus: 'open', statusText: '开放中', canClose: false }
}

Page({
  data: {
    myDemands: [],
    selectedDemand: null,
    applies: [],
    teacherMap: {},
    loading: false,
    pendingCount: 0,
    demandStatusChanged: false,
    favTeacherMap: {},
  },

  _pollTimer: null,
  _initialDemandId: null,

  onLoad(options) {
    this._initialDemandId = options.demandId || getApp().globalData.currentDemandId || null
  },

  onShow() {
    this.loadMyDemands()
  },

  onHide()   { this.stopPolling() },
  onUnload() { this.stopPolling() },

  async onPullDownRefresh() {
    if (this.data.selectedDemand) await this.loadApplies(this.data.selectedDemand)
    else await this.loadMyDemands()
    wx.stopPullDownRefresh()
  },

  async loadMyDemands() {
    this.setData({ loading: true })
    try {
      const uid = getApp().globalData.userId
      const res = await api.listDemands(true)
      const mine = (res.data || [])
        .filter(d => Number(d.user_id) === Number(uid))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(d => ({
          ...d,
          displayStatus: d.status === 'closed' ? 'closed' : 'open',
          statusText: d.status === 'closed' ? '已关闭' : '开放中',
          dateText: d.createdAt ? d.createdAt.slice(0, 10) : '',
        }))

      this.setData({ myDemands: mine })
      if (this._initialDemandId) {
        const target = mine.find(d => d.id === Number(this._initialDemandId))
        this._initialDemandId = null
        if (target) { this.setData({ selectedDemand: target }); await this.loadApplies(target) }
      }
    } catch (_) {
      this.setData({ myDemands: [] })
    } finally {
      this.setData({ loading: false })
    }
  },

  selectDemand(e) {
    const demand = this.data.myDemands.find(d => d.id === Number(e.currentTarget.dataset.id))
    if (!demand) return
    this.setData({ selectedDemand: demand })
    this.loadApplies(demand)
  },

  async loadApplies(demand) {
    this.setData({ loading: true })
    try {
      const userId = getApp().globalData.userId
      const [appliesRes, teachersRes, favRes] = await Promise.all([
        api.listApplies({ demand_id: demand.id }, true),
        api.listTeachers(true),
        api.getFavorites({ user_id: userId, type: 'teacher' }, true),
      ])
      const teacherMap = {}
      ;(teachersRes.data || []).forEach(t => { teacherMap[t.user_id] = t })

      const favTeacherIds = new Set((favRes.data || []).map(f => f.target_id))
      const favTeacherMap = {}
      ;(appliesRes.data || []).forEach(a => {
        const t = teacherMap[a.teacher_user_id]
        if (t) favTeacherMap[t.id] = favTeacherIds.has(t.id)
      })

      const applies = (appliesRes.data || []).map(a => ({
        ...a,
        statusText: badgeText(a.status),
        dateText: a.createdAt ? a.createdAt.slice(0, 10) : '',
      }))
      const pendingCount = applies.filter(a => a.status === 'pending').length
      this.setData({ applies, teacherMap, pendingCount, favTeacherMap, selectedDemand: decorateDemand(demand, applies) })
      getApp().refreshPendingCount().catch(() => {})
      this.startPolling()
    } catch (_) {
      this.setData({ applies: [], teacherMap: {}, pendingCount: 0, favTeacherMap: {} })
    } finally {
      this.setData({ loading: false })
    }
  },

  backToDemandList() {
    this.stopPolling()
    this.setData({ selectedDemand: null, applies: [], teacherMap: {}, pendingCount: 0, favTeacherMap: {} })
  },

  startPolling() {
    this.stopPolling()
    this._pollTimer = setInterval(() => this.pollApplies(), POLL_INTERVAL_MS)
  },

  stopPolling() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null }
  },

  async pollApplies() {
    if (!this.data.selectedDemand) return
    try {
      const res = await api.listApplies({ demand_id: this.data.selectedDemand.id }, true)
      const old = this.data.applies
      const incoming = res.data.map(a => ({
        ...a,
        statusText: badgeText(a.status),
        dateText: a.createdAt ? a.createdAt.slice(0, 10) : '',
        statusChanged: !!(old.find(p => p.id === a.id) && old.find(p => p.id === a.id).status !== a.status),
      }))
      const changed = incoming.length !== old.length || incoming.some(a => {
        const prev = old.find(p => p.id === a.id)
        return !prev || prev.status !== a.status
      })
      if (!changed) return
      this.setData({
        applies: incoming,
        pendingCount: incoming.filter(a => a.status === 'pending').length,
        selectedDemand: decorateDemand(this.data.selectedDemand, incoming),
        demandStatusChanged: true,
      })
      setTimeout(() => {
        const applies = this.data.applies.map(a => ({ ...a, statusChanged: false }))
        this.setData({ applies, demandStatusChanged: false })
      }, 1200)
      getApp().refreshPendingCount().catch(() => {})
    } catch (_) {}
  },

  toggleFavTeacher(e) {
    const teacherId = Number(e.currentTarget.dataset.teacherId)
    const uid = getApp().globalData.userId
    if (!uid) return
    const was = !!this.data.favTeacherMap[teacherId]
    const added = !was
    this.setData({ favTeacherMap: { ...this.data.favTeacherMap, [teacherId]: added } })
    wx.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
    const call = added
      ? api.addFavorite({ user_id: uid, target_id: teacherId, target_type: 'teacher' })
      : api.removeFavorite({ user_id: uid, target_id: teacherId, target_type: 'teacher' })
    call.catch(() => {
      this.setData({ favTeacherMap: { ...this.data.favTeacherMap, [teacherId]: was } })
    })
  },

  handleDecision(e) {
    const applyId  = Number(e.currentTarget.dataset.applyId)
    const decision = e.currentTarget.dataset.decision
    const label    = decision === 'accepted' ? '接受' : '拒绝'
    wx.showModal({
      title: `确认${label}`,
      content: decision === 'accepted'
        ? '接受后老师将获得你的联系方式，可以开始沟通。'
        : '拒绝后该老师将无法继续申请此需求。',
      confirmText: label,
      confirmColor: decision === 'accepted' ? '#34c759' : '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const r = await api.updateApply(applyId, decision)
          const updated = { ...r.data, statusText: badgeText(r.data.status), dateText: r.data.createdAt ? r.data.createdAt.slice(0, 10) : '', statusChanged: true }
          const applies = this.data.applies.map(a => a.id === applyId ? updated : a)
          this.setData({
            applies,
            pendingCount: applies.filter(a => a.status === 'pending').length,
            selectedDemand: decorateDemand(this.data.selectedDemand, applies),
            demandStatusChanged: true,
          })
          setTimeout(() => {
            const reset = this.data.applies.map(a => ({ ...a, statusChanged: false }))
            this.setData({ applies: reset, demandStatusChanged: false })
          }, 1200)
          getApp().decrementPending()
          getApp().refreshPendingCount().catch(() => {})
          wx.showToast({ title: decision === 'accepted' ? '已接受申请' : '已拒绝申请', icon: decision === 'accepted' ? 'success' : 'none' })
        } catch (_) {}
      },
    })
  },

  goAcceptReject(e) {
    const applyId = e.currentTarget.dataset.applyId
    getApp().globalData.currentApplyId = applyId
    wx.navigateTo({ url: `/pages/accept-reject/accept-reject?applyId=${applyId}` })
  },

  goTeacherProfile(e) {
    const userId  = Number(e.currentTarget.dataset.userId)
    const teacher = this.data.teacherMap[userId]
    if (!teacher) { wx.showToast({ title: '未找到老师资料', icon: 'none' }); return }
    wx.navigateTo({ url: `/pages/teacher-profile/teacher-profile?teacherId=${teacher.id}&userId=${teacher.user_id}&readonly=1` })
  },

  closeDemand() {
    const demand = this.data.selectedDemand
    if (!demand || !demand.canClose) return
    wx.showModal({
      title: '关闭需求',
      content: '关闭后老师无法继续申请，已有申请不受影响。',
      confirmText: '关闭',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.closeDemand(demand.id)
          this.setData({ selectedDemand: { ...demand, status: 'closed', displayStatus: 'closed', statusText: '已关闭', canClose: false } })
          wx.showToast({ title: '已关闭', icon: 'success' })
        } catch (_) {}
      },
    })
  },

})
