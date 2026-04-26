(() => {
  const RealTime = window.RealTime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition } = RealTime.video;

  function createYouTubeAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function findTimeDisplay() {
      return document.querySelector(".html5-video-player .ytp-left-controls .ytp-time-display");
    }

    return {
      isSupportedPage,
      findVideo: findActiveVideo,
      findTrigger() {
        return findTimeDisplay();
      },
      isTriggerVisible() {
        const player = document.querySelector(".html5-video-player");
        return !!player && !player.classList.contains("ytp-autohide");
      },
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel);
      }
    };
  }

  RealTime.adapters.createYouTubeAdapter = createYouTubeAdapter;
})();
