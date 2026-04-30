const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')

function verificationText(status) {
  return { pending: '待认证', verified: '已认证', rejected: '已拒绝' }[status] || '未认证'
}

function formatPhone(phone) {
  return phone || '暂未填写'
}

Page({
  data: {
    teacher: null,
    user: null,
    readonly: false,
    loading: false,
    acceptedOrders: 0,
    teacherInitial: '师',
    phoneText: '暂未填写',
    verificationText: '未认证',
    bioText: '该教师还未填写简介',
  },

  _teacherId: null,
  _teacherUserId: null,

  onLoad(options) {
    this._teacherId = options.teacherId ? Number(options.teacherId) : null
    this._teacherUserId = options.userId ? Number(options.userId) : null
    this.setData({ readonly: options.readonly === '1' || !!this._teacherUserId })
    this.loadProfile()
  },

  onShow() {
    if (this.data.teacher) this.loadProfile(true)
  },

  async onPullDownRefresh() {
    await this.loadProfile()
    wx.stopPullDownRefresh()
  },

  async loadProfile(background = false) {
    const app = getApp()
    const ownTeacherId = app.globalData.teacherId
    let targetTeacherId = this._teacherId || (!this._teacherUserId ? ownTeacherId : null)

    if (!background) this.setData({ loading: true })
    try {
      let teacher = null
      if (targetTeacherId) {
        const teacherRes = await api.getTeacher(targetTeacherId)
        teacher = teacherRes.data
      } else {
        const teachersRes = await api.listTeachers(true)
        const targetUserId = this._teacherUserId || app.globalData.userId
        teacher = teachersRes.data.find(t => t.user_id === targetUserId) || null
      }

      if (!teacher) {
        wx.showToast({ title: this.data.readonly ? '未找到老师资料' : '请先完善老师资料', icon: 'none' })
        this.setData({ teacher: null })
        if (!this.data.readonly) {
          setTimeout(() => wx.redirectTo({ url: '/pages/teacher-profile/edit-teacher' }), 450)
        }
        return
      }

      const [userRes, appliesRes] = await Promise.all([
        api.getUser(teacher.user_id),
        api.listApplies({ teacher_user_id: teacher.user_id }, true),
      ])
      const acceptedOrders = appliesRes.data.filter(a => a.status === 'accepted').length
      const isOwnProfile =
        Number(app.globalData.teacherId) === Number(teacher.id) ||
        Number(app.globalData.userId) === Number(teacher.user_id)

      this._teacherId = Number(teacher.id)
      this._teacherUserId = Number(teacher.user_id)
      if (isOwnProfile) {
        app.globalData.teacherId = teacher.id
        wx.setStorageSync('teacherId', teacher.id)
      }
      this.setData({
        teacher,
        user: userRes.data,
        readonly: !isOwnProfile,
        acceptedOrders,
        teacherInitial: (teacher.real_name || '师').slice(0, 1),
        phoneText: formatPhone(teacher.phone || userRes.data.phone),
        verificationText: verificationText(teacher.verification_status),
        bioText: teacher.bio || '该教师还未填写简介',
      })
    } catch (_) {
    } finally {
      if (!background) this.setData({ loading: false })
    }
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/teacher-profile/edit-teacher' })
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
