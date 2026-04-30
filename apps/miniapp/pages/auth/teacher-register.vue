<script setup>
/**
 * pages/auth/teacher-register — Teacher Registration (two-step)
 *
 * Purpose:
 *   Step 1 — Create a user account: POST /api/users  { phone, role:'teacher', nickname }
 *   Step 2 — Create teacher profile: POST /api/teachers  { user_id, real_name, teaching_subjects }
 *   On success → saveSession(user, teacher.id) → reLaunch to /pages/teacher/home
 *
 * API:
 *   POST /api/users
 *     Body: { phone, role: 'teacher', nickname? }
 *     Response 201: { success: true, data: User }
 *
 *   POST /api/teachers
 *     Body: { user_id, real_name, teaching_subjects }
 *     Response 201: { success: true, data: Teacher }
 */

import { ref } from 'vue'
import { api } from '@/utils/request.js'
import { saveSession } from '@/store/index.js'

const phone             = ref('')
const nickname          = ref('')
const realName          = ref('')
const teachingSubjects  = ref('')
const loading           = ref(false)

async function handleRegister() {
  const p  = phone.value.trim()
  const rn = realName.value.trim()
  const ts = teachingSubjects.value.trim()

  if (!p || p.length < 11) {
    wx.showToast({ title: '请输入有效的手机号', icon: 'none' }); return
  }
  if (!rn) {
    wx.showToast({ title: '请输入真实姓名', icon: 'none' }); return
  }
  if (!ts) {
    wx.showToast({ title: '请输入擅长科目', icon: 'none' }); return
  }

  loading.value = true
  try {
    // Step 1 — create user
    const userRes = await api.register({
      phone:    p,
      role:     'teacher',
      nickname: nickname.value.trim() || null,
    })
    const user = userRes.data

    // Step 2 — create teacher profile
    const teacherRes = await api.createTeacher({
      user_id:           user.id,
      real_name:         rn,
      teaching_subjects: ts,
    })
    const teacher = teacherRes.data

    saveSession(user, teacher.id)
    wx.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => wx.reLaunch({ url: '/pages/teacher/home' }), 800)
  } catch (err) {
    if (err?.message?.includes('already registered')) {
      wx.showModal({
        title: '手机号已注册',
        content: '该手机号已有账号，是否前往登录？',
        confirmText: '去登录',
        success(r) {
          if (r.confirm) wx.redirectTo({ url: '/pages/auth/teacher-login' })
        }
      })
    }
  } finally {
    loading.value = false
  }
}

function goLogin() {
  wx.redirectTo({ url: '/pages/auth/teacher-login' })
}
</script>

<template>
  <view class="page-container">
    <view class="auth-header">
      <text class="auth-title">老师注册</text>
      <text class="auth-sub">创建您的老师账户和资料</text>
    </view>

    <!-- Account info -->
    <view class="section-title">账号信息</view>

    <view class="form-group">
      <text class="form-label">手机号 <text class="required">*</text></text>
      <input class="form-input" type="number" maxlength="11"
        placeholder="请输入手机号" v-model="phone" />
    </view>

    <view class="form-group">
      <text class="form-label">昵称（可选）</text>
      <input class="form-input" type="text" maxlength="20"
        placeholder="请输入昵称" v-model="nickname" />
    </view>

    <!-- Teacher profile -->
    <view class="section-title" style="margin-top:40rpx;">老师资料</view>

    <view class="form-group">
      <text class="form-label">真实姓名 <text class="required">*</text></text>
      <input class="form-input" type="text" maxlength="20"
        placeholder="请输入真实姓名" v-model="realName" />
    </view>

    <view class="form-group">
      <text class="form-label">擅长科目 <text class="required">*</text></text>
      <input class="form-input" type="text"
        placeholder="多个科目用逗号分隔，如：数学,物理" v-model="teachingSubjects" />
      <text class="form-hint">例：数学,物理,化学</text>
    </view>

    <button class="btn-primary" :disabled="loading" @tap="handleRegister">
      {{ loading ? '注册中...' : '立即注册' }}
    </button>

    <text class="link-text" @tap="goLogin">已有账号？直接登录</text>
  </view>
</template>

<style scoped>
.auth-header {
  margin-bottom: 48rpx;
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
.form-hint {
  display: block;
  font-size: 24rpx;
  color: #aaa;
  margin-top: 8rpx;
  padding-left: 4rpx;
}
</style>
