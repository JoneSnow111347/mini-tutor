const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')

Page({
  data: {
    title: '',
    subject: '',
    grade_level: '',
    area: '',
    class_mode: '线下',
    description: '',
    contact_name: '',
    contact_phone: '',
    is_private: true,
    classModeOptions: ['线下', '线上', '均可'],
    loading: false,
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }) },
  onSubjectInput(e) { this.setData({ subject: e.detail.value }) },
  onGradeInput(e) { this.setData({ grade_level: e.detail.value }) },
  onAreaInput(e) { this.setData({ area: e.detail.value }) },
  onDescInput(e) { this.setData({ description: e.detail.value }) },
  onContactNameInput(e) { this.setData({ contact_name: e.detail.value }) },
  onContactPhoneInput(e) { this.setData({ contact_phone: e.detail.value }) },

  selectClassMode(e) {
    this.setData({ class_mode: e.currentTarget.dataset.mode })
  },

  togglePrivacy(e) {
    this.setData({ is_private: e.detail.value })
  },

  validate() {
    const required = [
      ['title', '标题'],
      ['subject', '科目'],
      ['grade_level', '年级'],
      ['area', '上课区域'],
      ['description', '详细说明'],
      ['contact_name', '联系人'],
      ['contact_phone', '联系电话'],
    ]
    for (const [key, label] of required) {
      if (!(this.data[key] || '').trim()) {
        wx.showToast({ title: `请填写${label}`, icon: 'none' })
        return false
      }
    }
    if (!/^1\d{10}$/.test(this.data.contact_phone.trim())) {
      wx.showToast({ title: '请输入有效的联系电话', icon: 'none' })
      return false
    }
    return true
  },

  async handleSubmit() {
    if (!this.validate()) return
    this.setData({ loading: true })
    try {
      await api.createDemand({
        user_id: getApp().globalData.userId,
        title: this.data.title.trim(),
        subject: this.data.subject.trim(),
        grade_level: this.data.grade_level.trim(),
        area: this.data.area.trim(),
        class_mode: this.data.class_mode,
        description: this.data.description.trim(),
        contact_name: this.data.contact_name.trim(),
        contact_phone: this.data.contact_phone.trim(),
      })
      wx.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (_) {
    } finally {
      this.setData({ loading: false })
    }
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})
