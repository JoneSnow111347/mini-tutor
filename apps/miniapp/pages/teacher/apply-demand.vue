<script setup>
import { onLoad } from '@dcloudio/uni-app'
import { bridgeToNative } from '@/utils/session-bridge.js'

onLoad((options) => {
  bridgeToNative()
  const demandId = options.demandId || ''
  wx.redirectTo({ url: `/pages/apply-demand/apply-demand?demandId=${demandId}` })
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
