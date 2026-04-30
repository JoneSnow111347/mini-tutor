const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')

const ALL = '\u5168\u90E8'
const POLL_INTERVAL_MS = 5000

function applyText(status) {
  return {
    pending: '\u5DF2\u7533\u8BF7',
    accepted: '\u5DF2\u63A5\u5355',
    rejected: '\u672A\u901A\u8FC7',
  }[status] || ''
}

function shouldShowDemand(demand, myStatus, acceptedDemandIds) {
  if (demand.status !== 'open') return false
  if (acceptedDemandIds[demand.id]) return false
  return !myStatus || myStatus === 'pending'
}

Page({
  data: {
    allOpenDemands: [],
    filteredDemands: [],
    appliedSet: {},
    newDemandIds: {},
    teacherSummary: null,
    teacherInitial: '\u5E08',
    isFavTeacher: false,
    subjects: [ALL],
    areas: [ALL],
    selectedSubject: ALL,
    selectedArea: ALL,
    keyword: '',
    syncTip: '',
    leavingDemandIds: {},
    loading: false,
  },

  _prevBrowseTime: 0,
  _pollTimer: null,

  onShow() {
    const app = getApp()
    this._prevBrowseTime = app.globalData.lastBrowseDemandsTime
    this.loadDemands().then(() => {
      app.setLastBrowseDemandsTime()
      app.markAllNotificationsRead()
      this.startPolling()
    })
    this.loadTeacherSummary()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  async onPullDownRefresh() {
    await this.loadDemands()
    wx.stopPullDownRefresh()
  },

  async loadDemands(background = false) {
    const userId = getApp().globalData.userId
    if (!userId) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    if (!background) this.setData({ loading: true })
    try {
      const fetches = [api.listDemands(true), api.listApplies({}, true)]
      if (!background) fetches.push(api.getFavorites({ user_id: userId, type: 'demand' }, true))
      const [demandsRes, appliesRes, favRes] = await Promise.all(fetches)

      const favIds = new Set((favRes && favRes.data || []).map(f => f.target_id))
      if (!background && favRes) {
        getApp().globalData.favoriteDemandIds = [...favIds]
      }

      const appliedSet = {}
      const acceptedDemandIds = {}
      ;(appliesRes.data || []).forEach(a => {
        if (a.teacher_user_id === userId) appliedSet[a.demand_id] = a.status
        if (a.status === 'accepted') acceptedDemandIds[a.demand_id] = true
      })

      const newDemandIds = {}
      const prevTime = this._prevBrowseTime
      const existingFavById = {}
      this.data.allOpenDemands.forEach(d => { existingFavById[d.id] = !!d.isFav })

      const open = (demandsRes.data || [])
        .filter(d => shouldShowDemand(d, appliedSet[d.id], acceptedDemandIds))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(d => {
          if (prevTime > 0 && new Date(d.createdAt).getTime() > prevTime) {
            newDemandIds[d.id] = true
          }
          return {
            ...d,
            dateText: d.createdAt ? d.createdAt.slice(0, 10) : '',
            applyStatus: appliedSet[d.id] || '',
            applyText: applyText(appliedSet[d.id]),
            isFav: background
              ? (existingFavById[d.id] !== undefined ? existingFavById[d.id] : false)
              : favIds.has(d.id),
          }
        })

      const subjects = [ALL, ...Array.from(new Set(open.map(d => d.subject).filter(Boolean)))]
      const areas = [ALL, ...Array.from(new Set(open.map(d => d.area).filter(Boolean)))]

      this.setData({ allOpenDemands: open, appliedSet, newDemandIds, subjects, areas }, this.applyFilters)
    } catch (_) {
      this.setData({ allOpenDemands: [], filteredDemands: [], appliedSet: {}, newDemandIds: {} })
    } finally {
      if (!background) this.setData({ loading: false })
    }
  },

  async loadTeacherSummary() {
    const userId = getApp().globalData.userId
    if (!userId) return
    try {
      const [teachersRes, favRes] = await Promise.all([
        api.listTeachers(true),
        api.getFavorites({ user_id: userId, type: 'teacher' }, true),
      ])
      const favTeacherIds = (favRes.data || []).map(f => f.target_id)
      getApp().globalData.favoriteTeacherIds = favTeacherIds
      const teacher = (teachersRes.data || []).find(t => t.user_id === userId) || null
      const isFavTeacher = teacher ? favTeacherIds.includes(teacher.id) : false
      this.setData({
        teacherSummary: teacher,
        teacherInitial: teacher ? (teacher.real_name || '\u5E08').slice(0, 1) : '\u5E08',
        isFavTeacher,
      })
    } catch (_) {}
  },

  toggleFavDemand(e) {
    const id = Number(e.currentTarget.dataset.id)
    const uid = getApp().globalData.userId
    if (!uid) return
    const demand = this.data.allOpenDemands.find(d => d.id === id)
    if (!demand) return
    const added = !demand.isFav
    this.setData({ allOpenDemands: this.data.allOpenDemands.map(d => d.id === id ? { ...d, isFav: added } : d) }, this.applyFilters)
    wx.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
    const call = added
      ? api.addFavorite({ user_id: uid, target_id: id, target_type: 'demand' })
      : api.removeFavorite({ user_id: uid, target_id: id, target_type: 'demand' })
    call.catch(() => {
      this.setData({ allOpenDemands: this.data.allOpenDemands.map(d => d.id === id ? { ...d, isFav: !added } : d) }, this.applyFilters)
    })
  },

  toggleFavTeacher() {
    const uid = getApp().globalData.userId
    const teacher = this.data.teacherSummary
    if (!teacher || !uid) return
    const was = this.data.isFavTeacher
    const added = !was
    this.setData({ isFavTeacher: added })
    wx.showToast({ title: added ? '已收藏老师资料' : '已取消收藏', icon: 'none' })
    const call = added
      ? api.addFavorite({ user_id: uid, target_id: teacher.id, target_type: 'teacher' })
      : api.removeFavorite({ user_id: uid, target_id: teacher.id, target_type: 'teacher' })
    call.catch(() => { this.setData({ isFavTeacher: was }) })
  },

  startPolling() {
    this.stopPolling()
    this._pollTimer = setInterval(() => this.pollStatus(), POLL_INTERVAL_MS)
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  async pollStatus() {
    const userId = getApp().globalData.userId
    if (!userId) return
    try {
      const [demandsRes, appliesRes] = await Promise.all([
        api.listDemands(true),
        api.listApplies({}, true),
      ])
      const nextSet = {}
      const acceptedDemandIds = {}
      ;(appliesRes.data || []).forEach(a => {
        if (a.teacher_user_id === userId) nextSet[a.demand_id] = a.status
        if (a.status === 'accepted') acceptedDemandIds[a.demand_id] = true
      })

      let changed = false
      ;(appliesRes.data || []).filter(a => a.teacher_user_id === userId).forEach(a => {
        const oldStatus = this.data.appliedSet[a.demand_id]
        if (oldStatus && oldStatus !== a.status) {
          changed = true
          if (a.status === 'accepted' || a.status === 'rejected') {
            const demand = this.data.allOpenDemands.find(d => d.id === a.demand_id)
            getApp().addStudentNotification({
              applyId: a.id,
              demandId: a.demand_id,
              status: a.status,
              demandTitle: (demand && demand.title) || '',
            })
          }
        }
      })

      const visibleIds = {}
      ;(demandsRes.data || []).forEach(d => {
        if (shouldShowDemand(d, nextSet[d.id], acceptedDemandIds)) visibleIds[d.id] = true
      })
      const listChanged = this.data.allOpenDemands.length !== Object.keys(visibleIds).length ||
        this.data.allOpenDemands.some(d => !visibleIds[d.id])
      if (!changed && !listChanged) return

      const existingById = {}
      this.data.allOpenDemands.forEach(d => {
        existingById[d.id] = { applyStatus: d.applyStatus || '', isFav: !!d.isFav }
      })
      const allOpenDemands = (demandsRes.data || [])
        .filter(d => shouldShowDemand(d, nextSet[d.id], acceptedDemandIds))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(d => ({
          ...d,
          dateText: d.createdAt ? d.createdAt.slice(0, 10) : '',
          applyStatus: nextSet[d.id] || '',
          applyText: applyText(nextSet[d.id]),
          isFav: existingById[d.id] !== undefined ? existingById[d.id].isFav : false,
          statusChanged: existingById[d.id] !== undefined && existingById[d.id].applyStatus !== (nextSet[d.id] || ''),
        }))
      const syncTip = listChanged ? '\u9700\u6C42\u72B6\u6001\u5DF2\u66F4\u65B0' : '\u7533\u8BF7\u72B6\u6001\u5DF2\u66F4\u65B0'
      const leavingDemandIds = {}
      if (listChanged) {
        this.data.allOpenDemands.forEach(d => {
          if (!allOpenDemands.find(n => n.id === d.id)) leavingDemandIds[d.id] = true
        })
      }
      if (Object.keys(leavingDemandIds).length > 0) {
        this.setData({ leavingDemandIds, syncTip })
        setTimeout(() => {
          this.setData({ appliedSet: nextSet, allOpenDemands, leavingDemandIds: {} }, this.applyFilters)
        }, 320)
      } else {
        this.setData({ appliedSet: nextSet, allOpenDemands, syncTip }, this.applyFilters)
      }
      setTimeout(() => {
        if (this.data.syncTip === syncTip) {
          const cleared = this.data.allOpenDemands.map(d => ({ ...d, statusChanged: false }))
          this.setData({ syncTip: '', allOpenDemands: cleared }, this.applyFilters)
        }
      }, 2400)
    } catch (_) {}
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value }, this.applyFilters)
  },

  clearKeyword() {
    this.setData({ keyword: '' }, this.applyFilters)
  },

  selectSubject(e) {
    this.setData({ selectedSubject: e.currentTarget.dataset.value }, this.applyFilters)
  },

  selectArea(e) {
    this.setData({ selectedArea: e.currentTarget.dataset.value }, this.applyFilters)
  },

  applyFilters() {
    const kw = (this.data.keyword || '').trim().toLowerCase()
    const filtered = this.data.allOpenDemands.filter(d => {
      const subjectOk = this.data.selectedSubject === ALL || d.subject === this.data.selectedSubject
      const areaOk = this.data.selectedArea === ALL || d.area === this.data.selectedArea
      const kwOk = !kw || d.title.toLowerCase().includes(kw) || d.subject.toLowerCase().includes(kw) || d.area.toLowerCase().includes(kw)
      return subjectOk && areaOk && kwOk
    })
    this.setData({ filteredDemands: filtered })
  },

  goDemandDetail(e) {
    const demandId = e.currentTarget.dataset.demandId
    getApp().globalData.currentDemandId = demandId
    wx.navigateTo({ url: `/pages/apply-demand/apply-demand?demandId=${demandId}` })
  },

  goTeacherProfile() {
    if (!this.data.teacherSummary) {
      wx.navigateTo({ url: '/pages/teacher-profile/teacher-profile' })
      return
    }
    wx.navigateTo({
      url: `/pages/teacher-profile/teacher-profile?teacherId=${this.data.teacherSummary.id}&userId=${this.data.teacherSummary.user_id}`,
    })
  },

  handleGlobalLogout() {
    confirmLogout(this)
  },
})