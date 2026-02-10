const FOOTER_HEIGHT = 220;
const CANVAS_WIDTH = 750;
const ADMIN_BASE_URL = 'http://127.0.0.1:8090';

Page({
  data: {
    posters: [],
    loading: false,
    generatingPosterId: '',
    userName: '',
    qrPath: '',
    qrUploaded: false,
    generatedPosters: {}
  },

  onLoad() {
    const userInfo = wx.getStorageSync('USER_INFO') || {};
    this.setData({
      userName: userInfo.nickName || userInfo.name || ''
    });
    this.fetchPosters();
  },

  onNameInput(e) {
    this.setData({
      userName: (e.detail.value || '').trim()
    });
  },

  onChooseQrImage() {
    this.chooseQrImage()
      .then((path) => {
        this.setData({
          qrPath: path,
          qrUploaded: true
        });
      })
      .catch(() => {});
  },

  fetchPosters() {
    this.setData({ loading: true });
    wx.request({
      url: `${ADMIN_BASE_URL}/res/poster/valid`,
      method: 'GET',
      success: (res) => {
        const list = this.normalizePosterList(res.data);
        this.setData({ posters: list });
      },
      fail: () => {
        wx.showToast({
          title: '海报加载失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },


  formatPosterUrl(url) {
    if (!url) {
      return '';
    }
    if (/^https?:\/\//.test(url)) {
      return url;
    }
    return `${ADMIN_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  },
  normalizePosterList(payload) {
    const source = Array.isArray(payload)
      ? payload
      : (payload && (payload.data || payload.list || payload.records)) || [];

    return source
      .map((item, index) => {
        const posterUrl = this.formatPosterUrl(item.posterUrl || item.imageUrl || item.url || item.cover);
        if (!posterUrl) {
          return null;
        }
        return {
          id: item.id || item.posterId || `poster_${index}`,
          posterUrl,
          canvasId: `posterCanvas${index}`
        };
      })
      .filter(Boolean);
  },

  async onGeneratePoster(e) {
    const { posterId, posterUrl, canvasId } = e.currentTarget.dataset;
    if (!posterUrl || !canvasId) {
      return;
    }

    if (!this.data.userName) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ generatingPosterId: posterId });

      let qrPath = this.data.qrPath;
      if (!qrPath) {
        qrPath = await this.chooseQrImage();
        this.setData({
          qrPath,
          qrUploaded: true
        });
      }

      wx.showLoading({ title: '正在生成' });
      const tempPath = await this.buildPoster(posterUrl, qrPath, this.data.userName, canvasId);
      this.setData({
        generatedPosters: {
          ...this.data.generatedPosters,
          [posterId]: tempPath
        }
      });
      wx.showToast({ title: '生成成功', icon: 'success' });
    } catch (error) {
      if (error && error.message !== 'USER_CANCEL') {
        wx.showToast({
          title: '生成失败，请重试',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ generatingPosterId: '' });
      wx.hideLoading();
    }
  },

  chooseQrImage() {
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const [path] = res.tempFilePaths || [];
          if (path) {
            resolve(path);
          } else {
            reject(new Error('USER_CANCEL'));
          }
        },
        fail: () => reject(new Error('USER_CANCEL'))
      });
    });
  },

  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: resolve,
        fail: reject
      });
    });
  },

  canvasToTempFilePath(canvasId, width, height) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvasId,
        width,
        height,
        destWidth: width,
        destHeight: height,
        fileType: 'jpg',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      }, this);
    });
  },

  async buildPoster(posterUrl, qrPath, userName, canvasId) {
    const [poster, qr] = await Promise.all([
      this.getImageInfo(posterUrl),
      this.getImageInfo(qrPath)
    ]);

    const canvasHeight = Math.floor((poster.height / poster.width) * CANVAS_WIDTH + FOOTER_HEIGHT);

    const ctx = wx.createCanvasContext(canvasId, this);
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    const posterHeight = canvasHeight - FOOTER_HEIGHT;
    ctx.drawImage(poster.path, 0, 0, CANVAS_WIDTH, posterHeight);

    ctx.setFillStyle('#111111');
    ctx.setFontSize(34);
    ctx.fillText(userName, 36, posterHeight + 72);

    ctx.setFillStyle('#666666');
    ctx.setFontSize(24);
    ctx.fillText('扫码了解更多', 36, posterHeight + 120);

    const qrSize = 140;
    const qrX = CANVAS_WIDTH - qrSize - 36;
    const qrY = posterHeight + 40;
    ctx.drawImage(qr.path, qrX, qrY, qrSize, qrSize);

    await new Promise((resolve) => ctx.draw(false, resolve));
    return this.canvasToTempFilePath(canvasId, CANVAS_WIDTH, canvasHeight);
  },

  onSavePoster(e) {
    const { posterId } = e.currentTarget.dataset;
    const filePath = this.data.generatedPosters[posterId];
    if (!filePath) {
      wx.showToast({
        title: '请先生成海报',
        icon: 'none'
      });
      return;
    }

    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '保存失败，请检查权限',
          icon: 'none'
        });
      }
    });
  }
});
