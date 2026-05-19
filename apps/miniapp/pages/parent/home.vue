<script setup>
/**
 * pages/parent/home — Parent Dashboard
 *
 * Purpose:
 *   Landing page after parent login. Shows greeting and quick-action tiles.
 *   Logout clears session and returns to the login page.
 *
 * Navigation from here:
 *   → /pages/parent/publish-demand  (发布需求)
 *   → /pages/parent/my-demands      (我的需求)
 *   → /pages/login/login            (logout)
 */

import { state, clearSession, isLoggedIn } from '@/store/index.js'
import { onMounted } from 'vue'

onMounted(() => {
  if (!isLoggedIn()) {
    wx.reLaunch({ url: '/pages/login/login' })
  }
})

function goPublishDemand() {
  wx.navigateTo({ url: '/pages/parent/publish-demand' })
}

function goMyDemands() {
  wx.navigateTo({ url: '/pages/parent/my-demands' })
}

function handleLogout() {
  wx.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success(res) {
      if (res.confirm) {
        clearSession()
        wx.reLaunch({ url: '/pages/login/login' })
      }
    }
  })
}
</script>

<template>
  <view class="page-container">
    <!-- Greeting -->
    <view class="greeting-card card">
      <text class="greeting-name">你好，{{ state.nickname || '家长' }} 👋</text>
      <text class="greeting-role">家长账户</text>
    </view>

    <!-- Quick actions -->
    <view class="section-title">快捷操作</view>

    <view class="action-grid">
      <view class="action-tile" @tap="goPublishDemand">
        <text class="action-icon">📝</text>
        <text class="action-label">发布需求</text>
        <text class="action-desc">发布一个新的家教需求</text>
      </view>

      <view class="action-tile" @tap="goMyDemands">
        <text class="action-icon">📋</text>
        <text class="action-label">我的需求</text>
        <text class="action-desc">查看已发布的需求和申请</text>
      </view>
    </view>

    <!-- Logout -->
    <view class="logout-area">
      <button class="btn-secondary" @tap="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<style scoped>
.greeting-card {
  margin-bottom: 48rpx;
}
.greeting-name {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 8rpx;
}
.greeting-role {
  display: block;
  font-size: 26rpx;
  color: #888;
}
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.action-tile {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 24rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  active-opacity: 0.7;
}
.action-icon {
  display: block;
  font-size: 72rpx;
  margin-bottom: 16rpx;
}
.action-label {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}
.action-desc {
  display: block;
  font-size: 24rpx;
  color: #aaa;
}
.logout-area {
  margin-top: 40rpx;
}
</style>
