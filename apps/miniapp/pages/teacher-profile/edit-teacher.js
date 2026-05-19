const { confirmLogout } = require('../../utils/page')
const {
  api,
  uploadIdentityVerification,
  getUploadBaseUrl,
  normalizeErrorMessage,
} = require('../../utils/request')

function verificationText(status) {
  return {
    unverified: '未认证',
    pending: '审核中',
    approved: '已认证',
    rejected: '审核未通过',
  }[status] || '未认证'
}

Page({
  data: {
    loading: false,
    submitting: false,
    submittingProof: false,
    hasProfile: false,
    teacherId: null,
    real_name: '',
    teaching_subjects: '',
    phone: '',
    bio: '',
    is_public: true,
    identityStatus: 'unverified',
    verificationText: '未认证',
    currentRecord: null,
    reviewNote: '',
    documentType: 'student_id',
    selectedFilePath: '',
    selectedFileName: '',
  },

  onLoad() {
    this.loadProfile()
  },

  async onPullDownRefresh() {
    await this.loadProfile()
    wx.stopPullDownRefresh()
  },

  syncUserSession(user) {
    const app = getApp()
    const merged = { ...(app.globalData.userInfo || {}), ...user }
    app.globalData.userInfo = merged
    wx.setStorageSync('userInfo', merged)
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
      const [teachersRes, userRes, identityRes] = await Promise.all([
        api.listTeachers(true),
        api.getUser(userId),
        api.getMyIdentityVerification(true),
      ])

      const teacher = (teachersRes.data || []).find((item) => Number(item.user_id) === Number(userId)) || null
      const user = userRes.data
      const record = identityRes.data || null

      this.syncUserSession(user)
      if (teacher) {
        app.globalData.teacherId = teacher.id
        wx.setStorageSync('teacherId', teacher.id)
      }

      this.setData({
        hasProfile: !!teacher,
        teacherId: teacher ? teacher.id : null,
        real_name: teacher ? (teacher.real_name || '') : '',
        teaching_subjects: teacher ? (teacher.teaching_subjects || '') : '',
        phone: teacher ? (teacher.phone || user.phone || '') : (user.phone || ''),
        bio: teacher ? (teacher.bio || '') : '',
        is_public: teacher ? teacher.is_public !== false : true,
        identityStatus: user.identity_status || 'unverified',
        verificationText: verificationText(user.identity_status || 'unverified'),
        currentRecord: record,
        reviewNote: (record && record.review_note) || '',
      })
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '加载失败，请重试'), icon: 'none' })
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

  onBioInput(e) {
    this.setData({ bio: e.detail.value })
  },

  onPublicChange(e) {
    this.setData({ is_public: e.detail.value })
  },

  selectDocumentType(e) {
    this.setData({ documentType: e.currentTarget.dataset.value })
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
      real_name: this.data.real_name.trim(),
      teaching_subjects: this.data.teaching_subjects.trim(),
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
      wx.showToast({ title: '资料已保存', icon: 'success' })
      this.setData({ hasProfile: true, teacherId: teacher.id })
      await this.loadProfile()
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '保存失败，请重试'), icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  chooseProof() {
    if (this.data.identityStatus === 'pending') {
      wx.showToast({ title: '材料审核中，暂时不能重复提交', icon: 'none' })
      return
    }
    if (this.data.identityStatus === 'approved') {
      wx.showToast({ title: '已认证，无需重复提交', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
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
    if (!this.data.hasProfile) {
      wx.showToast({ title: '请先保存老师资料', icon: 'none' })
      return
    }
    if (!this.data.selectedFilePath) {
      wx.showToast({ title: '请先拍照或选择证件图片', icon: 'none' })
      return
    }
    if (this.data.submittingProof) return

    this.setData({ submittingProof: true })
    try {
      await uploadIdentityVerification({
        filePath: this.data.selectedFilePath,
        documentType: this.data.documentType,
      })
      wx.showToast({ title: '材料已提交，等待后台审核', icon: 'success' })
      this.setData({ selectedFilePath: '', selectedFileName: '' })
      await this.loadProfile()
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '提交失败，请重试'), icon: 'none' })
    } finally {
      this.setData({ submittingProof: false })
    }
  },

  previewCurrentProof() {
    if (!this.data.currentRecord || !this.data.currentRecord.file_url) return
    const url = this.data.currentRecord.file_url.startsWith('http')
      ? this.data.currentRecord.file_url
      : `${getUploadBaseUrl()}${this.data.currentRecord.file_url}`
    wx.previewImage({ urls: [url] })
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
