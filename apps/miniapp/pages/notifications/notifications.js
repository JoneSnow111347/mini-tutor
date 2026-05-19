const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')
const POLL_INTERVAL_MS = 5000

const TYPE_TITLE = {
  apply_submitted: { teacher: '申请已提交', parent: '新申请通知' },
  apply_accepted:  { teacher: '申请已通过', parent: '申请已接受' },
  apply_rejected:  { teacher: '申请未通过', parent: '申请未通过' },
}

const TYPE_BADGE = {
  apply_submitted: 'badge-applied',
  apply_accepted:  'badge-accepted',
  apply_rejected:  'badge-rejected',
}

const APPLY_STATUS_TEXT = {
  pending: '待处理',
  accepted: '已接受',
  rejected: '已拒绝',
}

const APPLY_STATUS_BADGE = {
  pending: 'badge-applied',
  accepted: 'badge-accepted',
  rejected: 'badge-rejected',
}

const TYPE_STATUS_TEXT = {
  apply_submitted: '待处理',
  apply_accepted:  '已接单',
  apply_rejected:  '未通过',
}

Page({
  data: {
    role: null,
    notifications: [],
    loading: false,
    unreadCount: 0,
    newBadge: false,
  },

  _pollTimer: null,
  _lastIds: '',

  async onShow() {
    const app = getApp()
    const role = app.globalData.role || 'parent'
    this.setData({ role, loading: true })
    await this._loadNotifications(app)
    this._startPolling()
  },

  onHide() {
    this._stopPolling()
  },

  onUnload() {
    this._stopPolling()
  },

  async onPullDownRefresh() {
    await this._loadNotifications(getApp())
    wx.stopPullDownRefresh()
  },

  async _loadNotifications(app) {
    const userId = app.globalData.userId
    const role = app.globalData.role || 'parent'
    if (!userId) { this.setData({ loading: false }); return }
    try {
      const res = await api.getMessages({ user_id: userId }, true)
      const msgs = res.data || []
      let applyStatusById = {}

      try {
        const appliesRes = await api.listApplies({}, true)
        applyStatusById = (appliesRes.data || []).reduce((acc, item) => {
          if (item && item.id) acc[item.id] = item.status
          return acc
        }, {})
      } catch (_) {}

      const raw = msgs.map(m => {
        const currentStatus = m.apply_id ? applyStatusById[m.apply_id] : ''
        return {
        id:         m.id,
        applyId:    m.apply_id,
        demandId:   m.demand_id,
        type:       m.type,
        title:      (TYPE_TITLE[m.type] || {})[role] || m.type,
        body:       m.content,
        statusText: currentStatus ? (APPLY_STATUS_TEXT[currentStatus] || TYPE_STATUS_TEXT[m.type] || '') : (TYPE_STATUS_TEXT[m.type] || ''),
        badgeClass: currentStatus ? (APPLY_STATUS_BADGE[currentStatus] || TYPE_BADGE[m.type] || 'badge-open') : (TYPE_BADGE[m.type] || 'badge-open'),
        timeText:   m.createdAt ? m.createdAt.slice(0, 10) : '',
        unread:     !m.is_read,
        }
      })

      const ids = raw.map(n => n.id).join('|')
      const changed = !!(this._lastIds && this._lastIds !== ids)
      this._lastIds = ids
      const unreadCount = raw.filter(n => n.unread).length

      this.setData({ notifications: raw, unreadCount, loading: false })

      if (unreadCount > 0 || changed) {
        this.setData({ newBadge: true })
        setTimeout(() => this.setData({ newBadge: false }), 1000)
      }

      if (role === 'teacher') {
        app.globalData.studentNotifications = raw
          .filter(n => n.unread)
          .map(n => ({ applyId: n.applyId, demandId: n.demandId, type: n.type, read: false }))
      } else {
        app.globalData.pendingCount = unreadCount
      }
    } catch (_) {
      this.setData({ notifications: [], loading: false })
    }
  },

  async markAllRead() {
    const app = getApp()
    const userId = app.globalData.userId
    if (!userId) return
    const unreadIds = this.data.notifications.filter(n => n.unread).map(n => n.id)
    if (unreadIds.length === 0) return

    api.markMessagesRead({ user_id: userId, ids: unreadIds }).catch(() => {})

    const notifications = this.data.notifications.map(n => ({ ...n, unread: false }))
    this.setData({ notifications, unreadCount: 0, newBadge: true })
    setTimeout(() => this.setData({ newBadge: false }), 800)

    if (app.globalData.role === 'teacher') {
      app.globalData.studentNotifications = []
    } else {
      app.globalData.pendingCount = 0
    }
  },

  goApplyDetail(e) {
    const applyId  = e.currentTarget.dataset.applyId
    const demandId = e.currentTarget.dataset.demandId
    if (this.data.role === 'parent') {
      getApp().globalData.currentApplyId  = applyId
      getApp().globalData.currentDemandId = demandId
      wx.navigateTo({ url: `/pages/view-applications/view-applications?demandId=${demandId}` })
    } else {
      wx.navigateTo({ url: `/pages/apply-demand/apply-demand?demandId=${demandId}` })
    }
  },

  _startPolling() {
    this._stopPolling()
    this._pollTimer = setInterval(async () => {
      await this._loadNotifications(getApp())
    }, POLL_INTERVAL_MS)
  },

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
