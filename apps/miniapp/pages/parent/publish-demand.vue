<script setup>
/**
 * pages/parent/publish-demand — Publish a Tutoring Demand
 *
 * Purpose:
 *   Parent fills in a demand form and submits.
 *   POST /api/demands with all required fields.
 *   On success → toast + navigateBack to my-demands.
 *
 * Required fields (backend enforces):
 *   title, subject, grade_level, area, class_mode,
 *   description, contact_name, contact_phone
 *
 * API:
 *   POST /api/demands
 *   Body: {
 *     user_id, title, subject, grade_level, area,
 *     class_mode, description, contact_name, contact_phone
 *   }
 *   Response 201: { success: true, data: Demand }
 */

import { ref } from 'vue'
import { api } from '@/utils/request.js'
import { state } from '@/store/index.js'

const loading = ref(false)

// Form state — mirrors Demand fields
const form = ref({
  title:         '',
  subject:       '',
  grade_level:   '',
  area:          '',
  class_mode:    '线下',   // default
  description:   '',
  contact_name:  '',
  contact_phone: '',
})

const classModeOptions = ['线下', '线上', '均可']

function selectClassMode(mode) {
  form.value.class_mode = mode
}

function validate() {
  const required = [
    ['title',         '需求标题'],
    ['subject',       '科目'],
    ['grade_level',   '年级'],
    ['area',          '上课地区'],
    ['description',   '详细说明'],
    ['contact_name',  '联系人'],
    ['contact_phone', '联系电话'],
  ]
  for (const [key, label] of required) {
    if (!form.value[key]?.trim()) {
      wx.showToast({ title: `请填写${label}`, icon: 'none' })
      return false
    }
  }
  if (form.value.contact_phone.trim().length < 11) {
    wx.showToast({ title: '请输入有效的联系电话', icon: 'none' })
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return

  loading.value = true
  try {
    // POST /api/demands
    await api.createDemand({
      user_id:       state.userId,
      title:         form.value.title.trim(),
      subject:       form.value.subject.trim(),
      grade_level:   form.value.grade_level.trim(),
      area:          form.value.area.trim(),
      class_mode:    form.value.class_mode,
      description:   form.value.description.trim(),
      contact_name:  form.value.contact_name.trim(),
      contact_phone: form.value.contact_phone.trim(),
    })
    wx.showToast({ title: '发布成功！', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 800)
  } catch (_) {
    // toast shown by request helper
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page-container">
    <!-- Title -->
    <view class="form-group">
      <text class="form-label">需求标题 <text class="required">*</text></text>
      <input class="form-input" type="text" maxlength="50"
        placeholder="如：初二数学辅导" v-model="form.title" />
    </view>

    <!-- Subject -->
    <view class="form-group">
      <text class="form-label">科目 <text class="required">*</text></text>
      <input class="form-input" type="text" maxlength="30"
        placeholder="如：数学" v-model="form.subject" />
    </view>

    <!-- Grade -->
    <view class="form-group">
      <text class="form-label">年级 <text class="required">*</text></text>
      <input class="form-input" type="text" maxlength="30"
        placeholder="如：初中二年级" v-model="form.grade_level" />
    </view>

    <!-- Area -->
    <view class="form-group">
      <text class="form-label">上课地区 <text class="required">*</text></text>
      <input class="form-input" type="text" maxlength="50"
        placeholder="如：武汉市洪山区" v-model="form.area" />
    </view>

    <!-- Class mode -->
    <view class="form-group">
      <text class="form-label">上课方式 <text class="required">*</text></text>
      <view class="mode-row">
        <view
          v-for="m in classModeOptions"
          :key="m"
          class="mode-chip"
          :class="{ active: form.class_mode === m }"
          @tap="selectClassMode(m)"
        >{{ m }}</view>
      </view>
    </view>

    <!-- Description -->
    <view class="form-group">
      <text class="form-label">详细说明 <text class="required">*</text></text>
      <textarea class="form-textarea" maxlength="500"
        placeholder="请描述具体需求，如时间安排、学生情况、目标等…"
        v-model="form.description" />
    </view>

    <hr class="divider" />
    <view class="section-title">联系信息</view>

    <!-- Contact name -->
    <view class="form-group">
      <text class="form-label">联系人 <text class="required">*</text></text>
      <input class="form-input" type="text" maxlength="20"
        placeholder="如：李妈妈" v-model="form.contact_name" />
    </view>

    <!-- Contact phone -->
    <view class="form-group">
      <text class="form-label">联系电话 <text class="required">*</text></text>
      <input class="form-input" type="number" maxlength="11"
        placeholder="请输入联系电话" v-model="form.contact_phone" />
    </view>

    <button class="btn-primary" :disabled="loading" @tap="handleSubmit">
      {{ loading ? '发布中...' : '发布需求' }}
    </button>
  </view>
</template>

<style scoped>
.required { color: #e74c3c; margin-left: 4rpx; }
.mode-row {
  display: flex;
  gap: 16rpx;
}
.mode-chip {
  padding: 12rpx 32rpx;
  border-radius: 40rpx;
  background: #f0f0f0;
  color: #666;
  font-size: 28rpx;
  border: 2rpx solid transparent;
}
.mode-chip.active {
  background: #e8f0fd;
  color: #4a90e2;
  border-color: #4a90e2;
  font-weight: 600;
}
</style>
