const { api } = require('../../utils/request')

function statusText(status) {
  return {
    pending: '\u5f85\u5904\u7406',
    accepted: '\u5df2\u63a5\u5355',
    rejected: '\u672a\u901a\u8fc7',
  }[status] || status
}

Page({
  data: {
    apply: null,
    demand: null,
    teacher: null,
    teacherInitial: '\u5e08',
    teacherFallback: '\u8001\u5e08 #',
    loading: false,
    submitting: false,
  },

  onLoad(options) {
    const applyId = options.applyId || getApp().globalData.currentApplyId
    if (!applyId) {
      wx.showToast({ title: '\u7f3a\u5c11\u7533\u8bf7\u53c2\u6570', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.loadApply(Number(applyId))
  },

  async loadApply(applyId) {
    this.setData({ loading: true })
    try {
      const [applyRes, teachersRes] = await Promise.all([
        api.getApply(applyId),
        api.listTeachers(true),
      ])
      const apply = {
        ...applyRes.data,
        statusText: statusText(applyRes.data.status),
        dateText: applyRes.data.createdAt ? applyRes.data.createdAt.slice(0, 10) : '',
      }
      const teacher = teachersRes.data.find(t => t.user_id === apply.teacher_user_id) || null
      const teacherInitial = teacher && teacher.real_name ? teacher.real_name.slice(0, 1) : '\u5e08'
      const demandRes = await api.getDemand(apply.demand_id)
      this.setData({ apply, teacher, teacherInitial, demand: demandRes.data })
    } catch (_) {
    } finally {
      this.setData({ loading: false })
    }
  },

  confirmAccept() {
    this.decide('accepted', '\u63a5\u53d7')
  },

  confirmReject() {
    this.decide('rejected', '\u62d2\u7edd')
  },

  decide(status, label) {
    wx.showModal({
      title: `\u786e\u8ba4${label}`,
      content: status === 'accepted'
        ? '\u63a5\u53d7\u540e\u8001\u5e08\u5c06\u83b7\u5f97\u4f60\u7684\u8054\u7cfb\u65b9\u5f0f\uff0c\u53ef\u4ee5\u5f00\u59cb\u6c9f\u901a\u3002'
        : '\u62d2\u7edd\u540e\u8be5\u8001\u5e08\u5c06\u65e0\u6cd5\u7ee7\u7eed\u7533\u8bf7\u6b64\u9700\u6c42\u3002',
      confirmText: label,
      confirmColor: status === 'accepted' ? '#34c759' : '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return
        this.setData({ submitting: true })
        try {
          const r = await api.updateApply(this.data.apply.id, status)
          this.setData({
            apply: {
              ...r.data,
              statusText: statusText(r.data.status),
              dateText: r.data.createdAt ? r.data.createdAt.slice(0, 10) : '',
            },
          })
          getApp().decrementPending()
          getApp().refreshPendingCount().catch(() => {})
          wx.showToast({
            title: status === 'accepted' ? '\u5df2\u63a5\u53d7\u7533\u8bf7' : '\u5df2\u62d2\u7edd\u7533\u8bf7',
            icon: status === 'accepted' ? 'success' : 'none',
          })
        } catch (_) {
        } finally {
          this.setData({ submitting: false })
        }
      },
    })
  },

  goTeacherProfile() {
    if (!this.data.teacher) {
      wx.showToast({ title: '\u672a\u627e\u5230\u8001\u5e08\u8d44\u6599', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/teacher-profile/teacher-profile?teacherId=${this.data.teacher.id}&userId=${this.data.teacher.user_id}&readonly=1`,
    })
  },

})