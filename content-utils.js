(() => {
  const YRTC = (window.YRTC = window.YRTC || {});

  YRTC.constants = {
    STORAGE_KEY: "enabled",
    PANEL_ID: "yrtc-panel",
    OVERLAY_TRIGGER_ID: "yrtc-video-trigger",
    DEFAULT_STATE: { enabled: true },
    UPDATE_INTERVAL_MS: 500,
    RATE_CACHE_GRACE_MS: 900
  };

  /**
   * @typedef {Object} VideoAdapter
   * @property {() => HTMLVideoElement | null} findVideo
   * @property {(video: HTMLVideoElement | null) => HTMLElement | null} findTrigger
   * @property {(trigger: HTMLElement) => boolean} areControlsVisible
   * @property {(video: HTMLVideoElement | null) => number | null} [getPlaybackRate]
   * @property {(trigger: HTMLElement) => DOMRect | null} [getTriggerRect]
   * @property {(trigger: HTMLElement, panel: HTMLElement) => { left: number, top: number } | false | null} [getPanelPosition]
   * @property {(target: HTMLElement, video: HTMLVideoElement | null) => void} [afterUpdate]
   * @property {() => void} [cleanup]
   */

  function formatDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
      return "--:--";
    }

    const rounded = Math.ceil(totalSeconds);
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const seconds = rounded % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function formatRate(rate) {
    if (!Number.isFinite(rate) || rate <= 0) {
      return "1x";
    }

    return Number.isInteger(rate) ? `${rate}x` : `${rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}x`;
  }

  function findActiveVideo() {
    const videos = [...document.querySelectorAll("video")];
    return (
      videos.find((video) => !video.paused && video.readyState > 0) ||
      videos.find((video) => video.readyState > 0) ||
      null
    );
  }

  function isUsableVideo(video) {
    return !!video && Number.isFinite(video.duration) && video.duration > 0 && Number.isFinite(video.currentTime);
  }

  function getVideoRate(video) {
    const rate = Number(video?.playbackRate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }

  function isVisibleRect(rect) {
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight
    );
  }

  function findPlayerRect(video) {
    if (!video?.isConnected) {
      return null;
    }

    const videoRect = video.getBoundingClientRect();
    let bestRect = isVisibleRect(videoRect) ? videoRect : null;
    let parent = video.parentElement;

    while (parent && parent !== document.body && parent !== document.documentElement) {
      const rect = parent.getBoundingClientRect();
      const containsVideo =
        rect.left <= videoRect.left &&
        rect.right >= videoRect.right &&
        rect.top <= videoRect.top &&
        rect.bottom >= videoRect.bottom;
      const fitsViewport = rect.width <= window.innerWidth + 2 && rect.height <= window.innerHeight + 2;

      if (containsVideo && fitsViewport && isVisibleRect(rect)) {
        bestRect = rect;
      }

      parent = parent.parentElement;
    }

    return bestRect;
  }

  function createOverlayController(id) {
    let overlay = null;

    function ensureOverlay() {
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = id;
        overlay.className = "yrtc-video-trigger";
        overlay.setAttribute("aria-label", "Real-time video duration");
        document.body.appendChild(overlay);
      }
      return overlay;
    }

    return {
      position(video, options = {}) {
        const rect = findPlayerRect(video) || options.fallbackRect?.();
        if (!rect) {
          return null;
        }

        const target = ensureOverlay();
        const widthRatio = options.widthRatio ?? 0.18;
        const minWidth = options.minWidth ?? 72;
        const maxWidth = options.maxWidth ?? 112;
        const width = Math.min(Math.max(rect.width * widthRatio, minWidth), maxWidth);
        const height = options.height ?? 48;
        const bottomOffset = options.bottomOffset ?? 72;
        const rightOffset = options.rightOffset ?? 24;
        const leftOffset = options.leftOffset ?? 24;
        const left =
          options.align === "right"
            ? rect.right - width - rightOffset
            : options.align === "left"
              ? rect.left + leftOffset
              : rect.left + rect.width / 2 - width / 2;
        const top = rect.bottom - height - bottomOffset;

        target.style.left = `${left}px`;
        target.style.top = `${top}px`;
        target.style.width = `${width}px`;
        target.style.height = `${height}px`;
        return target;
      },
      cleanup() {
        overlay?.remove();
        overlay = null;
      }
    };
  }

  function getVideoTopLeftPanelPosition(video, panel, fallbackRect) {
    const rect = findPlayerRect(video) || fallbackRect?.();
    if (!rect) {
      return null;
    }

    const viewportPadding = 12;
    const inset = 16;
    const left = Math.max(rect.left + inset, viewportPadding);
    const top = Math.max(rect.top + inset, viewportPadding);

    return { left, top };
  }

  YRTC.format = {
    formatDuration,
    formatRate
  };

  YRTC.video = {
    findActiveVideo,
    findPlayerRect,
    isUsableVideo,
    getVideoRate,
    createOverlayController,
    getVideoTopLeftPanelPosition
  };

  YRTC.adapters = YRTC.adapters || {};
})();
