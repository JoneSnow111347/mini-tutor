<script setup>
/**
 * pages/parent/view-applications — Applications for a Demand
 *
 * Purpose:
 *   Lists all teacher applications for a specific demand.
 *   Accept and reject actions update the application status in-place.
 *
 * Route param:
 *   demandId — the demand whose applications to show (from URL query)
 *
 * API:
 *   GET /api/applies?demand_id=X
 *   Response: { success: true, data: Apply[] }
 *
 *   PUT /api/applies/:id  { status: 'accepted' | 'rejected' }
 *   Response: { success: true, data: Apply }
 *
 *   GET /api/demands/:id  — to show demand title in header
 */

import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/utils/request.js'

const demandId    = ref(null)
const demandTitle = ref('')
const applies     = ref([])
const loading     = ref(false)

onLoad(async (options) => {
  demandId.value = Number(options.demandId)

  // Load demand title for display
  try {
    const dr = await api.getDemand(demandId.value)
    demandTitle.value = dr.data.title
  } catch (_) {}

  fetchApplications()
})

async function fetchApplications() {
  loading.value = true
  try {
    // GET /api/applies?demand_id=X
    const res = await api.listApplies({ demand_id: demandId.value })
    applies.value = res.data
  } catch (_) {
    applies.value = []
  } finally {
    loading.value = false
  }
}

async function handleDecision(apply, decision) {
  const label = decision === 'accepted' ? '接受' : '拒绝'
  wx.showModal({
    title: `确认${label}`,
    content: `确定要${label}这位老师的申请吗？`,
    confirmText: label,
    confirmColor: decision === 'accepted' ? '#27ae60' : '#e74c3c',
    success: async (res) => {
      if (!res.confirm) return
      try {
        // PUT /api/applies/:id  { status }
        const r = await api.updateApply(apply.id, decision)
        // Update in-place so the UI refreshes without a full reload
        const idx = applies.value.findIndex(a => a.id === apply.id)
        if (idx !== -1) applies.value[idx] = r.data
        wx.showToast({ title: `已${label}`, icon: 'success' })
      } catch (_) {}
    }
  })
}

function statusLabel(s) {
  const map = { pending: '待处理', accepted: '已接受', rejected: '未通过' }
  return map[s] || s
}
function statusBadge(s) {
  return `badge badge-${s}`
}
function formatDate(iso) {
  return iso ? iso.slice(0, 10) : ''
}
</script>

<template>
  <view class="page-container">
    <!-- Demand context header -->
    <view class="card demand-header">
      <text class="card-meta">需求</text>
      <text class="card-title">{{ demandTitle || `#${demandId}` }}</text>
    </view>

    <!-- Empty state -->
    <view v-if="!loading && applies.length === 0" class="empty-tip">
      暂时没有老师申请这个需求
    </view>

    <!-- Application cards -->
    <view v-for="apply in applies" :key="apply.id" class="card">
      <view class="apply-row">
        <view>
          <text class="card-meta">老师 ID：{{ apply.teacher_user_id }}</text>
          <text class="card-meta">申请时间：{{ formatDate(apply.createdAt) }}</text>
        </view>
        <text :class="statusBadge(apply.status)">{{ statusLabel(apply.status) }}</text>
      </view>

      <view v-if="apply.message" class="apply-message">
        <text class="form-label" style="margin-bottom:4rpx;">申请留言</text>
        <text class="message-text">{{ apply.message }}</text>
      </view>

      <!-- Action buttons — only shown for pending applications -->
      <view v-if="apply.status === 'pending'" class="apply-actions">
        <button class="btn-success btn-sm" @tap="handleDecision(apply, 'accepted')">
          ✓ 接受
        </button>
        <button class="btn-danger btn-sm" @tap="handleDecision(apply, 'rejected')">
          ✗ 拒绝
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.demand-header { margin-bottom: 32rpx; }
.apply-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}
.apply-message {
  background: #f9f9f9;
  border-radius: 8rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}
.message-text {
  font-size: 28rpx;
  color: #555;
  line-height: 1.6;
}
.apply-actions {
  display: flex;
  gap: 16rpx;
}
</style>
