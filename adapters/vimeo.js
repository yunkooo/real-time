(() => {
  const YRTC = window.YRTC;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition } = YRTC.video;

  function createVimeoAdapter() {
    function getFallbackRect() {
      if (window.location.hostname !== "player.vimeo.com") {
        return null;
      }

      return {
        left: 0,
        right: window.innerWidth,
        top: 0,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight
      };
    }

    return {
      findVideo: findActiveVideo,
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel, getFallbackRect);
      }
    };
  }

  YRTC.adapters.createVimeoAdapter = createVimeoAdapter;
})();
