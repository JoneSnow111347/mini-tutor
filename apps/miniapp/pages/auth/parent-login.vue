<script setup>
/**
 * pages/auth/parent-login — Parent / Student Login
 *
 * Purpose:
 *   Existing parent logs in with phone number.
 *   POST /api/users/login  { phone }
 *   On success → saveSession(user) → reLaunch to /pages/parent/home
 *
 * API:
 *   POST /api/users/login
 *   Body: { phone: string }
 *   Response: { success: true, data: User }
 *
 * Error codes handled:
 *   400 — phone missing
 *   404 — phone not registered → suggest register
 */

import { ref } from 'vue'
import { api } from '@/utils/request.js'
import { saveSession } from '@/store/index.js'

const phone    = ref('')
const loading  = ref(false)

async function handleLogin() {
  const p = phone.value.trim()
  if (!p || p.length < 11) {
    wx.showToast({ title: '请输入有效的手机号', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // POST /api/users/login
    const res = await api.login(p)
    // res.data is the User object
    saveSession(res.data)
    wx.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => wx.reLaunch({ url: '/pages/parent/home' }), 800)
  } catch (err) {
    // api.login already shows a toast; handle 404 case specifically
    if (err?.message?.includes('not found') || err?.message?.includes('User not found')) {
      wx.showModal({
        title: '手机号未注册',
        content: '该手机号还未注册，是否前往注册？',
        confirmText: '去注册',
        success(res) {
          if (res.confirm) wx.navigateTo({ url: '/pages/auth/parent-register' })
        }
      })
    }
  } finally {
    loading.value = false
  }
}

function goRegister() {
  wx.navigateTo({ url: '/pages/auth/parent-register' })
}
</script>

<template>
  <view class="page-container">
    <view class="auth-header">
      <text class="auth-title">家长登录</text>
      <text class="auth-sub">使用手机号登录您的账户</text>
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
