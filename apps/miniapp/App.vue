<script setup>
// Root component — no logic here; all app init happens in main.js via initStore()
</script>

<template>
  <page />
</template>

<style lang="scss">
@import './uni.scss';

page {
  background-color: #f5f7fa;
  font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
  font-size: 28rpx;
  color: #333;
}

.page-container {
  padding: 32rpx;
}

/* ── Buttons ── */
.btn-primary {
  background: #4a90e2;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  font-weight: 600;
  width: 100%;
  margin-bottom: 24rpx;
}
.btn-secondary {
  background: #fff;
  color: #4a90e2;
  border: 2rpx solid #4a90e2;
  border-radius: 12rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  width: 100%;
  margin-bottom: 24rpx;
}
.btn-danger {
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  padding: 0 32rpx;
}
.btn-success {
  background: #27ae60;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  padding: 0 32rpx;
}
.btn-sm {
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
  padding: 0 24rpx;
  border-radius: 8rpx;
}

/* ── Form ── */
.form-group {
  margin-bottom: 32rpx;
}
.form-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}
.form-input {
  width: 100%;
  height: 88rpx;
  background: #fff;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}
.form-input:focus {
  border-color: #4a90e2;
}
.form-textarea {
  width: 100%;
  background: #fff;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 30rpx;
  box-sizing: border-box;
  min-height: 160rpx;
}

/* ── Cards ── */
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 12rpx;
}
.card-meta {
  font-size: 26rpx;
  color: #888;
  margin-bottom: 8rpx;
}

/* ── Status badges ── */
.badge {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 600;
}
.badge-open     { background: #e8f5e9; color: #27ae60; }
.badge-closed   { background: #fce4ec; color: #e53935; }
.badge-pending  { background: #fff8e1; color: #f39c12; }
.badge-accepted { background: #e8f5e9; color: #27ae60; }
.badge-rejected { background: #fce4ec; color: #e53935; }
.badge-verified { background: #e3f2fd; color: #1976d2; }

/* ── Misc ── */
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #444;
  margin-bottom: 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #4a90e2;
}
.empty-tip {
  text-align: center;
  color: #aaa;
  font-size: 28rpx;
  padding: 80rpx 0;
}
.link-text {
  color: #4a90e2;
  font-size: 28rpx;
  text-decoration: underline;
  text-align: center;
  display: block;
  margin-top: 16rpx;
}
.divider {
  border: none;
  border-top: 1rpx solid #eee;
  margin: 24rpx 0;
}
</style>
