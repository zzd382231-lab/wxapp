// app.js
const { getCode,appletsLogin } = require('./utils/request')

App({
  onLaunch: async function(options) {
    let {scene } = options;
    let isSinglePage = scene === 1154; //是否单页面应用
    this.globalData.isSinglePage = isSinglePage
    //console.log('是否是单页应用：', this.globalData.isSinglePage, scene, options);
    if (!isSinglePage) {
      if (wx.getStorageSync('TOKEN_KEY')) {
        let code = await getCode()
        let res = await appletsLogin(code).catch(() => {
          console.log('没有用户信息')
        })
      }
      
      //由于获取用户信息是异步的 可能会在Page.onLoad 后返回
      // 所以此处加上callback回调方法 以获取最新数据
      // if (this.userInfoReadyCallback) {
      //   this.userInfoReadyCallback({userInfo: this.globalData.userInfo})
      // }
    }

    // 放在onshow 偶尔更新不到
    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate(function (res) {
      // 请求完新版本信息的回调
      if (res.hasUpdate) {
        updateManager.onUpdateReady(function () {
          updateManager.applyUpdate();
        });
      }
    });
  },
  onShow: function() {
    let that = this;
    wx.getSystemInfo({
      success: res => {
        // that.globalData.headerBtnPosi = wx.getMenuButtonBoundingClientRect().top
        let modelmes = res.model;
        console.log(modelmes)
        let reg =  /^(iPhone (X|1[\d])|unknown)/;
        if (reg.test(modelmes)) {
          that.globalData.isIphoneX = true
        }
      }
    })
  },
  globalData: {
    userInfo: wx.getStorageSync('USER_INFO') || {},
    systemInfo: {
      ...wx.getSystemInfoSync()
    }
  }
})
