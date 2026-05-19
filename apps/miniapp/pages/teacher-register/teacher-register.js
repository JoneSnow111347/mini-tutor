Page({
  onLoad() {
    wx.redirectTo({ url: '/pages/register/register?role=teacher' })
  },

  onPhoneInput() {},

  onNicknameInput() {},

  onNameInput() {},

  onSubjectsInput() {},

  handleRegister() {
    wx.redirectTo({ url: '/pages/register/register?role=teacher' })
  },

  goLogin() {
    wx.redirectTo({ url: '/pages/login/login?role=teacher' })
  },
})
