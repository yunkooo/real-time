(() => {
  const YRTC = window.YRTC;
  const {
    DEFAULT_STATE,
    RATE_CACHE_GRACE_MS,
    STORAGE_KEY,
    UPDATE_INTERVAL_MS
  } = YRTC.constants;
  const { createGenericAdapter, createVimeoAdapter, createYouTubeAdapter } = YRTC.adapters;
  const { isPanelVisible, ensurePanel, hidePanel, positionPanel, removePanel, setPanelContent } = YRTC.panel;
  const { getVideoRate, isUsableVideo } = YRTC.video;

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
      const panel = document.getElementById(YRTC.constants.PANEL_ID);
      if (panel?.classList.contains("yrtc-panel-visible") && triggerElement) {
        positionPanel(triggerElement, panel, adapter);
      }
    });
  }

  function createAdapter() {
    const host = window.location.hostname;
    if (host === "www.youtube.com" || host === "youtube.com" || host.endsWith(".youtube.com")) {
      return createYouTubeAdapter();
    }

    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      return createVimeoAdapter();
    }

    return createGenericAdapter();
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
