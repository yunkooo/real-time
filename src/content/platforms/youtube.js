(() => {
  const Realtime = window.Realtime;
  const { isVisibleElement } = Realtime.video;
  const { createVideoAdapter } = Realtime.adapters;
  const maxVideoRemainingSeconds = 12 * 60 * 60;

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

    function getLastSeekableEnd(video) {
      const seekable = video?.seekable;
      if (!seekable || seekable.length <= 0) {
        return null;
      }

      try {
        const end = Number(seekable.end(seekable.length - 1));
        return Number.isFinite(end) ? end : null;
      } catch (_error) {
        return null;
      }
    }

    function getLiveRemainingSeconds(video) {
      const liveEdge = getLastSeekableEnd(video);
      const currentTime = Number(video?.currentTime);
      if (liveEdge === null || !Number.isFinite(currentTime)) {
        return null;
      }

      const remaining = liveEdge - currentTime;
      return remaining > 0 ? clampRemainingSeconds(remaining) : null;
    }

    function getRemainingSeconds(video) {
      const rawRemaining = Math.max(video.duration - video.currentTime, 0);
      if (!isLiveStream()) {
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
