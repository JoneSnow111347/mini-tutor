<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  wx.redirectTo({ url: '/pages/register/register?role=teacher' })
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
