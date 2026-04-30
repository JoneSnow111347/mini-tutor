const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')
const POLL_INTERVAL_MS = 5000

function demandStatus(demand, related) {
  const acceptedCount = related.filter(a => a.status === 'accepted').length
  const pendingCount = related.filter(a => a.status === 'pending').length
  const rejectedCount = related.filter(a => a.status === 'rejected').length
  if (demand.status === 'closed') return { status: 'closed', text: '已关闭' }
  if (acceptedCount > 0) return { status: 'accepted', text: '已接单' }
  if (pendingCount > 0) return { status: 'applied', text: '待处理' }
  if (rejectedCount > 0) return { status: 'rejected', text: '未通过' }
  return { status: 'open', text: '开放中' }
}

Page({
  data: {
    userName: '家长',
    pendingCount: 0,
    stats: { total: 0, pending: 0, accepted: 0 },
    demands: [],
    loading: false,
    closingDemandId: null,
    badgeFlash: false,
  },

  _pollTimer: null,

  onShow() {
    this.syncSession()
    this.loadDashboard()
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  async onPullDownRefresh() {
    await this.loadDashboard()
    wx.stopPullDownRefresh()
  },

  syncSession() {
    const user = getApp().globalData.userInfo
    this.setData({ userName: (user && user.nickname) || '家长' })
  },

  async loadDashboard(background = false) {
    const app = getApp()
    const uid = app.globalData.userId
    if (!uid) { wx.reLaunch({ url: '/pages/login/login' }); return }

    if (!background) this.setData({ loading: true })
    try {
      const fetches = [
        api.listDemands(true),
        api.listApplies({}, true),
        api.getFavorites({ user_id: uid, type: 'demand' }, true),
      ]
      const [demandsRes, appliesRes, favRes] = await Promise.all(fetches)

      const myDemands = (demandsRes.data || [])
        .filter(d => d.user_id === uid)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      const myDemandIds = myDemands.map(d => d.id)
      const myApplies   = (appliesRes.data || []).filter(a => myDemandIds.includes(a.demand_id))
      const pending  = myApplies.filter(a => a.status === 'pending').length
      const accepted = myApplies.filter(a => a.status === 'accepted').length

      const badgeFlash = this.data.pendingCount !== pending && pending > 0
      app.globalData.pendingCount = pending

      const favIds = new Set((favRes.data || []).map(f => f.target_id))

      const demands = myDemands.map(d => {
        const related      = myApplies.filter(a => a.demand_id === d.id)
        const acceptedCount = related.filter(a => a.status === 'accepted').length
        const display = demandStatus(d, related)
        return {
          ...d,
          displayStatus:  display.status,
          statusText:     display.text,
          dateText:       d.createdAt ? d.createdAt.slice(0, 10) : '',
          applicantCount: related.length,
          pendingCount:   related.filter(a => a.status === 'pending').length,
          acceptedCount,
          canClose:       display.status === 'accepted',
          isFav:          favIds.has(d.id),
        }
      })

      this.setData({
        pendingCount: pending,
        stats: { total: myDemands.length, pending, accepted },
        demands,
        badgeFlash,
      })
      if (badgeFlash) {
        setTimeout(() => this.setData({ badgeFlash: false }), 900)
      }
    } catch (_) {
      if (!background) this.setData({ demands: [] })
    } finally {
      if (!background) this.setData({ loading: false })
    }
  },

  startPolling() {
    this.stopPolling()
    this._pollTimer = setInterval(() => this.loadDashboard(true), POLL_INTERVAL_MS)
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  toggleFavDemand(e) {
    const id  = Number(e.currentTarget.dataset.id)
    const uid = getApp().globalData.userId
    if (!uid) return
    const demand = this.data.demands.find(d => d.id === id)
    if (!demand) return
    const added = !demand.isFav
    this.setData({ demands: this.data.demands.map(d => d.id === id ? { ...d, isFav: added } : d) })
    wx.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
    const call = added
      ? api.addFavorite({ user_id: uid, target_id: id, target_type: 'demand' })
      : api.removeFavorite({ user_id: uid, target_id: id, target_type: 'demand' })
    call.catch(() => {
      this.setData({ demands: this.data.demands.map(d => d.id === id ? { ...d, isFav: !added } : d) })
    })
  },

  openNotifications() {
    wx.navigateTo({ url: '/pages/notifications/notifications' })
  },

  goPublishDemand() {
    wx.navigateTo({ url: '/pages/publish-demand/publish-demand' })
  },

  goApplications() {
    wx.navigateTo({ url: '/pages/view-applications/view-applications' })
  },

  goMyOrders() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders' })
  },

  goBrowseDemands() {
    wx.navigateTo({ url: '/pages/browse-demands/browse-demands' })
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/my/my' })
  },

  viewDemandApplications(e) {
    const demand = this.data.demands.find(d => d.id === Number(e.currentTarget.dataset.id))
    if (!demand) return
    getApp().globalData.currentDemandId = demand.id
    wx.navigateTo({ url: `/pages/view-applications/view-applications?demandId=${demand.id}` })
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
              ? { ...d, status: 'closed', displayStatus: 'closed', statusText: '已关闭', canClose: false }
              : d)
            this.setData({ demands, closingDemandId: null })
            const pending = demands.reduce((n, d) => n + (d.pendingCount || 0), 0)
            this.setData({ pendingCount: pending })
            wx.showToast({ title: '订单已关闭', icon: 'success' })
          }, 380)
        } catch (_) {}
      },
    })
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
