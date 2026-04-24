(() => {
  const YRTC = window.YRTC;
  const { findActiveVideo, getVideoRate } = YRTC.video;

  function createYouTubeAdapter() {
    return {
      findVideo: findActiveVideo,
      findTrigger() {
        return document.querySelector(".html5-video-player .ytp-left-controls .ytp-time-display");
      },
      areControlsVisible() {
        const player = document.querySelector(".html5-video-player");
        return !!player && !player.classList.contains("ytp-autohide");
      },
      getPlaybackRate(video) {
        const player = document.querySelector(".html5-video-player");
        if (!player || typeof player.getPlaybackRate !== "function") {
          return getVideoRate(video);
        }

        const rate = Number(player.getPlaybackRate());
        return Number.isFinite(rate) && rate > 0 ? rate : getVideoRate(video);
      },
      getTriggerRect(trigger) {
        return trigger?.querySelector(".ytp-time-wrapper")?.getBoundingClientRect() || trigger?.getBoundingClientRect() || null;
      }
    };
  }

  YRTC.adapters.createYouTubeAdapter = createYouTubeAdapter;
})();
