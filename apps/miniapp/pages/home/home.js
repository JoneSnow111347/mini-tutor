const { confirmLogout } = require('../../utils/page')

Page({
  data: {
    isLoggedIn: false,
    role: null,
    nickname: null,
    pendingCount: 0,
    notificationCount: 0,
    studentNotifications: [],
  },

  onShow() {
    const app = getApp()
    const { userId, role, userInfo } = app.globalData
    const notifications = app.globalData.studentNotifications.slice().reverse().slice(0, 5)

    this.setData({
      isLoggedIn: !!userId,
      role: role || null,
      nickname: userInfo ? userInfo.nickname : null,
      pendingCount: app.globalData.pendingCount,
      notificationCount: app.getUnreadNotificationCount() + app.globalData.newDemandsCount,
      studentNotifications: notifications,
    })

    if (userId && (role === 'parent' || role === 'student' || role === 'both')) {
      app.refreshPendingCount()
        .then(() => this.setData({ pendingCount: app.globalData.pendingCount }))
        .catch(() => {})
    }

    if (userId && role === 'teacher') {
      app.refreshNewDemandsCount()
        .then(() => {
          this.setData({
            notificationCount: app.getUnreadNotificationCount() + app.globalData.newDemandsCount,
          })
        })
        .catch(() => {})
    }
  },

  async onPullDownRefresh() {
    const app = getApp()
    const { userId, role } = app.globalData
    if (userId && (role === 'parent' || role === 'student' || role === 'both')) {
      await app.refreshPendingCount().catch(() => {})
      this.setData({ pendingCount: app.globalData.pendingCount })
    }
    wx.stopPullDownRefresh()
  },

  goParentLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goTeacherLogin() {
    wx.navigateTo({ url: '/pages/login/login?role=teacher' })
  },

  goPublishDemand() {
    wx.navigateTo({ url: '/pages/publish-demand/publish-demand' })
  },

  goViewApplications() {
    wx.navigateTo({ url: '/pages/view-applications/view-applications' })
  },

  goTeacherProfile() {
    wx.navigateTo({ url: '/pages/teacher-profile/teacher-profile' })
  },

  goMyPage() {
    wx.navigateTo({ url: '/pages/my/my' })
  },

  goBrowseDemands() {
    wx.navigateTo({ url: '/pages/browse-demands/browse-demands' })
  },

  handleLogout() {
    confirmLogout(this)
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
