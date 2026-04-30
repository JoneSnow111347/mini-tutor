function stopPagePolling(page) {
  if (!page) return
  if (typeof page.stopPolling === 'function') page.stopPolling()
  if (typeof page._stopPolling === 'function') page._stopPolling()
  if (page._pollTimer) {
    clearInterval(page._pollTimer)
    page._pollTimer = null
  }
}

function confirmLogout(page) {
  wx.showModal({
    title: '退出登录',
    content: '确定退出当前账号吗？',
    confirmText: '退出登录',
    cancelText: '取消',
    confirmColor: '#ff3b30',
    success(res) {
      if (!res.confirm) return
      stopPagePolling(page)
      getApp().logout()
    },
  })
}

module.exports = {
  stopPagePolling,
  confirmLogout,
}
