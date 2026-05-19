import { state } from '@/store/index.js'

/**
 * Bridge Vue store session to native getApp().globalData.
 * Call before navigating from a Vue page to a native page
 * when the user was authenticated via the Vue flow.
 *
 * Always syncs from userInfo storage — no stale early-exit.
 */
export function bridgeToNative() {
  if (!state.userId) return

  const app = getApp()
  const userInfo = {
    id:       state.userId,
    role:     state.role,
    nickname: state.nickname,
    token:    state.token,
  }

  app.globalData.userInfo   = userInfo
  app.globalData.userId     = state.userId
  app.globalData.role       = state.role
  app.globalData.teacherId  = state.teacherId

  wx.setStorageSync('userInfo', userInfo)
  if (state.teacherId) wx.setStorageSync('teacherId', state.teacherId)
}
