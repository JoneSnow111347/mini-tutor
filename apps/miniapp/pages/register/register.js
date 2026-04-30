const { api } = require('../../utils/request')

Page({
  data: {
    phone: '',
    password: '',
    role: 'parent',
    autoLogin: true,
    loading: false,
    message: '',
    feedbackType: '',
  },

  selectRole(e) {
    this.setData({
      role: e.currentTarget.dataset.role,
      message: '',
      feedbackType: '',
    })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value, message: '', feedbackType: '' })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value, message: '', feedbackType: '' })
  },

  onAutoLoginChange(e) {
    this.setData({ autoLogin: e.detail.value })
  },

  validateForm() {
    const phone = this.data.phone.trim()
    const password = this.data.password.trim()

    if (!/^1\d{10}$/.test(phone)) return '请输入正确的 11 位手机号'
    if (password.length < 6) return '密码至少需要 6 位'
    if (!this.data.role) return '请选择身份'
    return ''
  },

  async handleRegister() {
    const error = this.validateForm()
    if (error) {
      this.setData({ message: error, feedbackType: 'error' })
      wx.showToast({ title: error, icon: 'none' })
      return
    }

    this.setData({ loading: true, message: '', feedbackType: '' })
    try {
      const role = this.data.role === 'student' ? 'parent' : this.data.role
      const res = await api.register({
        phone: this.data.phone.trim(),
        password: this.data.password.trim(),
        role,
      })

      wx.showToast({ title: '注册成功', icon: 'success' })
      this.setData({ message: '注册成功', feedbackType: 'success' })

      const payload = res.data
      const user = payload.user || payload
      const token = payload.token || user.token

      console.log('REGISTER RESPONSE:', res)
      console.log('TOKEN:', token)

      if (token) {
        wx.setStorageSync('token', token)
      }
      wx.setStorageSync('user', user)

if (!this.data.autoLogin) {        setTimeout(() => wx.redirectTo({ url: '/pages/login/login' }), 800)
        return
      }

      getApp().setSession(user, null)
      const url = this.data.role === 'teacher' ? '/pages/teacher-profile/edit-teacher' : '/pages/parent/parent'
      setTimeout(() => wx.reLaunch({ url }), 800)
    } catch (error) {
      const message = (error && error.message) || '注册失败，请稍后重试'
      this.setData({ message, feedbackType: 'error' })
      wx.showToast({ title: message, icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  goLogin() {
    wx.redirectTo({ url: '/pages/login/login' })
  },
})
