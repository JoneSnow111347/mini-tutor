<script setup>
import { onMounted } from 'vue'
import { bridgeToNative } from '@/utils/session-bridge.js'

onMounted(() => {
  bridgeToNative()
  wx.redirectTo({ url: '/pages/teacher-profile/edit-teacher' })
})
</script>

<template>
  <view class="page-container">
    <text>正在跳转...</text>
  </view>
</template>

<style scoped>
.page-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
</style>
