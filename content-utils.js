(() => {
  const RealTime = (window.RealTime = window.RealTime || {});

  RealTime.constants = {
    STORAGE_KEY: "enabled",
    PANEL_ID: "realtime-panel",
    DEFAULT_STATE: { enabled: true },
    UPDATE_INTERVAL_MS: 500,
    RATE_CACHE_GRACE_MS: 900
  };

  /**
   * @typedef {Object} VideoAdapter
   * @property {() => HTMLVideoElement | null} findVideo
   * @property {() => boolean} [isSupportedPage]
   * @property {(video: HTMLVideoElement | null) => HTMLElement | null} [findTrigger]
   * @property {(trigger: HTMLElement) => boolean} [isTriggerVisible]
   * @property {(video: HTMLVideoElement | null) => number | null} [getPlaybackRate]
   * @property {(trigger: HTMLElement) => DOMRect | null} [getTriggerRect]
   * @property {(video: HTMLVideoElement | null, panel: HTMLElement) => { left: number, top: number } | false | null} [getPanelPosition]
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

  function getVideoTopLeftPanelPosition(video, _panel, fallbackRect) {
    const rect = getVisibleVideoFrameRect(video, fallbackRect);
    if (!rect) {
      return false;
    }

    const viewportPadding = 12;
    const inset = 16;
    const left = Math.max(rect.left + inset, viewportPadding);
    const top = Math.max(rect.top + inset, viewportPadding);

    return { left, top };
  }

  RealTime.format = {
    formatDuration,
    formatRate
  };

  RealTime.video = {
    findActiveVideo,
    getVideoFrameRect,
    isVisibleElement,
    isUsableVideo,
    getVideoRate,
    getVideoTopLeftPanelPosition
  };

  RealTime.adapters = RealTime.adapters || {};
})();
