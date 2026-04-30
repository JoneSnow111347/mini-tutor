<script setup>
/**
 * pages/teacher/apply-demand — Apply to a Demand
 *
 * Purpose:
 *   Shows the full demand detail and lets the teacher submit an application
 *   with an optional message.
 *
 * Route param:
 *   demandId — from URL query string
 *
 * API:
 *   GET /api/demands/:id
 *   Response: { success: true, data: Demand }
 *
 *   POST /api/applies
 *   Body: { demand_id, teacher_user_id, message? }
 *   Response 201: { success: true, data: Apply }
 *
 * Error cases:
 *   409 — already applied → disable submit button
 */

import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/utils/request.js'
import { state } from '@/store/index.js'

const demandId    = ref(null)
const demand      = ref(null)
const message     = ref('')
const loading     = ref(false)
const alreadyApplied = ref(false)

onLoad(async (options) => {
  demandId.value = Number(options.demandId)

  try {
    // GET /api/demands/:id — load full demand detail
    const dr = await api.getDemand(demandId.value)
    demand.value = dr.data
  } catch (_) {
    wx.showToast({ title: '加载需求失败', icon: 'none' })
    return
  }

  // Check if already applied (GET /api/applies?teacher_user_id=X)
  try {
    const ar = await api.listApplies({ teacher_user_id: state.userId })
    alreadyApplied.value = ar.data.some(a => a.demand_id === demandId.value)
  } catch (_) {}
})

async function handleApply() {
  if (alreadyApplied.value) {
    wx.showToast({ title: '您已申请过该需求', icon: 'none' }); return
  }

  loading.value = true
  try {
    // POST /api/applies
    await api.createApply({
      demand_id:       demandId.value,
      teacher_user_id: state.userId,
      message:         message.value.trim() || null,
    })
    alreadyApplied.value = true
    wx.showToast({ title: '申请成功！', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 800)
  } catch (err) {
    if (err?.message?.includes('Already applied') || err?.message?.includes('409')) {
      alreadyApplied.value = true
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page-container">
    <!-- Loading -->
    <view v-if="!demand" class="empty-tip">加载中…</view>

    <view v-else>
      <!-- Demand detail -->
      <view class="card">
        <text class="card-title">{{ demand.title }}</text>

        <view class="tags-row">
          <text class="tag">{{ demand.subject }}</text>
          <text class="tag">{{ demand.grade_level }}</text>
          <text class="tag">{{ demand.class_mode }}</text>
        </view>

        <view class="detail-item">
          <text class="detail-key">上课地区</text>
          <text class="detail-val">{{ demand.area }}</text>
        </view>

        <view class="detail-item">
          <text class="detail-key">需求说明</text>
        </view>
        <text class="detail-desc">{{ demand.description }}</text>
      </view>

      <!-- Already applied notice -->
      <view v-if="alreadyApplied" class="applied-notice">
        ✓ 您已申请过该需求，等待家长审核
      </view>

      <!-- Application form -->
      <view v-else>
        <view class="section-title">申请留言（可选）</view>

        <view class="form-group">
          <textarea
            class="form-textarea"
            maxlength="300"
            placeholder="简单介绍您的教学经验和优势，帮助家长了解您…"
            v-model="message"
          />
          <text class="char-count">{{ message.length }} / 300</text>
        </view>

        <button
          class="btn-primary"
          :disabled="loading || alreadyApplied"
          @tap="handleApply"
        >
          {{ loading ? '提交中...' : '申请接单' }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.tags-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin: 16rpx 0;
}
.tag {
  background: #e8f0fd;
  color: #4a90e2;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}
.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.detail-key { font-size: 28rpx; color: #888; }
.detail-val { font-size: 28rpx; color: #333; font-weight: 500; }
.detail-desc {
  font-size: 28rpx;
  color: #555;
  line-height: 1.7;
  margin-top: 12rpx;
  display: block;
}
.applied-notice {
  background: #e8f5e9;
  color: #27ae60;
  padding: 24rpx 32rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 32rpx;
  text-align: center;
}
.char-count {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: #aaa;
  margin-top: 8rpx;
}
</style>
