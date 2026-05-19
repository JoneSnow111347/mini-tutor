<script setup>
import { ref } from 'vue'
import { api } from '@/utils/request.js'
import { saveSession } from '@/store/index.js'

const phone = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  const p = phone.value.trim()
  const pwd = password.value.trim()

  if (!/^1\d{10}$/.test(p)) {
    wx.showToast({ title: '请输入有效的手机号', icon: 'none' })
    return
  }
  if (pwd.length < 6) {
    wx.showToast({ title: '请输入 6 位以上密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await api.login(p, pwd)
    const user = res.data

    // Role guard: this page is for parent/student only
    if (user.role === 'teacher') {
      wx.showModal({
        title: '身份不匹配',
        content: '该手机号是老师账号，请使用老师入口登录',
        showCancel: false,
      })
      return
    }

    saveSession(user)
    wx.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => wx.reLaunch({ url: '/pages/parent/home' }), 800)
  } catch (err) {
    if (err?.message?.includes('User not found')) {
      wx.showModal({
        title: '手机号未注册',
        content: '该手机号还未注册，是否前往注册？',
        confirmText: '去注册',
        success(res) {
          if (res.confirm) wx.navigateTo({ url: '/pages/auth/parent-register' })
        },
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
      <text class="auth-sub">使用手机号和密码登录家长 / 学生账号</text>
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

    <view class="form-group">
      <text class="form-label">密码</text>
      <input
        class="form-input"
        password
        maxlength="24"
        placeholder="请输入密码"
        v-model="password"
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
