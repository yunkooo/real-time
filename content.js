(() => {
  const STORAGE_KEY = "enabled";
  const PANEL_ID = "yrtc-panel";
  const VIMEO_TRIGGER_ID = "yrtc-vimeo-trigger";
  const DEFAULT_STATE = { [STORAGE_KEY]: true };
  const UPDATE_INTERVAL_MS = 500;
  const RATE_CACHE_GRACE_MS = 900;

  let enabled = true;
  let updateTimer = null;
  let mutationObserver = null;
  let currentVideo = null;
  let triggerElement = null;
  let lastKnownRate = 1;
  let lastRateChangedAt = 0;
  let lastPointerX = null;
  let lastPointerY = null;
  let pendingUpdateFrame = null;
  let removeTriggerListeners = null;
  let removeVideoListeners = null;

  function readSetting() {
    return chrome.storage.sync
      .get(DEFAULT_STATE)
      .then((items) => {
        enabled = items[STORAGE_KEY] !== false;
      })
      .catch(() => {
        enabled = true;
      });
  }

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

  function getPlaybackRate(video, adapter) {
    const adapterRate = adapter.getPlaybackRate?.(video) || null;
    const videoRate = getVideoRate(video);
    const nextRate = adapterRate || videoRate;

    if (!nextRate) {
      return lastKnownRate;
    }

    const now = Date.now();
    const isLikelyTransientReset =
      nextRate === 1 && lastKnownRate !== 1 && now - lastRateChangedAt < RATE_CACHE_GRACE_MS;

    if (isLikelyTransientReset) {
      return lastKnownRate;
    }

    if (nextRate !== lastKnownRate) {
      lastKnownRate = nextRate;
      lastRateChangedAt = now;
    }

    return nextRate;
  }

  function getTimeModel(video, adapter) {
    if (!isUsableVideo(video)) {
      return null;
    }

    const rate = getPlaybackRate(video, adapter);
    const remaining = Math.max(video.duration - video.currentTime, 0);

    return {
      rate,
      realRemaining: remaining / rate
    };
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "yrtc-panel";
    panel.setAttribute("role", "tooltip");
    return panel;
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPanel();
      document.body.appendChild(panel);
    }
    return panel;
  }

  function positionPanel(target, panel, adapter) {
    const panelPosition = adapter.getPanelPosition?.(target, panel);
    if (panelPosition) {
      panel.style.left = `${panelPosition.left}px`;
      panel.style.top = `${panelPosition.top}px`;
      return;
    }

    const rect = adapter.getTriggerRect?.(target) || target.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - panelRect.width / 2, viewportPadding),
      window.innerWidth - panelRect.width - viewportPadding
    );
    const top = Math.max(rect.top - panelRect.height - 10, viewportPadding);

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function updatePointerPosition(event) {
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }

  function isPointerOverTrigger(trigger, adapter) {
    if (!trigger?.isConnected || lastPointerX === null || lastPointerY === null) {
      return false;
    }

    const rect = adapter.getTriggerRect?.(trigger) || trigger.getBoundingClientRect();
    if (!rect) {
      return false;
    }

    return (
      lastPointerX >= rect.left &&
      lastPointerX <= rect.right &&
      lastPointerY >= rect.top &&
      lastPointerY <= rect.bottom
    );
  }

  function setPanelContent(panel, model) {
    panel.innerHTML = `
      <div class="yrtc-panel-title">Adjusted time</div>
      <div class="yrtc-row"><span>Speed</span><strong>${formatRate(model.rate)}</strong></div>
      <div class="yrtc-row"><span>Real time</span><strong>${formatDuration(model.realRemaining)}</strong></div>
    `;
  }

  function showPanel(adapter) {
    cleanupDisconnectedRefs();

    if (
      !enabled ||
      !triggerElement?.isConnected ||
      !adapter.areControlsVisible(triggerElement) ||
      !isPointerOverTrigger(triggerElement, adapter)
    ) {
      hidePanel();
      return;
    }

    const video = adapter.findVideo();
    const model = getTimeModel(video, adapter);
    if (!model) {
      hidePanel();
      return;
    }

    const panel = ensurePanel();
    setPanelContent(panel, model);
    panel.classList.add("yrtc-panel-visible");
    positionPanel(triggerElement, panel, adapter);
  }

  function hidePanel() {
    document.getElementById(PANEL_ID)?.classList.remove("yrtc-panel-visible");
  }

  function isPanelVisible() {
    return document.getElementById(PANEL_ID)?.classList.contains("yrtc-panel-visible") === true;
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function bindTrigger(target, adapter) {
    if (triggerElement === target) {
      return;
    }

    removeTriggerListeners?.();
    triggerElement = target;
    triggerElement.classList.add("yrtc-time-trigger");

    const handleMouseEnter = (event) => {
      updatePointerPosition(event);
      if (isPointerOverTrigger(target, adapter)) {
        showPanel(adapter);
      }
    };
    const handleMouseLeave = () => hidePanel();

    triggerElement.addEventListener("mouseenter", handleMouseEnter);
    triggerElement.addEventListener("mouseleave", handleMouseLeave);

    removeTriggerListeners = () => {
      target.classList.remove("yrtc-time-trigger");
      target.removeEventListener("mouseenter", handleMouseEnter);
      target.removeEventListener("mouseleave", handleMouseLeave);
      removeTriggerListeners = null;
      if (triggerElement === target) {
        triggerElement = null;
      }
    };
  }

  function bindVideo(video, adapter) {
    if (currentVideo === video && removeVideoListeners) {
      return;
    }

    removeVideoListeners?.();
    currentVideo = video;

    if (!video) {
      removeVideoListeners = null;
      return;
    }

    const boundVideo = video;
    const handleVideoUpdate = () => {
      if (isPanelVisible()) {
        showPanel(adapter);
      }
    };

    boundVideo.addEventListener("ratechange", handleVideoUpdate);
    boundVideo.addEventListener("timeupdate", handleVideoUpdate);
    boundVideo.addEventListener("loadedmetadata", handleVideoUpdate);

    removeVideoListeners = () => {
      boundVideo.removeEventListener("ratechange", handleVideoUpdate);
      boundVideo.removeEventListener("timeupdate", handleVideoUpdate);
      boundVideo.removeEventListener("loadedmetadata", handleVideoUpdate);
      removeVideoListeners = null;
      if (currentVideo === boundVideo) {
        currentVideo = null;
      }
    };
  }

  function cleanupDisconnectedRefs() {
    if (triggerElement && !triggerElement.isConnected) {
      removeTriggerListeners?.();
    }
    if (currentVideo && !currentVideo.isConnected) {
      removeVideoListeners?.();
    }
  }

  function removeUi(adapter) {
    removeTriggerListeners?.();
    removeVideoListeners?.();
    removePanel();
    adapter.cleanup?.();
  }

  function updateUi(adapter) {
    if (!enabled) {
      removeUi(adapter);
      return;
    }

    cleanupDisconnectedRefs();

    const video = adapter.findVideo();
    const target = adapter.findTrigger(video);

    if (!target || !getTimeModel(video, adapter)) {
      removeUi(adapter);
      return;
    }

    if (!adapter.areControlsVisible(target)) {
      hidePanel();
      return;
    }

    bindTrigger(target, adapter);
    bindVideo(video, adapter);
    adapter.afterUpdate?.(target, video);

    if (isPointerOverTrigger(target, adapter) || isPanelVisible()) {
      showPanel(adapter);
    }
  }

  function startUpdating(adapter) {
    stopUpdating();
    observePageChanges(adapter);
    updateTimer = window.setInterval(() => updateUi(adapter), UPDATE_INTERVAL_MS);
    updateUi(adapter);
  }

  function stopUpdating() {
    if (updateTimer) {
      window.clearInterval(updateTimer);
      updateTimer = null;
    }
    if (pendingUpdateFrame !== null) {
      window.cancelAnimationFrame(pendingUpdateFrame);
      pendingUpdateFrame = null;
    }
    mutationObserver?.disconnect();
    mutationObserver = null;
  }

  function scheduleUpdate(adapter) {
    if (pendingUpdateFrame !== null) {
      return;
    }

    pendingUpdateFrame = window.requestAnimationFrame(() => {
      pendingUpdateFrame = null;
      updateUi(adapter);
    });
  }

  function observePageChanges(adapter) {
    mutationObserver?.disconnect();
    mutationObserver = new MutationObserver(() => scheduleUpdate(adapter));

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      subtree: true
    });
  }

  function bindStorageChanges(adapter) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
        return;
      }

      enabled = changes[STORAGE_KEY].newValue !== false;
      if (enabled) {
        startUpdating(adapter);
      } else {
        stopUpdating();
        removeUi(adapter);
      }
    });
  }

  function bindGlobalEvents(adapter) {
    window.addEventListener(
      "mousemove",
      (event) => {
        if (!enabled) {
          return;
        }

        updatePointerPosition(event);

        if (triggerElement && !isPanelVisible() && isPointerOverTrigger(triggerElement, adapter)) {
          showPanel(adapter);
        } else if (triggerElement && isPanelVisible() && !isPointerOverTrigger(triggerElement, adapter)) {
          hidePanel();
        }
      },
      { passive: true }
    );

    window.addEventListener("resize", () => {
      const panel = document.getElementById(PANEL_ID);
      if (panel?.classList.contains("yrtc-panel-visible") && triggerElement) {
        positionPanel(triggerElement, panel, adapter);
      }
    });
  }

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

  function createVimeoAdapter() {
    let overlay = null;

    function ensureOverlay() {
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = VIMEO_TRIGGER_ID;
        overlay.className = "yrtc-vimeo-trigger";
        overlay.setAttribute("aria-label", "Real-time video duration");
        document.body.appendChild(overlay);
      }
      return overlay;
    }

    function positionOverlay(video) {
      if (!video?.isConnected) {
        return null;
      }

      const rect = video.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      const target = ensureOverlay();

      const width = Math.min(Math.max(rect.width * 0.18, 64), 96);
      const height = 44;
      const left = rect.left + rect.width / 2 - width / 2;
      const top = rect.bottom - height - 58;

      target.style.left = `${left}px`;
      target.style.top = `${top}px`;
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
      return target;
    }

    return {
      findVideo: findActiveVideo,
      findTrigger(video) {
        return positionOverlay(video);
      },
      areControlsVisible(trigger) {
        return document.visibilityState === "visible" && !!trigger?.isConnected;
      },
      getPlaybackRate: getVideoRate,
      getTriggerRect(trigger) {
        return trigger?.getBoundingClientRect() || null;
      },
      getPanelPosition(trigger, panel) {
        const triggerRect = trigger?.getBoundingClientRect();
        if (!triggerRect) {
          return null;
        }

        const panelRect = panel.getBoundingClientRect();
        const viewportPadding = 12;
        const belowProgressOffset = 20;
        const left = Math.min(
          Math.max(triggerRect.left + triggerRect.width / 2 - panelRect.width / 2, viewportPadding),
          window.innerWidth - panelRect.width - viewportPadding
        );
        const top = Math.min(
          Math.max(triggerRect.bottom + belowProgressOffset, viewportPadding),
          window.innerHeight - panelRect.height - viewportPadding
        );

        return { left, top };
      },
      afterUpdate(target, video) {
        positionOverlay(video);
      },
      cleanup() {
        overlay?.remove();
        overlay = null;
      }
    };
  }

  function createAdapter() {
    const host = window.location.hostname;
    if (host === "www.youtube.com" || host === "youtube.com" || host.endsWith(".youtube.com")) {
      return createYouTubeAdapter();
    }

    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      return createVimeoAdapter();
    }

    return null;
  }

  async function init() {
    const adapter = createAdapter();
    if (!adapter) {
      return;
    }

    await readSetting();
    bindStorageChanges(adapter);
    bindGlobalEvents(adapter);

    if (enabled) {
      startUpdating(adapter);
    }
  }

  init();
})();
