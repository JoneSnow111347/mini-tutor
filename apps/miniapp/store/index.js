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
  const userId = wx.getStorageSync('userId')
  if (!userId) return

  state.userId   = Number(userId)
  state.role     = wx.getStorageSync('role')     || null
  state.nickname = wx.getStorageSync('nickname') || null
  state.token    = wx.getStorageSync('token')    || null

  const tid = wx.getStorageSync('teacherId')
  state.teacherId = tid ? Number(tid) : null
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

  wx.setStorageSync('userId',   user.id)
  wx.setStorageSync('role',     user.role)
  wx.setStorageSync('nickname', user.nickname || '')
  if (teacherId) wx.setStorageSync('teacherId', teacherId)
  if (user.token) wx.setStorageSync('token', user.token)
}

// ── Logout ──────────────────────────────────────────────────────────────────
export function clearSession() {
  state.userId    = null
  state.role      = null
  state.teacherId = null
  state.nickname  = null
  state.token     = null
  wx.clearStorageSync()
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
