<script setup>
/**
 * pages/teacher/profile — Teacher Profile View & Edit
 *
 * Purpose:
 *   Loads the teacher's own profile and allows editing.
 *   Toggle edit mode → save via PUT /api/teachers/:id.
 *
 * API:
 *   GET /api/teachers/:id
 *   Response: { success: true, data: Teacher }
 *
 *   PUT /api/teachers/:id
 *   Body: { real_name?, teaching_subjects?, is_public? }
 *   Response: { success: true, data: Teacher }
 *
 * Note:
 *   verification_status is read-only (set by admin).
 *   is_public controls whether the profile appears in teacher listings.
 */

import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/utils/request.js'
import { state } from '@/store/index.js'

const teacher  = ref(null)
const editing  = ref(false)
const loading  = ref(false)

// Editable form — populated after load
const form = ref({
  real_name:         '',
  teaching_subjects: '',
  is_public:         true,
})

onLoad(async () => {
  if (!state.teacherId) return
  try {
    // GET /api/teachers/:id
    const res = await api.getTeacher(state.teacherId)
    teacher.value = res.data
    resetForm(res.data)
  } catch (_) {}
})

function resetForm(t) {
  form.value.real_name         = t.real_name
  form.value.teaching_subjects = t.teaching_subjects
  form.value.is_public         = t.is_public
}

function startEdit() { editing.value = true }

function cancelEdit() {
  editing.value = false
  if (teacher.value) resetForm(teacher.value)
}

async function saveProfile() {
  if (!form.value.real_name.trim()) {
    wx.showToast({ title: '真实姓名不能为空', icon: 'none' }); return
  }
  if (!form.value.teaching_subjects.trim()) {
    wx.showToast({ title: '擅长科目不能为空', icon: 'none' }); return
  }

  loading.value = true
  try {
    // PUT /api/teachers/:id
    const res = await api.updateTeacher(state.teacherId, {
      real_name:         form.value.real_name.trim(),
      teaching_subjects: form.value.teaching_subjects.trim(),
      is_public:         form.value.is_public,
    })
    teacher.value = res.data
    editing.value = false
    wx.showToast({ title: '保存成功', icon: 'success' })
  } catch (_) {} finally {
    loading.value = false
  }
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
    <!-- Loading state -->
    <view v-if="!teacher" class="empty-tip">加载中…</view>

    <view v-else>
      <!-- View mode -->
      <view v-if="!editing">
        <view class="card">
          <view class="profile-row">
            <text class="profile-name">{{ teacher.real_name }}</text>
            <text :class="verificationBadge(teacher.verification_status)">
              {{ verificationLabel(teacher.verification_status) }}
            </text>
          </view>

          <hr class="divider" />

          <view class="profile-item">
            <text class="profile-key">擅长科目</text>
            <text class="profile-val">{{ teacher.teaching_subjects }}</text>
          </view>
          <view class="profile-item">
            <text class="profile-key">资料公开</text>
            <text class="profile-val">{{ teacher.is_public ? '已公开' : '已隐藏' }}</text>
          </view>
          <view class="profile-item">
            <text class="profile-key">创建时间</text>
            <text class="profile-val">{{ teacher.createdAt?.slice(0, 10) }}</text>
          </view>
        </view>

        <button class="btn-primary" @tap="startEdit">编辑资料</button>
      </view>

      <!-- Edit mode -->
      <view v-else>
        <view class="form-group">
          <text class="form-label">真实姓名 <text class="required">*</text></text>
          <input class="form-input" type="text" maxlength="20"
            v-model="form.real_name" placeholder="请输入真实姓名" />
        </view>

        <view class="form-group">
          <text class="form-label">擅长科目 <text class="required">*</text></text>
          <input class="form-input" type="text"
            v-model="form.teaching_subjects"
            placeholder="多个科目用逗号分隔，如：数学,物理" />
          <text class="form-hint">例：数学,物理,化学</text>
        </view>

        <view class="form-group">
          <text class="form-label">是否公开资料</text>
          <switch :checked="form.is_public" @change="e => form.is_public = e.detail.value" />
        </view>

        <view class="edit-actions">
          <button class="btn-primary" :disabled="loading" @tap="saveProfile">
            {{ loading ? '保存中...' : '保存' }}
          </button>
          <button class="btn-secondary" @tap="cancelEdit">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.profile-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #222;
}
.profile-item {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.profile-key { font-size: 28rpx; color: #888; }
.profile-val { font-size: 28rpx; color: #333; font-weight: 500; }
.form-hint {
  display: block;
  font-size: 24rpx;
  color: #aaa;
  margin-top: 8rpx;
}
.required { color: #e74c3c; margin-left: 4rpx; }
.edit-actions { display: flex; flex-direction: column; gap: 16rpx; margin-top: 16rpx; }
</style>
