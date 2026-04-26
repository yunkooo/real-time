(() => {
  const Realtime = window.Realtime;
  const { isVisibleElement } = Realtime.video;
  const { createVideoAdapter } = Realtime.adapters;
  const maxVideoRemainingSeconds = 12 * 60 * 60;
  const liveRemainingOffsetSeconds = 58 * 60 + 30;

  function createYouTubeAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function findTimeDisplay() {
      return document.querySelector(".html5-video-player .ytp-left-controls .ytp-time-display");
    }

    function isLiveStream() {
      return isVisibleElement(document.querySelector(".html5-video-player .ytp-live-badge"));
    }

    function clampRemainingSeconds(seconds) {
      return Math.min(seconds, maxVideoRemainingSeconds);
    }

    function getRemainingSeconds(video) {
      const rawRemaining = Math.max(video.duration - video.currentTime, 0);
      if (!isLiveStream()) {
        return clampRemainingSeconds(rawRemaining);
      }

      const adjustedRemaining = rawRemaining - liveRemainingOffsetSeconds;
      return adjustedRemaining > 0 ? clampRemainingSeconds(adjustedRemaining) : null;
    }

    return createVideoAdapter({
      isSupportedPage,
      findTrigger() {
        return findTimeDisplay();
      },
      isTriggerVisible() {
        const player = document.querySelector(".html5-video-player");
        return !!player && !player.classList.contains("ytp-autohide");
      },
      getRemainingSeconds
    });
  }

  Realtime.adapters.createYouTubeAdapter = createYouTubeAdapter;
})();
