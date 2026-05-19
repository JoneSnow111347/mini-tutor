const { confirmLogout } = require('../../utils/page')
const { api, normalizeErrorMessage } = require('../../utils/request')

const POLL_INTERVAL_MS = 5000

function text(key) {
  return {
    pending: '待处理',
    accepted: '已接单',
    rejected: '未通过',
    invalidParams: '参数错误',
    alreadyApplied: '您已申请过该需求',
    applySuccess: '申请成功，等待家长审核',
    acceptedToast: '恭喜，您的申请已被接受',
    rejectedToast: '申请未通过，您可以继续申请其他需求',
    notVerified: '仅已认证老师可以申请需求',
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
    teacherProfile: null,
    canApply: false,
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
      const userId = getApp().globalData.userId
      const [demandRes, appliesRes, teachersRes] = await Promise.all([
        api.getDemand(this._demandId),
        api.listApplies({ teacher_user_id: userId }, true),
        api.listTeachers(true),
      ])

      const demand = demandRes.data
      const myApply = (appliesRes.data || []).find((item) => Number(item.demand_id) === Number(this._demandId))
      const teacherProfile = (teachersRes.data || []).find((item) => Number(item.user_id) === Number(userId)) || null
      const canApply = !!teacherProfile && teacherProfile.verification_status === 'verified'

      this.setData({
        demand,
        teacherProfile,
        canApply,
      })

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
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '加载失败，请重试'), icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onMessageInput(e) {
    this.setData({ message: e.detail.value })
  },

  openDemandLocation() {
    const { demand } = this.data
    if (!demand || demand.latitude === null || demand.longitude === null || demand.latitude === undefined || demand.longitude === undefined) {
      wx.showToast({ title: '该需求未填写地图位置', icon: 'none' })
      return
    }

    wx.openLocation({
      latitude: Number(demand.latitude),
      longitude: Number(demand.longitude),
      name: demand.title || '家教需求位置',
      address: demand.address || demand.area || '',
      scale: 16,
    })
  },

  async handleApply() {
    if (!this.data.canApply) {
      wx.showToast({ title: text('notVerified'), icon: 'none' })
      return
    }
    if (this.data.alreadyApplied) {
      wx.showToast({ title: text('alreadyApplied'), icon: 'none' })
      return
    }
    this.setData({ submitting: true })

    try {
      const res = await api.createApply({
        demand_id: this._demandId,
        message: this.data.message.trim() || null,
      })

      this.setData({
        alreadyApplied: true,
        applyStatus: 'pending',
        myApply: res.data,
      })
      wx.showToast({ title: text('applySuccess'), icon: 'success', duration: 2000 })
      this._startPolling()
    } catch (error) {
      const message = normalizeErrorMessage(error, '申请失败，请重试')
      if (message.includes('Only verified teachers')) {
        wx.showToast({ title: text('notVerified'), icon: 'none' })
      } else if (message.includes('Already applied')) {
        this.setData({ alreadyApplied: true, applyStatus: 'pending' })
      } else {
        wx.showToast({ title: message, icon: 'none' })
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
      const myApply = (ar.data || []).find((item) => Number(item.demand_id) === Number(this._demandId))
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
        wx.showToast({ title: text('acceptedToast'), icon: 'success', duration: 3000 })
      } else if (newStatus === 'rejected') {
        this._stopPolling()
        getApp().addStudentNotification({
          applyId: myApply.id,
          demandId: this._demandId,
          status: 'rejected',
          demandTitle: (this.data.demand && this.data.demand.title) || '',
        })
        wx.showToast({ title: text('rejectedToast'), icon: 'none', duration: 3000 })
      }
    } catch (_) {}
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },

  goEditTeacher() {
    wx.navigateTo({ url: '/pages/teacher-profile/edit-teacher' })
  },
})
