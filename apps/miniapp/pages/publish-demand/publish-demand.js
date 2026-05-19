const { api, normalizeErrorMessage } = require('../../utils/request')

Page({
  data: {
    title: '',
    subject: '',
    grade_level: '',
    area: '',
    address: '',
    latitude: null,
    longitude: null,
    class_mode: '\u7ebf\u4e0b',
    description: '',
    contact_name: '',
    contact_phone: '',
    is_private: true,
    classModeOptions: ['\u7ebf\u4e0b', '\u7ebf\u4e0a', '\u5747\u53ef'],
    loading: false,
    fieldErrors: {},
  },

  onTitleInput(e) { this.setData({ title: e.detail.value, 'fieldErrors.title': '' }) },
  onSubjectInput(e) { this.setData({ subject: e.detail.value, 'fieldErrors.subject': '' }) },
  onGradeInput(e) { this.setData({ grade_level: e.detail.value, 'fieldErrors.grade_level': '' }) },
  onAreaInput(e) { this.setData({ area: e.detail.value, 'fieldErrors.area': '' }) },
  onAddressInput(e) { this.setData({ address: e.detail.value }) },
  onDescInput(e) { this.setData({ description: e.detail.value, 'fieldErrors.description': '' }) },
  onContactNameInput(e) { this.setData({ contact_name: e.detail.value, 'fieldErrors.contact_name': '' }) },
  onContactPhoneInput(e) { this.setData({ contact_phone: e.detail.value, 'fieldErrors.contact_phone': '' }) },

  selectClassMode(e) {
    this.setData({ class_mode: e.currentTarget.dataset.mode })
  },

  promptOpenLocationSetting() {
    wx.showModal({
      title: '\u9700\u8981\u4f4d\u7f6e\u6743\u9650',
      content: '\u8bf7\u5728\u8bbe\u7f6e\u4e2d\u5f00\u542f\u4f4d\u7f6e\u4fe1\u606f\u6743\u9650\u540e\uff0c\u518d\u9009\u62e9\u4e0a\u8bfe\u5730\u70b9\u3002',
      confirmText: '\u53bb\u8bbe\u7f6e',
      success: (modalRes) => {
        if (!modalRes.confirm) return
        wx.openSetting({
          success: (settingRes) => {
            const authSetting = (settingRes && settingRes.authSetting) || {}
            if (authSetting['scope.userLocation']) {
              wx.showToast({ title: '\u5df2\u5f00\u542f\u4f4d\u7f6e\u6743\u9650\uff0c\u8bf7\u91cd\u65b0\u9009\u62e9', icon: 'none' })
              return
            }
            wx.showToast({ title: '\u672a\u5f00\u542f\u4f4d\u7f6e\u6743\u9650\uff0c\u6682\u65f6\u65e0\u6cd5\u5b9a\u4f4d', icon: 'none' })
          },
          fail: (settingError) => {
            console.error('openSetting failed:', settingError)
            wx.showToast({ title: '\u65e0\u6cd5\u6253\u5f00\u8bbe\u7f6e\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5', icon: 'none' })
          },
        })
      },
    })
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          area: res.address || this.data.area,
          address: res.name ? `${res.name} ${res.address || ''}`.trim() : (res.address || ''),
          latitude: res.latitude,
          longitude: res.longitude,
          'fieldErrors.area': '',
        })
      },
      fail: (error) => {
        const errMsg = String((error && error.errMsg) || '')
        console.error('chooseLocation failed:', errMsg, error)

        if (/cancel/i.test(errMsg)) return

        if (/auth deny|auth denied|authorize no response|permission/i.test(errMsg)) {
          this.promptOpenLocationSetting()
          return
        }

        wx.showToast({ title: '\u5b9a\u4f4d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u5b9a\u4f4d\u670d\u52a1\u540e\u91cd\u8bd5', icon: 'none' })
      },
    })
  },

  clearLocation() {
    this.setData({
      address: '',
      latitude: null,
      longitude: null,
    })
  },

  validate() {
    const errors = {}
    const checks = [
      ['subject', '\u8bf7\u586b\u5199\u79d1\u76ee'],
      ['grade_level', '\u8bf7\u586b\u5199\u5e74\u7ea7'],
      ['title', '\u8bf7\u586b\u5199\u9700\u6c42\u6807\u9898'],
      ['area', '\u8bf7\u586b\u5199\u4e0a\u8bfe\u533a\u57df'],
      ['description', '\u8bf7\u586b\u5199\u8be6\u7ec6\u8bf4\u660e'],
      ['contact_name', '\u8bf7\u586b\u5199\u8054\u7cfb\u4eba'],
      ['contact_phone', '\u8bf7\u586b\u5199\u8054\u7cfb\u7535\u8bdd'],
    ]

    for (const [key, msg] of checks) {
      if (!(this.data[key] || '').trim()) {
        errors[key] = msg
      }
    }

    const phone = (this.data.contact_phone || '').trim()
    if (phone && !/^1\d{10}$/.test(phone)) {
      errors.contact_phone = '\u8bf7\u8f93\u5165\u6709\u6548\u7684 11 \u4f4d\u624b\u673a\u53f7'
    }

    if (Object.keys(errors).length > 0) {
      this.setData({ fieldErrors: errors })
      return false
    }
    return true
  },

  async handleSubmit() {
    if (!this.validate()) return
    this.setData({ loading: true, fieldErrors: {} })
    try {
      await api.createDemand({
        title: this.data.title.trim(),
        subject: this.data.subject.trim(),
        grade_level: this.data.grade_level.trim(),
        area: this.data.area.trim(),
        address: this.data.address.trim() || null,
        latitude: this.data.latitude,
        longitude: this.data.longitude,
        class_mode: this.data.class_mode,
        description: this.data.description.trim(),
        contact_name: this.data.contact_name.trim(),
        contact_phone: this.data.contact_phone.trim(),
      })
      wx.showToast({ title: '\u53d1\u5e03\u6210\u529f', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (error) {
      wx.showToast({ title: normalizeErrorMessage(error, '\u53d1\u5e03\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5'), icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
