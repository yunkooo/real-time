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
      },
      getPanelPosition(trigger, panel) {
        const triggerRect = this.getTriggerRect(trigger);
        if (!triggerRect) {
          return false;
        }

        const panelRect = panel.getBoundingClientRect();
        const left = triggerRect.right - panelRect.width;
        const top = triggerRect.bottom - panelRect.height;
        const hasRoom =
          left >= 0 &&
          top >= 0 &&
          left + panelRect.width <= window.innerWidth &&
          top + panelRect.height <= window.innerHeight;

        return hasRoom ? { left, top } : false;
      }
    };
  }

  YRTC.adapters.createYouTubeAdapter = createYouTubeAdapter;
})();
