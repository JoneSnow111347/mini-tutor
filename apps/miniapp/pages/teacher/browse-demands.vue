<script setup>
/**
 * pages/teacher/browse-demands — Browse Open Demands
 *
 * Purpose:
 *   Lists all demands with status 'open'. Teacher can tap a card to apply.
 *   Client-side filter on status === 'open' since the backend returns all records.
 *
 * API:
 *   GET /api/demands
 *   Response: { success: true, data: Demand[] }
 *
 * Navigation:
 *   → /pages/teacher/apply-demand?demandId=X
 */

import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/utils/request.js'

const demands = ref([])
const loading = ref(false)
const keyword = ref('')

onShow(() => { fetchDemands() })

async function fetchDemands() {
  loading.value = true
  try {
    // GET /api/demands — returns all; filter open client-side
    const res = await api.listDemands()
    demands.value = res.data.filter(d => d.status === 'open')
  } catch (_) {
    demands.value = []
  } finally {
    loading.value = false
  }
}

// Client-side search filter
const filteredDemands = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return demands.value
  return demands.value.filter(d =>
    d.title.toLowerCase().includes(kw) ||
    d.subject.toLowerCase().includes(kw) ||
    d.area.toLowerCase().includes(kw)
  )
})

function goApply(demandId) {
  wx.navigateTo({ url: `/pages/teacher/apply-demand?demandId=${demandId}` })
}

function formatDate(iso) {
  return iso ? iso.slice(0, 10) : ''
}
</script>

<template>
  <view class="page-container">
    <!-- Search bar -->
    <view class="search-bar">
      <input
        class="search-input"
        type="text"
        placeholder="搜索科目、标题或地区…"
        v-model="keyword"
      />
    </view>

    <!-- Empty state -->
    <view v-if="!loading && filteredDemands.length === 0" class="empty-tip">
      暂时没有符合条件的需求
    </view>

    <!-- Demand cards -->
    <view
      v-for="d in filteredDemands"
      :key="d.id"
      class="card demand-card"
      @tap="goApply(d.id)"
    >
      <view class="card-row">
        <text class="card-title">{{ d.title }}</text>
        <text class="badge badge-open">招募中</text>
      </view>

      <view class="tags-row">
        <text class="tag">{{ d.subject }}</text>
        <text class="tag">{{ d.grade_level }}</text>
        <text class="tag">{{ d.class_mode }}</text>
      </view>

      <text class="card-meta">📍 {{ d.area }}</text>
      <text class="card-meta desc-preview">{{ d.description?.slice(0, 60) }}…</text>
      <text class="card-meta" style="margin-top:8rpx;">发布于 {{ formatDate(d.createdAt) }}</text>

      <view class="apply-hint">
        <text>点击申请接单 →</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.search-bar {
  margin-bottom: 32rpx;
}
.search-input {
  width: 100%;
  height: 80rpx;
  background: #fff;
  border: 2rpx solid #e0e0e0;
  border-radius: 40rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.demand-card { cursor: pointer; }
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.tags-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}
.tag {
  background: #e8f0fd;
  color: #4a90e2;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}
.desc-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.apply-hint {
  margin-top: 16rpx;
  text-align: right;
  font-size: 26rpx;
  color: #4a90e2;
}
</style>
