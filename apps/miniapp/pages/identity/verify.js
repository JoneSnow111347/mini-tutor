const {
  api,
  uploadIdentityVerification,
  getUploadBaseUrl,
  normalizeErrorMessage,
} = require('../../utils/request')

function statusText(status) {
  return {
    approved: '已认证',
    pending: '审核中',
    rejected: '已驳回',
    unverified: '未认证',
  }[status] || '未认证'
}

Page({
  data: {
    user: null,
    phone: '',
    smsCode: '',
    smsVerified: false,
    verificationStatus: 'unverified',
    verificationStatusText: '未认证',
    reviewNote: '',
    currentRecord: null,
    documentType: 'student_id',
    selectedFilePath: '',
    selectedFileName: '',
    sendingCode: false,
    sendCooldown: 0,
    verifyingCode: false,
    submitting: false,
    loading: false,
  },

  _cooldownTimer: null,

  onShow() {
    this.loadState()
  },

  onUnload() {
    this.stopCooldown()
  },

  async onPullDownRefresh() {
    await this.loadState()
    wx.stopPullDownRefresh()
  },

  async loadState() {
    const app = getApp()
    const userId = app.globalData.userId
    if (!userId) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }

    this.setData({ loading: true })
    try {
      const [userRes, identityRes] = await Promise.all([
        api.getUser(userId),
        api.getMyIdentityVerification(true),
      ])

      const user = userRes.data
      const record = identityRes.data || null

      this.syncUserSession(user)
      this.setData({
        user,
        phone: user.phone || '',
        smsVerified: !!user.sms_verified,
        verificationStatus: user.identity_status || (record ? record.status : 'unverified'),
        verificationStatusText: statusText(user.identity_status || (record ? record.status : 'unverified')),
        currentRecord: record,
        reviewNote: (record && record.review_note) || '',
      })
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '加载失败，请重试'), icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  syncUserSession(user) {
    const app = getApp()
    const merged = { ...(app.globalData.userInfo || {}), ...user }
    app.globalData.userInfo = merged
    wx.setStorageSync('userInfo', merged)
  },

  onCodeInput(e) {
    this.setData({ smsCode: e.detail.value.trim() })
  },

  selectDocumentType(e) {
    this.setData({ documentType: e.currentTarget.dataset.value })
  },

  async handleSendCode() {
    if (this.data.sendCooldown > 0 || this.data.sendingCode) return
    if (!/^1\d{10}$/.test(this.data.phone)) {
      wx.showToast({ title: '请输入有效手机号', icon: 'none' })
      return
    }

    this.setData({ sendingCode: true })
    try {
      const res = await api.sendSmsCode(this.data.phone)
      const mockCode = res.data && res.data.mock_code
      if (mockCode) console.log('[dev] SMS mock code:', mockCode)
      wx.showToast({
        title: '验证码已发送',
        icon: 'none',
        duration: 2500,
      })
      this.startCooldown(60)
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '发送失败，请重试'), icon: 'none' })
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

  async handleVerifyCode() {
    if (this.data.verifyingCode || this.data.smsVerified) return
    if (!/^\d{6}$/.test(this.data.smsCode)) {
      wx.showToast({ title: '请输入 6 位验证码', icon: 'none' })
      return
    }

    this.setData({ verifyingCode: true })
    try {
      await api.verifySmsCode(this.data.phone, this.data.smsCode)
      wx.showToast({ title: '短信验证成功', icon: 'success' })
      this.setData({ smsVerified: true })
      await this.loadState()
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '验证码无效'), icon: 'none' })
    } finally {
      this.setData({ verifyingCode: false })
    }
  },

  chooseProof() {
    if (this.data.verificationStatus === 'pending' || this.data.verificationStatus === 'approved') {
      wx.showToast({ title: '当前状态不可重复提交', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
          wx.showToast({ title: '图片不能超过 5MB', icon: 'none' })
          return
        }
        this.setData({
          selectedFilePath: file.tempFilePath,
          selectedFileName: file.tempFilePath.split('/').pop(),
        })
      },
    })
  },

  async submitVerification() {
    if (!this.data.smsVerified) {
      wx.showToast({ title: '请先完成短信验证', icon: 'none' })
      return
    }
    if (!this.data.selectedFilePath) {
      wx.showToast({ title: '请先选择证明图片', icon: 'none' })
      return
    }
    if (this.data.submitting) return

    this.setData({ submitting: true })
    try {
      await uploadIdentityVerification({
        filePath: this.data.selectedFilePath,
        documentType: this.data.documentType,
      })
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
      this.setData({ selectedFilePath: '', selectedFileName: '' })
      await this.loadState()
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '提交失败，请重试'), icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  previewCurrentProof() {
    if (!this.data.currentRecord || !this.data.currentRecord.file_url) return
    wx.previewImage({
      urls: [
        this.data.currentRecord.file_url.startsWith('http')
          ? this.data.currentRecord.file_url
          : `${getUploadBaseUrl()}${this.data.currentRecord.file_url}`,
      ],
    })
  },
})
