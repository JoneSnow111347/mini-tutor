Page({
  onLoad() {
    wx.redirectTo({ url: '/pages/register/register?role=parent' })
  },

  onPhoneInput() {},

  onNicknameInput() {},

  handleRegister() {
    wx.redirectTo({ url: '/pages/register/register?role=parent' })
  },

  goLogin() {
    wx.redirectTo({ url: '/pages/login/login' })
  },
})
