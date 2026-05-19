const { api, normalizeErrorMessage } = require('../../utils/request')

Page({
  data: {
    phone: '',
    password: '',
    confirmPassword: '',
    smsCode: '',
    role: 'parent',
    autoLogin: true,
    loading: false,
    sendingCode: false,
    sendCooldown: 0,
    message: '',
    feedbackType: '',
  },

  _cooldownTimer: null,

  onLoad(options) {
    if (options && (options.role === 'teacher' || options.role === 'parent')) {
      this.setData({ role: options.role })
    }
  },

  onUnload() {
    this.stopCooldown()
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

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value, message: '', feedbackType: '' })
  },

  onCodeInput(e) {
    this.setData({ smsCode: e.detail.value.trim(), message: '', feedbackType: '' })
  },

  validatePhone() {
    return /^1\d{10}$/.test(this.data.phone.trim())
  },

  validateForm() {
    const phone = this.data.phone.trim()
    const password = this.data.password.trim()
    const confirmPassword = this.data.confirmPassword.trim()
    const smsCode = this.data.smsCode.trim()

    if (!/^1\d{10}$/.test(phone)) return '请输入正确的 11 位手机号'
    if (password.length < 6) return '密码至少需要 6 位'
    if (password !== confirmPassword) return '两次输入的密码不一致'
    if (!/^\d{6}$/.test(smsCode)) return '请输入 6 位验证码'
    if (!this.data.role) return '请选择身份'
    return ''
  },

  async handleSendCode() {
    if (this.data.sendingCode || this.data.sendCooldown > 0) return
    if (!this.validatePhone()) {
      const message = '请先输入正确的手机号'
      this.setData({ message, feedbackType: 'error' })
      wx.showToast({ title: message, icon: 'none' })
      return
    }

    this.setData({ sendingCode: true, message: '', feedbackType: '' })
    try {
      const res = await api.sendSmsCode(this.data.phone.trim())
      const mockCode = res.data && res.data.mock_code
      const message = mockCode ? `开发验证码 ${mockCode}` : '验证码已发送'
      this.setData({ message, feedbackType: 'success' })
      wx.showToast({ title: '验证码已发送', icon: 'none', duration: 2200 })
      this.startCooldown(60)
    } catch (error) {
      const message = normalizeErrorMessage(error, '验证码发送失败，请重试')
      this.setData({ message, feedbackType: 'error' })
      wx.showToast({ title: message, icon: 'none' })
    } finally {
      this.setData({ sendingCode: false })
    }
  },

  startCooldown(seconds) {
    this.stopCooldown()
    this.setData({ sendCooldown: seconds })
    this._cooldownTimer = setInterval(() => {
      const next = this.data.sendCooldown - 1
      if (next <= 0) {
        this.stopCooldown()
        this.setData({ sendCooldown: 0 })
        return
      }
      this.setData({ sendCooldown: next })
    }, 1000)
  },

  stopCooldown() {
    if (this._cooldownTimer) {
      clearInterval(this._cooldownTimer)
      this._cooldownTimer = null
    }
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
      const phone = this.data.phone.trim()
      const password = this.data.password.trim()
      const role = this.data.role

      await api.verifySmsCode(phone, this.data.smsCode.trim())
      const res = await api.register({ phone, password, role })

      const payload = res.data
      const user = payload.user || payload
      const token = payload.token || user.token

      // setSession handles all storage writes — no pre-writes needed

      const successMessage = role === 'teacher' ? '注册成功，请继续完善老师资料' : '注册成功'
      this.setData({ message: successMessage, feedbackType: 'success' })
      wx.showToast({ title: successMessage, icon: 'success' })

      if (!this.data.autoLogin) {
        setTimeout(() => wx.redirectTo({ url: '/pages/login/login' }), 800)
        return
      }

      getApp().setSession(user, null)
      const url = role === 'teacher' ? '/pages/teacher-profile/edit-teacher' : '/pages/parent/parent'
      setTimeout(() => wx.reLaunch({ url }), 800)
    } catch (error) {
      const message = normalizeErrorMessage(error, '注册失败，请重试')
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
