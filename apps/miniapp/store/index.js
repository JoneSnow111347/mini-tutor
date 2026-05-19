/**
 * store/index.js — Global session state
 *
 * Holds the current user's identity after login.
 * Persisted to uni storage so state survives app restarts.
 *
 * Usage in any page:
 *   import { state, saveSession, clearSession } from '@/store/index.js'
 */

import { reactive } from 'vue'

// ── Reactive state ──────────────────────────────────────────────────────────
export const state = reactive({
  /** Logged-in user's primary key (users.id) */
  userId: null,
  /** 'parent' | 'teacher' | 'both' */
  role: null,
  /** Teacher profile record ID (teachers.id) — null for parent-only users */
  teacherId: null,
  /** Display name from users.nickname */
  nickname: null,
  /** JWT token for API authentication */
  token: null,
})

// ── Bootstrap — call once in main.js ───────────────────────────────────────
export function initStore() {
  const userInfo = wx.getStorageSync('userInfo')
  if (!userInfo || !userInfo.id) return

  state.userId   = Number(userInfo.id)
  state.role     = userInfo.role || null
  state.nickname = userInfo.nickname || null
  state.token    = userInfo.token || null

  const tid = wx.getStorageSync('teacherId')
  state.teacherId = isTeacher() && tid ? Number(tid) : null
  if (!isTeacher()) {
    wx.removeStorageSync('teacherId')
  }
}

// ── After login / register ──────────────────────────────────────────────────
/**
 * @param {Object} user      — User object from API response data
 * @param {number|null} teacherId — teachers.id if role includes teacher
 */
export function saveSession(user, teacherId = null) {
  state.userId    = user.id
  state.role      = user.role
  state.nickname  = user.nickname || null
  state.teacherId = teacherId
  state.token     = user.token || null

  // Single source of truth: userInfo object
  const userInfo = {
    id:       user.id,
    role:     user.role,
    nickname: user.nickname || '',
    token:    user.token || null,
  }
  wx.setStorageSync('userInfo', userInfo)

  if (teacherId) wx.setStorageSync('teacherId', teacherId)
  else wx.removeStorageSync('teacherId')
}

// ── Re-sync from storage (after native logout clears storage) ──────────────
export function syncFromStorage() {
  const userInfo = wx.getStorageSync('userInfo')
  if (!userInfo || !userInfo.id) {
    state.userId = null
    state.role = null
    state.teacherId = null
    state.nickname = null
    state.token = null
    return false
  }
  state.userId = Number(userInfo.id)
  state.role = userInfo.role || null
  state.nickname = userInfo.nickname || null
  state.token = userInfo.token || null
  const tid = wx.getStorageSync('teacherId')
  state.teacherId = isTeacher() && tid ? Number(tid) : null
  return true
}

// ── Logout ──────────────────────────────────────────────────────────────────
export function clearSession() {
  state.userId    = null
  state.role      = null
  state.teacherId = null
  state.nickname  = null
  state.token     = null
  // Remove userInfo (canonical) and legacy flat keys
  wx.removeStorageSync('userInfo')
  wx.removeStorageSync('userId')
  wx.removeStorageSync('role')
  wx.removeStorageSync('nickname')
  wx.removeStorageSync('token')
  wx.removeStorageSync('teacherId')
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export function isLoggedIn() {
  return !!state.userId
}

export function isTeacher() {
  return state.role === 'teacher' || state.role === 'both'
}

export function isParent() {
  return state.role === 'parent' || state.role === 'both'
}
