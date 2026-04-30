const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')

function verificationText(status) {
  return { pending: '待认证', verified: '已认证', rejected: '审核未通过' }[status] || '待认证'
}

Page({
  data: {
    loading: false,
    submitting: false,
    hasProfile: false,
    teacherId: null,
    userPhone: '',
    acceptedOrders: 0,

    real_name: '',
    teaching_subjects: '',
    phone: '',
    verification_status: 'pending',
    verificationOptions: [
      { value: 'pending', label: '待认证' },
      { value: 'verified', label: '已认证' },
      { value: 'rejected', label: '审核未通过' },
    ],
    bio: '',
    is_public: true,
    verificationText: '待认证',
  },

  onLoad() {
    this.loadProfile()
  },

  async onPullDownRefresh() {
    await this.loadProfile()
    wx.stopPullDownRefresh()
  },

  async loadProfile() {
    const app = getApp()
    const userId = app.globalData.userId
    if (!userId) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }

    this.setData({ loading: true })
    try {
      const [teachersRes, appliesRes] = await Promise.all([
        api.listTeachers(true),
        api.listApplies({ teacher_user_id: userId }, true),
      ])
      const teacher = teachersRes.data.find(t => t.user_id === userId) || null
      const user = app.globalData.userInfo || {}
      const acceptedOrders = appliesRes.data.filter(a => a.status === 'accepted').length
      if (teacher) {
        app.globalData.teacherId = teacher.id
        wx.setStorageSync('teacherId', teacher.id)
      }

      this.setData({
        hasProfile: !!teacher,
        teacherId: teacher ? teacher.id : null,
        userPhone: user.phone || '',
        acceptedOrders,
        real_name: teacher ? (teacher.real_name || '') : '',
        teaching_subjects: teacher ? (teacher.teaching_subjects || '') : '',
        phone: teacher ? (teacher.phone || user.phone || '') : (user.phone || ''),
        verification_status: teacher ? (teacher.verification_status || 'pending') : 'pending',
        bio: teacher ? (teacher.bio || '') : '',
        is_public: teacher ? teacher.is_public !== false : true,
        verificationText: verificationText(teacher ? teacher.verification_status : 'pending'),
      })
    } catch (_) {
    } finally {
      this.setData({ loading: false })
    }
  },

  onNameInput(e) {
    this.setData({ real_name: e.detail.value })
  },

  onSubjectsInput(e) {
    this.setData({ teaching_subjects: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  selectVerification(e) {
    const status = e.currentTarget.dataset.status
    this.setData({
      verification_status: status,
      verificationText: verificationText(status),
    })
  },

  onBioInput(e) {
    this.setData({ bio: e.detail.value })
  },

  onPublicChange(e) {
    this.setData({ is_public: e.detail.value })
  },

  validateForm() {
    if (!(this.data.real_name || '').trim()) return '请输入真实姓名'
    if (!(this.data.teaching_subjects || '').trim()) return '请输入教学科目'
    if (!/^1\d{10}$/.test((this.data.phone || '').trim())) return '请输入有效的手机号'
    return ''
  },

  async saveProfile() {
    const error = this.validateForm()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }

    const payload = {
      user_id: getApp().globalData.userId,
      real_name: this.data.real_name.trim(),
      teaching_subjects: this.data.teaching_subjects.trim(),
      verification_status: this.data.verification_status || 'pending',
      is_public: this.data.is_public,
      bio: this.data.bio.trim(),
      phone: this.data.phone.trim(),
    }

    this.setData({ submitting: true })
    try {
      const res = this.data.hasProfile
        ? await api.updateTeacher(this.data.teacherId, payload)
        : await api.createTeacher(payload)

      const teacher = res.data
      getApp().globalData.teacherId = teacher.id
      wx.setStorageSync('teacherId', teacher.id)
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/teacher/teacher' })
      }, 700)
    } catch (_) {
    } finally {
      this.setData({ submitting: false })
    }
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
