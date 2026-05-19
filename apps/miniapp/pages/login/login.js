const { api, normalizeErrorMessage } = require('../../utils/request')

Page({
  data: {
    role: 'parent',
    phone: '',
    password: '',
    message: '',
    feedbackType: '',
    loading: false,
  },

  onLoad(options) {
    if (options && options.role === 'teacher') {
      this.setData({ role: 'teacher' })
    }
  },

  selectRole(e) {
    this.setData({ role: e.currentTarget.dataset.role, message: '', feedbackType: '' })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value, message: '', feedbackType: '' })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value, message: '', feedbackType: '' })
  },

  validateForm() {
    const phone = this.data.phone.trim()
    const password = this.data.password.trim()
    if (!/^1\d{10}$/.test(phone)) return '请输入正确的 11 位手机号'
    if (password.length < 6) return '密码至少需要 6 位'
    return ''
  },

  async handleLogin() {
    const error = this.validateForm()
    if (error) {
      this.setData({ message: error, feedbackType: 'error' })
      return
    }

    this.setData({ loading: true, message: '', feedbackType: '' })
    try {
      const loginRes = await api.login(this.data.phone.trim(), this.data.password.trim())
      const payload = loginRes.data
      const user = payload.user || payload
      const token = payload.token || user.token

      // setSession handles all storage writes — no pre-writes needed

      if (this.data.role === 'teacher') {
        if (!['teacher', 'both'].includes(user.role)) {
          const message = '该手机号不是老师账号，请切换为家长身份登录'
          this.setData({ message, feedbackType: 'error' })
          wx.showToast({ title: message, icon: 'none' })
          return
        }

        const teacherListRes = await api.listTeachers(true)
        const teacherRecord = (teacherListRes.data || []).find((item) => Number(item.user_id) === Number(user.id))

        getApp().setSession(user, teacherRecord ? teacherRecord.id : null)
        wx.reLaunch({
          url: teacherRecord ? '/pages/teacher/teacher' : '/pages/teacher-profile/edit-teacher',
        })
        return
      }

      if (['teacher', 'both'].includes(user.role)) {
        const message = '该手机号是老师账号，请切换到老师身份登录'
        this.setData({ message, feedbackType: 'error' })
        wx.showToast({ title: message, icon: 'none' })
        return
      }

      getApp().setSession(user)
      await getApp().refreshPendingCount()
      wx.reLaunch({ url: '/pages/parent/parent' })
    } catch (error) {
      this.setData({
        message: normalizeErrorMessage(error, '登录失败，请检查手机号和密码后重试'),
        feedbackType: 'error',
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register?role=' + this.data.role })
  },
})
