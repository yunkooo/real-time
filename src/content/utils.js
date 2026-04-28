(() => {
  const Realtime = (window.Realtime = window.Realtime || {});
  const settings = window.RealtimeSettings || {
    DEFAULT_STATE: { enabled: true, language: "en", panelPosition: "top-left" },
    PANEL_POSITIONS: [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "top-center",
      "bottom-center",
      "center-left",
      "center-center",
      "center-right"
    ],
    STORAGE_KEYS: {
      ENABLED: "enabled",
      LANGUAGE: "language",
      PANEL_POSITION: "panelPosition"
    },
    normalizePanelPosition(position) {
      return this.PANEL_POSITIONS.includes(position) ? position : this.DEFAULT_STATE.panelPosition;
    }
  };

  Realtime.constants = {
    DEFAULT_PANEL_POSITION: settings.DEFAULT_STATE[settings.STORAGE_KEYS.PANEL_POSITION],
    DEFAULT_STATE: settings.DEFAULT_STATE,
    LANGUAGE_KEY: settings.STORAGE_KEYS.LANGUAGE,
    PANEL_ID: "realtime-panel",
    PANEL_POSITION_KEY: settings.STORAGE_KEYS.PANEL_POSITION,
    PANEL_POSITIONS: settings.PANEL_POSITIONS,
    STORAGE_KEY: settings.STORAGE_KEYS.ENABLED,
    UPDATE_INTERVAL_MS: 500,
    RATE_CACHE_GRACE_MS: 900
  };

  /**
   * @typedef {Object} VideoAdapter
   * @property {() => HTMLVideoElement | null} findVideo
   * @property {() => boolean} [isSupportedPage]
   * @property {(video: HTMLVideoElement | null) => HTMLElement | null} [findTrigger]
   * @property {(video: HTMLVideoElement | null) => HTMLElement | null} [findPointerActivityTarget]
   * @property {"hover" | "pointer-activity"} [interactionMode]
   * @property {number} [pointerActivityHideDelayMs]
   * @property {boolean} [fallbackOnUnusableTrigger]
   * @property {(trigger: HTMLElement) => boolean} [isTriggerVisible]
   * @property {(video: HTMLVideoElement | null) => number | null} [getPlaybackRate]
   * @property {(video: HTMLVideoElement | null) => number | null} [getRemainingSeconds]
   * @property {(video: HTMLVideoElement | null, panel: HTMLElement, panelPosition: string) => { left: number, top: number } | false | null} [getPanelPosition]
   * @property {() => void} [cleanup]
   */

  /**
   * @typedef {Object} PlatformRegistration
   * @property {string} name
   * @property {(location: { host: string, pathname: string }) => boolean} isMatch
   * @property {(location: { host: string, pathname: string }) => VideoAdapter} create
   */

  const registeredPlatforms = [];

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
    const visibleVideos = videos.filter(isVisibleElement);
    return (
      visibleVideos.find((video) => !video.paused && video.readyState > 0) ||
      visibleVideos.find((video) => video.readyState > 0) ||
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

  function isVisibleElement(element) {
    if (!element?.isConnected) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
  }

  function findFirstVisibleElement(elements) {
    return elements.filter(Boolean).find(isVisibleElement) || null;
  }

  function parsePlaybackRateText(text) {
    const rate = Number.parseFloat(String(text || "").replace("배속", "").trim());
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

  function createRect(left, top, width, height) {
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height
    };
  }

  function getVideoElementRect(video, fallbackRect) {
    if (!video?.isConnected) {
      return fallbackRect?.() || null;
    }

    const videoRect = video.getBoundingClientRect();
    return isVisibleRect(videoRect) ? videoRect : fallbackRect?.() || null;
  }

  function getVideoFrameRect(video, fallbackRect) {
    const elementRect = getVideoElementRect(video, fallbackRect);
    if (!elementRect) {
      return null;
    }

    const videoWidth = Number(video?.videoWidth);
    const videoHeight = Number(video?.videoHeight);
    const hasIntrinsicSize = Number.isFinite(videoWidth) && videoWidth > 0 && Number.isFinite(videoHeight) && videoHeight > 0;

    if (!hasIntrinsicSize || elementRect.width <= 0 || elementRect.height <= 0) {
      return elementRect;
    }

    const objectFit = getComputedStyle(video).objectFit;
    if (objectFit === "fill" || objectFit === "cover") {
      return elementRect;
    }

    const frameRatio = videoWidth / videoHeight;
    const elementRatio = elementRect.width / elementRect.height;

    if (elementRatio > frameRatio) {
      const width = elementRect.height * frameRatio;
      return createRect(elementRect.left + (elementRect.width - width) / 2, elementRect.top, width, elementRect.height);
    }

    const height = elementRect.width / frameRatio;
    return createRect(elementRect.left, elementRect.top + (elementRect.height - height) / 2, elementRect.width, height);
  }

  function isPointInsideVideoSurface(video, x, y) {
    const parent = video?.parentElement;
    if (!parent) {
      return false;
    }

    return document.elementsFromPoint(x, y).some((element) => element === video || parent.contains(element));
  }

  function getVisibleVideoFrameRect(video, fallbackRect) {
    const frameRect = getVideoFrameRect(video, fallbackRect);
    if (!frameRect || !video?.isConnected) {
      return frameRect;
    }

    const viewportPadding = 1;
    const sampleX = Math.min(Math.max(frameRect.left + 24, viewportPadding), window.innerWidth - viewportPadding);
    const startY = Math.max(frameRect.top, 0);
    const endY = Math.min(frameRect.bottom, window.innerHeight);

    for (let y = startY; y <= endY; y += 8) {
      if (isPointInsideVideoSurface(video, sampleX, y)) {
        return createRect(frameRect.left, y, frameRect.width, frameRect.bottom - y);
      }
    }

    return frameRect;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getPanelSize(panel) {
    const rect = panel?.getBoundingClientRect?.();
    return {
      height: rect?.height || 0,
      width: rect?.width || 0
    };
  }

  function getVideoPanelPosition(video, panel, fallbackRect, panelPosition) {
    const rect = getVisibleVideoFrameRect(video, fallbackRect);
    if (!rect) {
      return false;
    }

    const position = settings.normalizePanelPosition(panelPosition);
    const panelSize = getPanelSize(panel);
    const viewportPadding = 12;
    const inset = 16;
    const centerLeft = rect.left + (rect.width - panelSize.width) / 2;
    const centerTop = rect.top + (rect.height - panelSize.height) / 2;

    const positions = {
      "bottom-center": {
        left: centerLeft,
        top: rect.bottom - panelSize.height - inset
      },
      "bottom-left": {
        left: rect.left + inset,
        top: rect.bottom - panelSize.height - inset
      },
      "bottom-right": {
        left: rect.right - panelSize.width - inset,
        top: rect.bottom - panelSize.height - inset
      },
      "center-left": {
        left: rect.left + inset,
        top: centerTop
      },
      "center-center": {
        left: centerLeft,
        top: centerTop
      },
      "center-right": {
        left: rect.right - panelSize.width - inset,
        top: centerTop
      },
      "top-center": {
        left: centerLeft,
        top: rect.top + inset
      },
      "top-left": {
        left: rect.left + inset,
        top: rect.top + inset
      },
      "top-right": {
        left: rect.right - panelSize.width - inset,
        top: rect.top + inset
      }
    };

    const target = positions[position] || positions["top-left"];
    const maxLeft = Math.max(viewportPadding, window.innerWidth - panelSize.width - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - panelSize.height - viewportPadding);
    const left = clamp(target.left, viewportPadding, maxLeft);
    const top = clamp(target.top, viewportPadding, maxTop);

    return { left, top };
  }

  function getVideoTopLeftPanelPosition(video, panel, fallbackRect) {
    return getVideoPanelPosition(video, panel, fallbackRect, "top-left");
  }

  Realtime.format = {
    formatDuration,
    formatRate
  };

  Realtime.video = {
    findActiveVideo,
    getVideoFrameRect,
    isVisibleElement,
    isUsableVideo,
    getVideoRate,
    getVideoPanelPosition,
    getVideoTopLeftPanelPosition
  };

  Realtime.dom = {
    findFirstVisibleElement,
    parsePlaybackRateText
  };

  Realtime.adapters = Realtime.adapters || {};

  Realtime.adapters.registerPlatform = function registerPlatform(platform) {
    if (!platform?.name || typeof platform.isMatch !== "function" || typeof platform.create !== "function") {
      return;
    }

    registeredPlatforms.push(platform);
  };

  Realtime.adapters.createAdapterForCurrentPage = function createAdapterForCurrentPage() {
    const location = {
      host: window.location.hostname,
      pathname: window.location.pathname
    };
    const platform = registeredPlatforms.find((candidate) => candidate.isMatch(location));
    return platform?.create(location) || null;
  };

  Realtime.adapters.createVideoAdapter = function createVideoAdapter(overrides = {}, options = {}) {
    const interactionMode = overrides.interactionMode || (overrides.findPointerActivityTarget ? "pointer-activity" : "hover");

    return {
      findVideo: findActiveVideo,
      interactionMode,
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel, panelPosition) {
        return getVideoPanelPosition(video, panel, options.getFallbackRect, panelPosition);
      },
      ...overrides
    };
  };
})();
