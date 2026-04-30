<script setup>
/**
 * pages/parent/my-demands — Parent's Published Demands List
 *
 * Purpose:
 *   Lists all demands that belong to the logged-in parent (filtered client-side
 *   by user_id). Each card shows key info and actions:
 *   - 查看申请 → /pages/parent/view-applications?demandId=X
 *   - 关闭需求 → PUT /api/demands/:id  { status: 'closed' }
 *
 * API:
 *   GET /api/demands
 *   Response: { success: true, data: Demand[] }
 */

import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/utils/request.js'
import { state } from '@/store/index.js'

const demands = ref([])
const loading = ref(false)

// Reload every time the page shows (catches newly published demands)
onShow(() => { fetchMyDemands() })

async function fetchMyDemands() {
  loading.value = true
  try {
    const res = await api.listDemands()
    // Filter to only this parent's demands
    demands.value = res.data.filter(d => d.user_id === state.userId)
  } catch (_) {
    demands.value = []
  } finally {
    loading.value = false
  }
}

function goPublish() {
  wx.navigateTo({ url: '/pages/parent/publish-demand' })
}

function goViewApplications(demandId) {
  wx.navigateTo({ url: `/pages/parent/view-applications?demandId=${demandId}` })
}

async function closeDemand(demand) {
  if (demand.status === 'closed') return
  wx.showModal({
    title: '确认关闭',
    content: `关闭后老师将无法继续申请此需求，确认关闭「${demand.title}」吗？`,
    confirmText: '关闭',
    confirmColor: '#e74c3c',
    success: async (res) => {
      if (!res.confirm) return
      try {
        // PUT /api/demands/:id  { status: 'closed' }
        await api.updateDemand(demand.id, { status: 'closed' })
        demand.status = 'closed'
        wx.showToast({ title: '已关闭', icon: 'success' })
      } catch (_) {}
    }
  })
}

function statusLabel(s) {
  return s === 'open' ? '招募中' : '已关闭'
}
function statusBadge(s) {
  return s === 'open' ? 'badge-open' : 'badge-closed'
}
function formatDate(iso) {
  return iso ? iso.slice(0, 10) : ''
}
</script>

<template>
  <view class="page-container">
    <!-- Publish shortcut -->
    <button class="btn-primary" @tap="goPublish">＋ 发布新需求</button>

    <!-- Empty state -->
    <view v-if="!loading && demands.length === 0" class="empty-tip">
      还没有发布过需求，点击上方按钮开始发布
    </view>

    <!-- Demand cards -->
    <view v-for="d in demands" :key="d.id" class="card">
      <view class="card-row">
        <text class="card-title">{{ d.title }}</text>
        <text :class="['badge', statusBadge(d.status)]">{{ statusLabel(d.status) }}</text>
      </view>

      <text class="card-meta">科目：{{ d.subject }} · 年级：{{ d.grade_level }}</text>
      <text class="card-meta">地区：{{ d.area }} · {{ d.class_mode }}</text>
      <text class="card-meta">发布于 {{ formatDate(d.createdAt) }}</text>

      <hr class="divider" />

      <view class="card-actions">
        <button class="btn-primary btn-sm" @tap="goViewApplications(d.id)">
          查看申请
        </button>
        <button
          v-if="d.status === 'open'"
          class="btn-danger btn-sm"
          @tap="closeDemand(d)"
        >关闭需求</button>
        <text v-else style="color:#aaa;font-size:26rpx;">需求已关闭</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.card-actions {
  display: flex;
  gap: 16rpx;
  align-items: center;
  flex-wrap: wrap;
}
</style>
