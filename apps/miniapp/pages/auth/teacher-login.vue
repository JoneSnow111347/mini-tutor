<script setup>
/**
 * pages/auth/teacher-login — Teacher Login
 *
 * Purpose:
 *   Login flow for teachers. Two-step:
 *   1. POST /api/users/login  { phone }  → get User
 *   2. GET  /api/teachers               → find Teacher record where user_id === user.id
 *      Store teacherId (teachers.id) in session.
 *   On success → reLaunch to /pages/teacher/home
 *
 * Note:
 *   Teachers have TWO IDs:
 *     - userId   (users.id)    — used for authentication & apply.teacher_user_id
 *     - teacherId (teachers.id) — used for GET/PUT /api/teachers/:id
 *   Both are stored in global state.
 *
 * API:
 *   POST /api/users/login  — body: { phone }
 *   GET  /api/teachers     — find record by user_id
 */

import { ref } from 'vue'
import { api } from '@/utils/request.js'
import { saveSession } from '@/store/index.js'

const phone   = ref('')
const loading = ref(false)

async function handleLogin() {
  const p = phone.value.trim()
  if (!p || p.length < 11) {
    wx.showToast({ title: '请输入有效的手机号', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // Step 1 — authenticate
    const loginRes = await api.login(p)
    const user = loginRes.data

    // Step 2 — find this user's teacher profile
    const teachersRes = await api.listTeachers()
    const teacherRecord = teachersRes.data.find(t => t.user_id === user.id)

    if (!teacherRecord) {
      wx.showModal({
        title: '未找到老师资料',
        content: '您还未创建老师资料，是否前往注册？',
        confirmText: '去注册',
        success(r) {
          if (r.confirm) wx.redirectTo({ url: '/pages/auth/teacher-register' })
        }
      })
      return
    }

    saveSession(user, teacherRecord.id)
    wx.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => wx.reLaunch({ url: '/pages/teacher/home' }), 800)
  } catch (_) {
    // toast already shown by request helper
  } finally {
    loading.value = false
  }
}

function goRegister() {
  wx.navigateTo({ url: '/pages/auth/teacher-register' })
}
</script>

<template>
  <view class="page-container">
    <view class="auth-header">
      <text class="auth-title">老师登录</text>
      <text class="auth-sub">使用手机号登录老师账户</text>
    </view>

    <view class="form-group">
      <text class="form-label">手机号</text>
      <input
        class="form-input"
        type="number"
        maxlength="11"
        placeholder="请输入手机号"
        v-model="phone"
        @confirm="handleLogin"
      />
    </view>

    <button class="btn-primary" :disabled="loading" @tap="handleLogin">
      {{ loading ? '登录中...' : '登录' }}
    </button>

    <text class="link-text" @tap="goRegister">还没有账号？立即注册</text>
  </view>
</template>

<style scoped>
.auth-header {
  margin-bottom: 64rpx;
  padding-top: 32rpx;
}
.auth-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 12rpx;
}
.auth-sub {
  display: block;
  font-size: 28rpx;
  color: #888;
}
</style>
