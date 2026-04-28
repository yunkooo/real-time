(() => {
  const Realtime = window.Realtime;
  const { isVisibleElement } = Realtime.video;
  const { createVideoAdapter } = Realtime.adapters;
  const maxVideoRemainingSeconds = 12 * 60 * 60;
  const liveRemainingOffsetSeconds = 59 * 60 + 30;

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

    function getDurationRemainingSeconds(video) {
      const duration = Number(video?.duration);
      const currentTime = Number(video?.currentTime);
      if (!Number.isFinite(duration) || !Number.isFinite(currentTime)) {
        return null;
      }

      return Math.max(duration - currentTime, 0);
    }

    function getSeekableRemainingSeconds(video) {
      const seekable = video?.seekable;
      if (!seekable || seekable.length <= 0) {
        return null;
      }

      try {
        const end = Number(seekable.end(seekable.length - 1));
        const currentTime = Number(video?.currentTime);
        if (!Number.isFinite(end) || !Number.isFinite(currentTime)) {
          return null;
        }

        const remaining = end - currentTime;
        return remaining > 0 ? remaining : null;
      } catch (_error) {
        return null;
      }
    }

    function getRawRemainingSeconds(video) {
      return getDurationRemainingSeconds(video) ?? getSeekableRemainingSeconds(video);
    }

    function getLiveRemainingSeconds(video) {
      const rawRemaining = getRawRemainingSeconds(video);
      if (rawRemaining === null) {
        return null;
      }

      const adjustedRemaining = rawRemaining - liveRemainingOffsetSeconds;
      return adjustedRemaining > 0 ? clampRemainingSeconds(adjustedRemaining) : null;
    }

    function getRemainingSeconds(video) {
      if (!isLiveStream()) {
        const rawRemaining = getDurationRemainingSeconds(video);
        if (rawRemaining === null) {
          return null;
        }

        return clampRemainingSeconds(rawRemaining);
      }

      return getLiveRemainingSeconds(video);
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

  Realtime.adapters.registerPlatform({
    name: "youtube",
    isMatch({ host }) {
      return host === "www.youtube.com" || host === "youtube.com" || host.endsWith(".youtube.com");
    },
    create() {
      return createYouTubeAdapter({
        isSupportedPage() {
          return (
            window.location.pathname === "/watch" ||
            window.location.pathname.startsWith("/embed/") ||
            window.location.pathname.startsWith("/shorts/")
          );
        }
      });
    }
  });
})();
