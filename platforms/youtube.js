(() => {
  const Realtime = window.Realtime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition } = Realtime.video;
  const maxVideoRemainingSeconds = 12 * 60 * 60;
  const liveRemainingOffsetSeconds = 58 * 60 + 30;

  function createYouTubeAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function findTimeDisplay() {
      return document.querySelector(".html5-video-player .ytp-left-controls .ytp-time-display");
    }

    function isLiveStream() {
      return !!document.querySelector(".html5-video-player .ytp-live-badge");
    }

    function clampRemainingSeconds(seconds) {
      return Math.min(seconds, maxVideoRemainingSeconds);
    }

    function getRemainingSeconds(video) {
      const remaining = clampRemainingSeconds(Math.max(video.duration - video.currentTime, 0));
      if (!isLiveStream()) {
        return remaining;
      }

      const adjustedRemaining = remaining - liveRemainingOffsetSeconds;
      return adjustedRemaining > 0 ? adjustedRemaining : null;
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
      getRemainingSeconds,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel);
      }
    };
  }

  Realtime.adapters.createYouTubeAdapter = createYouTubeAdapter;
})();
