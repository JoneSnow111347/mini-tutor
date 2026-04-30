<script setup>
/**
 * pages/index/index — Home / Role-selection gate
 *
 * Purpose:
 *   Entry point. If the user already has a valid session in storage,
 *   redirect them to the correct dashboard. Otherwise show two role buttons.
 *
 * Navigation:
 *   → /pages/auth/parent-login   (家长/学生入口)
 *   → /pages/auth/teacher-login  (老师入口)
 *   Auto-redirect → /pages/parent/home   if role is parent/both
 *   Auto-redirect → /pages/teacher/home  if role is teacher
 */

import { onMounted } from 'vue'
import { state, isLoggedIn } from '@/store/index.js'

onMounted(() => {
  if (isLoggedIn()) redirectByRole(state.role)
})

function redirectByRole(role) {
  const url = (role === 'teacher')
    ? '/pages/teacher/home'
    : '/pages/parent/home'
  wx.reLaunch({ url })
}

function goParentLogin() {
  wx.navigateTo({ url: '/pages/auth/parent-login' })
}

function goTeacherLogin() {
  wx.navigateTo({ url: '/pages/auth/teacher-login' })
}
</script>

<template>
  <view class="page-container home-page">
    <!-- Logo / Branding -->
    <view class="home-hero">
      <view class="home-logo">📚</view>
      <text class="home-title">家教平台</text>
      <text class="home-subtitle">武汉本地优质家教平台</text>
    </view>

    <!-- Role selection -->
    <view class="home-actions">
      <button class="btn-primary" @tap="goParentLogin">
        👨‍👩‍👧 我是家长 / 学生
      </button>
      <button class="btn-secondary" @tap="goTeacherLogin">
        👩‍🏫 我是老师
      </button>
    </view>

    <text class="home-footer">遇见好老师，从这里开始</text>
  </view>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  padding: 80rpx 64rpx;
  box-sizing: border-box;
}
.home-hero {
  text-align: center;
  margin-bottom: 80rpx;
}
.home-logo {
  font-size: 120rpx;
  margin-bottom: 24rpx;
}
.home-title {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 16rpx;
}
.home-subtitle {
  display: block;
  font-size: 28rpx;
  color: #888;
}
.home-actions {
  margin-bottom: 48rpx;
}
.home-footer {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #bbb;
}
</style>
