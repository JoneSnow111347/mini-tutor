Page({
  onLoad() {
    wx.redirectTo({ url: '/pages/login/login' })
  },

  onPhoneInput() {},

  handleLogin() {
    wx.redirectTo({ url: '/pages/login/login' })
  },

  goRegister() {
    wx.redirectTo({ url: '/pages/register/register?role=parent' })
  },
})
