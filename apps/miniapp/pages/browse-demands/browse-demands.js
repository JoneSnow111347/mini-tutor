const { confirmLogout } = require('../../utils/page')
const { api } = require('../../utils/request')

const ALL = '全部'
const POLL_INTERVAL_MS = 5000

function applyText(status) {
  return {
    pending: '已申请',
    accepted: '已接单',
    rejected: '未通过',
  }[status] || ''
}

function shouldShowDemand(demand, myStatus, acceptedDemandIds) {
  if (demand.status !== 'open') return false
  if (acceptedDemandIds[demand.id]) return false
  return !myStatus || myStatus === 'pending'
}

function formatDistance(meters) {
  if (meters === null || meters === undefined) return ''
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

function calcDistance(lat1, lng1, lat2, lng2) {
  const toRad = (value) => value * Math.PI / 180
  const earthRadius = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

Page({
  data: {
    allOpenDemands: [],
    filteredDemands: [],
    appliedSet: {},
    newDemandIds: {},
    teacherSummary: null,
    teacherInitial: '师',
    isFavTeacher: false,
    subjects: [ALL],
    areas: [ALL],
    selectedSubject: ALL,
    selectedArea: ALL,
    keyword: '',
    syncTip: '',
    leavingDemandIds: {},
    loading: false,
    locationReady: false,
  },

  _prevBrowseTime: 0,
  _pollTimer: null,
  _currentLocation: null,

  onShow() {
    const app = getApp()
    this._prevBrowseTime = app.globalData.lastBrowseDemandsTime
    this.ensureLocation()
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
    await this.ensureLocation()
    await this.loadDemands()
    wx.stopPullDownRefresh()
  },

  ensureLocation() {
    if (this._currentLocation) return Promise.resolve(this._currentLocation)
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          this._currentLocation = {
            latitude: res.latitude,
            longitude: res.longitude,
          }
          this.setData({ locationReady: true })
          resolve(this._currentLocation)
        },
        fail: () => resolve(null),
      })
    })
  },

  decorateDemand(demand, appliedSet, newDemandIds, isFav) {
    let distanceText = ''
    if (
      this._currentLocation
      && demand.latitude !== null
      && demand.latitude !== undefined
      && demand.longitude !== null
      && demand.longitude !== undefined
    ) {
      const meters = calcDistance(
        this._currentLocation.latitude,
        this._currentLocation.longitude,
        Number(demand.latitude),
        Number(demand.longitude)
      )
      distanceText = formatDistance(meters)
    }

    return {
      ...demand,
      dateText: demand.createdAt ? demand.createdAt.slice(0, 10) : '',
      applyStatus: appliedSet[demand.id] || '',
      applyText: applyText(appliedSet[demand.id]),
      isFav,
      newTag: !!newDemandIds[demand.id],
      distanceText,
      hasLocation: demand.latitude !== null && demand.latitude !== undefined && demand.longitude !== null && demand.longitude !== undefined,
    }
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

      const favIds = new Set((favRes && favRes.data || []).map((item) => item.target_id))
      if (!background && favRes) {
        getApp().globalData.favoriteDemandIds = [...favIds]
      }

      const appliedSet = {}
      const acceptedDemandIds = {}
      ;(appliesRes.data || []).forEach((item) => {
        if (Number(item.teacher_user_id) === Number(userId)) appliedSet[item.demand_id] = item.status
        if (item.status === 'accepted') acceptedDemandIds[item.demand_id] = true
      })

      const newDemandIds = {}
      const prevTime = this._prevBrowseTime
      const existingFavById = {}
      this.data.allOpenDemands.forEach((item) => { existingFavById[item.id] = !!item.isFav })

      const open = (demandsRes.data || [])
        .filter((item) => shouldShowDemand(item, appliedSet[item.id], acceptedDemandIds))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((item) => {
          if (prevTime > 0 && new Date(item.createdAt).getTime() > prevTime) {
            newDemandIds[item.id] = true
          }
          const isFav = background
            ? (existingFavById[item.id] !== undefined ? existingFavById[item.id] : false)
            : favIds.has(item.id)
          return this.decorateDemand(item, appliedSet, newDemandIds, isFav)
        })

      const subjects = [ALL, ...Array.from(new Set(open.map((item) => item.subject).filter(Boolean)))]
      const areas = [ALL, ...Array.from(new Set(open.map((item) => item.area).filter(Boolean)))]

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
      const favTeacherIds = (favRes.data || []).map((item) => item.target_id)
      getApp().globalData.favoriteTeacherIds = favTeacherIds
      const teacher = (teachersRes.data || []).find((item) => Number(item.user_id) === Number(userId)) || null
      const isFavTeacher = teacher ? favTeacherIds.includes(teacher.id) : false
      this.setData({
        teacherSummary: teacher,
        teacherInitial: teacher ? (teacher.real_name || '师').slice(0, 1) : '师',
        isFavTeacher,
      })
    } catch (_) {}
  },

  toggleFavDemand(e) {
    const id = Number(e.currentTarget.dataset.id)
    const uid = getApp().globalData.userId
    if (!uid) return
    const demand = this.data.allOpenDemands.find((item) => item.id === id)
    if (!demand) return

    const added = !demand.isFav
    this.setData({
      allOpenDemands: this.data.allOpenDemands.map((item) => (item.id === id ? { ...item, isFav: added } : item)),
    }, this.applyFilters)

    wx.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })

    const call = added
      ? api.addFavorite({ target_id: id, target_type: 'demand' })
      : api.removeFavorite({ target_id: id, target_type: 'demand' })

    call.catch(() => {
      this.setData({
        allOpenDemands: this.data.allOpenDemands.map((item) => (item.id === id ? { ...item, isFav: !added } : item)),
      }, this.applyFilters)
    })
  },

  toggleFavTeacher() {
    const teacher = this.data.teacherSummary
    if (!teacher) return
    const was = this.data.isFavTeacher
    const added = !was
    this.setData({ isFavTeacher: added })
    wx.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })

    const call = added
      ? api.addFavorite({ target_id: teacher.id, target_type: 'teacher' })
      : api.removeFavorite({ target_id: teacher.id, target_type: 'teacher' })
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
      ;(appliesRes.data || []).forEach((item) => {
        if (Number(item.teacher_user_id) === Number(userId)) nextSet[item.demand_id] = item.status
        if (item.status === 'accepted') acceptedDemandIds[item.demand_id] = true
      })

      let changed = false
      ;(appliesRes.data || []).filter((item) => Number(item.teacher_user_id) === Number(userId)).forEach((item) => {
        const oldStatus = this.data.appliedSet[item.demand_id]
        if (oldStatus && oldStatus !== item.status) {
          changed = true
          if (item.status === 'accepted' || item.status === 'rejected') {
            const demand = this.data.allOpenDemands.find((row) => row.id === item.demand_id)
            getApp().addStudentNotification({
              applyId: item.id,
              demandId: item.demand_id,
              status: item.status,
              demandTitle: (demand && demand.title) || '',
            })
          }
        }
      })

      const visibleIds = {}
      ;(demandsRes.data || []).forEach((item) => {
        if (shouldShowDemand(item, nextSet[item.id], acceptedDemandIds)) visibleIds[item.id] = true
      })

      const listChanged = this.data.allOpenDemands.length !== Object.keys(visibleIds).length
        || this.data.allOpenDemands.some((item) => !visibleIds[item.id])
      if (!changed && !listChanged) return

      const existingById = {}
      this.data.allOpenDemands.forEach((item) => {
        existingById[item.id] = { applyStatus: item.applyStatus || '', isFav: !!item.isFav }
      })

      const allOpenDemands = (demandsRes.data || [])
        .filter((item) => shouldShowDemand(item, nextSet[item.id], acceptedDemandIds))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((item) => {
          const decorated = this.decorateDemand(
            item,
            nextSet,
            this.data.newDemandIds,
            existingById[item.id] ? existingById[item.id].isFav : false
          )
          decorated.statusChanged = existingById[item.id]
            && existingById[item.id].applyStatus !== (nextSet[item.id] || '')
          return decorated
        })

      const syncTip = listChanged ? '需求列表已更新' : '申请状态已更新'
      const leavingDemandIds = {}
      if (listChanged) {
        this.data.allOpenDemands.forEach((item) => {
          if (!allOpenDemands.find((next) => next.id === item.id)) leavingDemandIds[item.id] = true
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
          const cleared = this.data.allOpenDemands.map((item) => ({ ...item, statusChanged: false }))
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
    const filtered = this.data.allOpenDemands.filter((item) => {
      const subjectOk = this.data.selectedSubject === ALL || item.subject === this.data.selectedSubject
      const areaOk = this.data.selectedArea === ALL || item.area === this.data.selectedArea
      const keywordPool = [item.title, item.subject, item.area, item.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const kwOk = !kw || keywordPool.includes(kw)
      return subjectOk && areaOk && kwOk
    })
    this.setData({ filteredDemands: filtered })
  },

  goDemandDetail(e) {
    const demandId = e.currentTarget.dataset.demandId
    getApp().globalData.currentDemandId = demandId
    wx.navigateTo({ url: `/pages/apply-demand/apply-demand?demandId=${demandId}` })
  },

  openDemandLocation(e) {
    const demandId = Number(e.currentTarget.dataset.id)
    const demand = this.data.filteredDemands.find((item) => item.id === demandId)
    if (!demand || !demand.hasLocation) {
      wx.showToast({ title: '该需求未填写地图位置', icon: 'none' })
      return
    }

    wx.openLocation({
      latitude: Number(demand.latitude),
      longitude: Number(demand.longitude),
      name: demand.title || '家教需求位置',
      address: demand.address || demand.area || '',
      scale: 16,
    })
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
