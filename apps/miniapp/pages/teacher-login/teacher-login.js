Page({
  onLoad() {
    wx.redirectTo({ url: '/pages/login/login?role=teacher' })
  },

  onPhoneInput() {},

  handleLogin() {
    wx.redirectTo({ url: '/pages/login/login?role=teacher' })
  },

  goRegister() {
    wx.redirectTo({ url: '/pages/register/register?role=teacher' })
  },
})
