(() => {
  const RealTime = window.RealTime;
  const {
    DEFAULT_STATE,
    RATE_CACHE_GRACE_MS,
    STORAGE_KEY,
    UPDATE_INTERVAL_MS
  } = RealTime.constants;
  const {
    createGenericAdapter,
    createVimeoAdapter
  } = RealTime.adapters;
  const { ensurePanel, hidePanel, positionPanel, removePanel, setPanelContent } = RealTime.panel;
  const { getVideoRate, isUsableVideo } = RealTime.video;

  let enabled = true;
  let updateTimer = null;
  let mutationObserver = null;
  let currentVideo = null;
  let lastKnownRate = 1;
  let lastRateChangedAt = 0;
  let pendingUpdateFrame = null;
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

  function showPanel(video, adapter) {
    if (!enabled) {
      removeUi(adapter);
      return;
    }

    const model = getTimeModel(video, adapter);
    if (!model) {
      hidePanel();
      return;
    }

    const panel = ensurePanel();
    setPanelContent(panel, model);
    panel.classList.add("realtime-panel-visible");
    positionPanel(video, panel, adapter);
  }

  function bindVideo(video, adapter) {
    if (currentVideo === video && removeVideoListeners) {
      return;
    }

    removeVideoListeners?.();
    currentVideo = video;
    lastKnownRate = 1;
    lastRateChangedAt = 0;

    if (!video) {
      removeVideoListeners = null;
      return;
    }

    const boundVideo = video;
    const handleVideoUpdate = () => showPanel(boundVideo, adapter);

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
    if (currentVideo && !currentVideo.isConnected) {
      removeVideoListeners?.();
    }
  }

  function removeUi(adapter) {
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

    if (adapter.isSupportedPage?.() === false) {
      hidePanel();
      removeVideoListeners?.();
      return;
    }

    const video = adapter.findVideo();
    if (!video || !getTimeModel(video, adapter)) {
      hidePanel();
      removeVideoListeners?.();
      return;
    }

    bindVideo(video, adapter);
    showPanel(video, adapter);
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
    window.addEventListener("resize", () => {
      if (currentVideo?.isConnected) {
        updateUi(adapter);
      }
    });
  }

  function createAdapter() {
    const host = window.location.hostname;
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      return createVimeoAdapter();
    }

    if (host === "www.youtube.com" || host === "youtube.com" || host.endsWith(".youtube.com")) {
      return createGenericAdapter({
        isSupportedPage() {
          return (
            window.location.pathname === "/watch" ||
            window.location.pathname.startsWith("/embed/") ||
            window.location.pathname.startsWith("/shorts/")
          );
        }
      });
    }

    if (host === "udemy.com" || host.endsWith(".udemy.com")) {
      return createGenericAdapter({
        isSupportedPage() {
          return window.location.pathname.includes("/learn/");
        }
      });
    }

    if (host === "inflearn.com" || host.endsWith(".inflearn.com")) {
      return createGenericAdapter({
        isSupportedPage() {
          return window.location.pathname.includes("/lecture/");
        }
      });
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
