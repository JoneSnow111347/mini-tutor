<script setup>
/**
 * pages/teacher/home — Teacher Dashboard
 *
 * Purpose:
 *   Landing page after teacher login. Shows greeting with verification status
 *   and quick-action tiles for profile, browse, and my-applications.
 *
 * API:
 *   GET /api/teachers/:id  — load teacher record on show (for verification status)
 *
 * Navigation from here:
 *   → /pages/teacher/profile          (我的资料)
 *   → /pages/teacher/browse-demands   (浏览需求)
 *   → /pages/index/index              (logout)
 */

import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/utils/request.js'
import { state, clearSession, isLoggedIn } from '@/store/index.js'

const teacher = ref(null)

onShow(async () => {
  if (!isLoggedIn()) {
    wx.reLaunch({ url: '/pages/index/index' }); return
  }
  if (state.teacherId) {
    try {
      // GET /api/teachers/:id
      const res = await api.getTeacher(state.teacherId)
      teacher.value = res.data
    } catch (_) {}
  }
})

function goProfile() {
  wx.navigateTo({ url: '/pages/teacher/profile' })
}

function goBrowse() {
  wx.navigateTo({ url: '/pages/teacher/browse-demands' })
}

function handleLogout() {
  wx.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success(res) {
      if (res.confirm) {
        clearSession()
        wx.reLaunch({ url: '/pages/index/index' })
      }
    }
  })
}

function verificationLabel(s) {
  const map = { pending: '审核中', verified: '已认证', rejected: '审核未通过' }
  return map[s] || s
}
function verificationBadge(s) {
  const map = { pending: 'badge-pending', verified: 'badge-verified', rejected: 'badge-rejected' }
  return `badge ${map[s] || 'badge-pending'}`
}
</script>

<template>
  <view class="page-container">
    <!-- Greeting -->
    <view class="greeting-card card">
      <view class="greeting-row">
        <text class="greeting-name">
          你好，{{ teacher?.real_name || state.nickname || '老师' }} 👋
        </text>
        <text v-if="teacher" :class="verificationBadge(teacher.verification_status)">
          {{ verificationLabel(teacher.verification_status) }}
        </text>
      </view>
      <text class="greeting-role">老师账户</text>
      <text v-if="teacher" class="greeting-subjects">
        擅长科目：{{ teacher.teaching_subjects }}
      </text>
    </view>

    <!-- Quick actions -->
    <view class="section-title">快捷操作</view>

    <view class="action-grid">
      <view class="action-tile" @tap="goProfile">
        <text class="action-icon">👤</text>
        <text class="action-label">我的资料</text>
        <text class="action-desc">查看和编辑老师资料</text>
      </view>

      <view class="action-tile" @tap="goBrowse">
        <text class="action-icon">🔍</text>
        <text class="action-label">浏览需求</text>
        <text class="action-desc">查找合适的家教需求</text>
      </view>
    </view>

    <!-- Logout -->
    <view class="logout-area">
      <button class="btn-secondary" @tap="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<style scoped>
.greeting-card { margin-bottom: 48rpx; }
.greeting-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8rpx;
}
.greeting-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #222;
}
.greeting-role {
  display: block;
  font-size: 26rpx;
  color: #888;
  margin-bottom: 8rpx;
}
.greeting-subjects {
  display: block;
  font-size: 26rpx;
  color: #4a90e2;
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
}
.action-icon  { display: block; font-size: 72rpx; margin-bottom: 16rpx; }
.action-label { display: block; font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 8rpx; }
.action-desc  { display: block; font-size: 24rpx; color: #aaa; }
.logout-area  { margin-top: 40rpx; }
</style>
