const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')

const POLL_INTERVAL_MS = 5000

function text(key) {
  return {
    pending: '\u5f85\u5904\u7406',
    accepted: '\u5df2\u63a5\u5355',
    rejected: '\u672a\u901a\u8fc7',
    invalidParams: '\u53c2\u6570\u9519\u8bef',
    alreadyApplied: '\u60a8\u5df2\u7533\u8bf7\u8fc7\u8be5\u9700\u6c42',
    applySuccess: '\u7533\u8bf7\u6210\u529f\uff0c\u7b49\u5f85\u5bb6\u957f\u5ba1\u6838',
    acceptedToast: '\u606d\u559c\uff0c\u60a8\u7684\u7533\u8bf7\u5df2\u88ab\u63a5\u53d7',
    rejectedToast: '\u7533\u8bf7\u672a\u901a\u8fc7\uff0c\u60a8\u53ef\u4ee5\u7ee7\u7eed\u7533\u8bf7\u5176\u4ed6\u9700\u6c42',
  }[key]
}

Page({
  data: {
    demand: null,
    message: '',
    loading: false,
    submitting: false,
    alreadyApplied: false,
    applyStatus: null,
    myApply: null,
  },

  _pollTimer: null,
  _demandId: null,

  onLoad(options) {
    const demandId = options.demandId || getApp().globalData.currentDemandId
    if (!demandId) {
      wx.showToast({ title: text('invalidParams'), icon: 'none' })
      wx.navigateBack()
      return
    }
    this._demandId = Number(demandId)
    this._loadData()
  },

  onShow() {
    if (this.data.applyStatus === 'pending') {
      this._startPolling()
    }
  },

  async onPullDownRefresh() {
    await this._loadData()
    wx.stopPullDownRefresh()
  },

  onHide() {
    this._stopPolling()
  },

  onUnload() {
    this._stopPolling()
  },

  async _loadData() {
    this.setData({ loading: true })
    try {
      const dr = await api.getDemand(this._demandId)
      this.setData({ demand: dr.data })

      const userId = getApp().globalData.userId
      const ar = await api.listApplies({ teacher_user_id: userId })
      const myApply = ar.data.find(a => a.demand_id === this._demandId)

      if (myApply) {
        this.setData({
          alreadyApplied: true,
          applyStatus: myApply.status,
          myApply,
        })
        if (myApply.status === 'pending') {
          this._startPolling()
        }
      } else {
        this.setData({ alreadyApplied: false, applyStatus: null, myApply: null })
      }
    } catch (_) {
    } finally {
      this.setData({ loading: false })
    }
  },

  onMessageInput(e) {
    this.setData({ message: e.detail.value })
  },

  async handleApply() {
    if (this.data.alreadyApplied) {
      wx.showToast({ title: text('alreadyApplied'), icon: 'none' })
      return
    }
    this.setData({ submitting: true })

    try {
      const res = await api.createApply({
        demand_id: this._demandId,
        teacher_user_id: getApp().globalData.userId,
        message: this.data.message.trim() || null,
      })

      this.setData({
        alreadyApplied: true,
        applyStatus: 'pending',
        myApply: res.data,
      })
      wx.showToast({ title: text('applySuccess'), icon: 'success', duration: 2000 })
      this._startPolling()
    } catch (err) {
      const msg = (err && err.message) || ''
      if (msg.includes('Already applied') || msg.includes(text('alreadyApplied'))) {
        this.setData({ alreadyApplied: true, applyStatus: 'pending' })
      }
    } finally {
      this.setData({ submitting: false })
    }
  },

  _startPolling() {
    this._stopPolling()
    this._pollTimer = setInterval(() => {
      this._pollStatus()
    }, POLL_INTERVAL_MS)
  },

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  async _pollStatus() {
    try {
      const userId = getApp().globalData.userId
      const ar = await api.listApplies({ teacher_user_id: userId }, true)
      const myApply = ar.data.find(a => a.demand_id === this._demandId)

      if (!myApply) return

      const prevStatus = this.data.applyStatus
      const newStatus = myApply.status
      if (newStatus === prevStatus) return

      this.setData({ applyStatus: newStatus, myApply })

      if (newStatus === 'accepted') {
        this._stopPolling()
        getApp().addStudentNotification({
          applyId: myApply.id,
          demandId: this._demandId,
          status: 'accepted',
          demandTitle: (this.data.demand && this.data.demand.title) || '',
        })
        wx.showToast({
          title: text('acceptedToast'),
          icon: 'success',
          duration: 3000,
        })
      } else if (newStatus === 'rejected') {
        this._stopPolling()
        getApp().addStudentNotification({
          applyId: myApply.id,
          demandId: this._demandId,
          status: 'rejected',
          demandTitle: (this.data.demand && this.data.demand.title) || '',
        })
        wx.showToast({
          title: text('rejectedToast'),
          icon: 'none',
          duration: 3000,
        })
      }
    } catch (_) {
    }
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})