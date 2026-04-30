const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')
const POLL_INTERVAL_MS = 5000

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

Page({
  data: {
    userInfo: null,
    role: null,
    nickname: '',
    avatarText: '',
    maskedPhone: '',
    badgeCount: 0,
    badgeFlash: false,
    stats: [
      { label: '收藏', value: 0 },
      { label: '订单', value: 0 },
      { label: '通知', value: 0 },
    ],
    loading: false,
  },

  _pollTimer: null,

  async onShow() {
    if (getApp().globalData.role === 'teacher') {
      await getApp().refreshNewDemandsCount()
    } else {
      await getApp().refreshPendingCount()
    }
    this.syncSession()
    await this.loadStats()
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  async onPullDownRefresh() {
    await this.loadStats()
    wx.stopPullDownRefresh()
  },

  syncSession() {
    const app = getApp()
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      this.setData({ userInfo: null, role: null, badgeCount: 0 })
      this.stopPolling()
      return
    }
    const role = app.globalData.role
    const nickname = userInfo.nickname || (role === 'teacher' ? '老师' : '家长')
    const badgeCount = role === 'teacher'
      ? app.getUnreadNotificationCount() + app.globalData.newDemandsCount
      : app.globalData.pendingCount

    this.setData({
      userInfo,
      role,
      nickname,
      avatarText: nickname.slice(0, 1),
      maskedPhone: maskPhone(userInfo.phone),
      badgeCount,
    })
  },

  async loadStats(background = false) {
    const app = getApp()
    const { userId, role } = app.globalData
    if (!userId) return
    if (!background) this.setData({ loading: true })
    try {
      let nextStats = []
      let nextBadge = 0
      if (role === 'teacher') {
        const [appliesRes, messagesRes] = await Promise.all([
          api.listApplies({ teacher_user_id: userId }, true),
          api.getMessages({ user_id: userId }, true),
        ])
        const accepted = (appliesRes.data || []).filter(a => a.status === 'accepted').length
        const unread = (messagesRes.data || []).filter(m => !m.is_read).length + (app.globalData.newDemandsCount || 0)
        nextStats = [
          { label: '收藏', value: (app.globalData.favoriteDemandIds || []).length, badge: '收藏' },
          { label: '订单', value: accepted, badge: '已接单' },
          { label: '通知', value: unread, badge: '未读' },
        ]
        nextBadge = unread
      } else {
        const [demandsRes, appliesRes] = await Promise.all([
          api.listDemands(true),
          api.listApplies({}, true),
        ])
        const myDemands = (demandsRes.data || []).filter(d => d.user_id === userId)
        const ids = myDemands.map(d => d.id)
        const pending = (appliesRes.data || []).filter(a => ids.includes(a.demand_id) && a.status === 'pending').length
        const accepted = (appliesRes.data || []).filter(a => ids.includes(a.demand_id) && a.status === 'accepted').length
        app.globalData.pendingCount = pending
        nextStats = [
          { label: '收藏', value: (app.globalData.favoriteDemandIds || []).length + (app.globalData.favoriteTeacherIds || []).length, badge: '收藏' },
          { label: '订单', value: myDemands.length, badge: accepted > 0 ? ('已接单 ' + accepted) : '待处理' },
          { label: '通知', value: pending, badge: '待处理' },
        ]
        nextBadge = pending
      }

      let hasStatFlash = false
      nextStats = nextStats.map((item, index) => {
        const prev = this.data.stats[index]
        const flash = !!(prev && prev.value !== item.value)
        if (flash) hasStatFlash = true
        return { ...item, flash }
      })
      const badgeFlash = this.data.badgeCount !== nextBadge && nextBadge > 0

      this.setData({
        stats: nextStats,
        badgeCount: nextBadge,
        badgeFlash,
      })
      if (badgeFlash || hasStatFlash) {
        setTimeout(() => {
          const stats = this.data.stats.map(item => ({ ...item, flash: false }))
          this.setData({ badgeFlash: false, stats })
        }, 1000)
      }
    } catch (_) {
    } finally {
      if (!background) this.setData({ loading: false })
    }
  },

  startPolling() {
    this.stopPolling()
    this._pollTimer = setInterval(() => this.loadStats(true), POLL_INTERVAL_MS)
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  goLogin() {
    wx.reLaunch({ url: '/pages/login/login' })
  },

  goRecords() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders' })
  },

  goStat(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (index === 0) {
      this.goFavorites()
    } else if (index === 1) {
      this.goRecords()
    } else {
      this.goNotifications()
    }
  },

  goPublishDemand() {
    wx.navigateTo({ url: '/pages/publish-demand/publish-demand' })
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/teacher-profile/edit-teacher' })
  },

  showProfileInfo() {
    wx.showModal({
      title: '个人资料',
      content: `身份：${this.data.role === 'teacher' ? '老师' : '家长/学生'}\n手机号：${this.data.maskedPhone}`,
      confirmText: '知道了',
      showCancel: false,
    })
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders?favorites=1' })
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notifications/notifications' })
  },

  showTodo() {
    wx.showToast({ title: '功能暂未开放', icon: 'none' })
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出当前账号吗？',
      confirmText: '退出',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.stopPolling()
          getApp().logout()
        }
      },
    })
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
