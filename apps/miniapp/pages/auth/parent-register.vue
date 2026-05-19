<script setup>
/**
 * pages/auth/parent-register — Parent / Student Registration
 *
 * Purpose:
 *   Creates a new user account with role 'parent'.
 *   POST /api/users  { phone, role: 'parent', nickname }
 *   On success → saveSession(user) → reLaunch to /pages/parent/home
 *
 * API:
 *   POST /api/users
 *   Body: { phone: string, role: 'parent', nickname?: string }
 *   Response 201: { success: true, message: 'User created', data: User }
 *
 * Error codes handled:
 *   400 — missing phone / role
 *   409 — phone already registered → suggest login
 */

import { ref } from 'vue'
import { api } from '@/utils/request.js'
import { saveSession } from '@/store/index.js'

const phone    = ref('')
const nickname = ref('')
const loading  = ref(false)

async function handleRegister() {
  const p = phone.value.trim()
  if (!p || p.length < 11) {
    wx.showToast({ title: '请输入有效的手机号', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // POST /api/users — role is always 'parent' on this page
    const res = await api.register({
      phone:    p,
      role:     'parent',
      nickname: nickname.value.trim() || null,
    })

    const user = res.data
    // Role guard: ensure backend returned the expected role
    if (user.role !== 'parent' && user.role !== 'both') {
      wx.showModal({
        title: '注册异常',
        content: '服务端返回了意外的身份类型，请重试或联系客服',
        showCancel: false,
      })
      return
    }

    saveSession(user)
    wx.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => wx.reLaunch({ url: '/pages/parent/home' }), 800)
  } catch (err) {
    if (err?.message?.includes('already registered') || err?.message?.includes('409')) {
      wx.showModal({
        title: '手机号已注册',
        content: '该手机号已有账号，是否前往登录？',
        confirmText: '去登录',
        success(r) {
          if (r.confirm) wx.redirectTo({ url: '/pages/auth/parent-login' })
        }
      })
    }
  } finally {
    loading.value = false
  }
}

function goLogin() {
  wx.redirectTo({ url: '/pages/auth/parent-login' })
}
</script>

<template>
  <view class="page-container">
    <view class="auth-header">
      <text class="auth-title">家长注册</text>
      <text class="auth-sub">创建您的家长账户</text>
    </view>

    <view class="form-group">
      <text class="form-label">手机号 <text class="required">*</text></text>
      <input
        class="form-input"
        type="number"
        maxlength="11"
        placeholder="请输入手机号"
        v-model="phone"
      />
    </view>

    <view class="form-group">
      <text class="form-label">昵称（可选）</text>
      <input
        class="form-input"
        type="text"
        maxlength="20"
        placeholder="请输入昵称"
        v-model="nickname"
      />
    </view>

    <button class="btn-primary" :disabled="loading" @tap="handleRegister">
      {{ loading ? '注册中...' : '注册' }}
    </button>

    <text class="link-text" @tap="goLogin">已有账号？直接登录</text>
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
.required {
  color: #e74c3c;
  margin-left: 4rpx;
}
</style>
