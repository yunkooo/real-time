(() => {
  const STORAGE_KEY = "enabled";
  const PANEL_ID = "yrtc-panel";
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

  function findTimeDisplay() {
    return document.querySelector(".html5-video-player .ytp-left-controls .ytp-time-display");
  }

  function findYouTubePlayer() {
    return document.querySelector(".html5-video-player");
  }

  function arePlayerControlsVisible() {
    const player = findYouTubePlayer();
    return !!player && !player.classList.contains("ytp-autohide");
  }

  function getYouTubePlayerRate() {
    const player = findYouTubePlayer();
    if (!player || typeof player.getPlaybackRate !== "function") {
      return null;
    }

    const rate = Number(player.getPlaybackRate());
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }

  function getVideoRate(video) {
    const rate = Number(video?.playbackRate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }

  function getPlaybackRate(video) {
    const playerRate = getYouTubePlayerRate();
    const videoRate = getVideoRate(video);
    const nextRate = playerRate || videoRate;

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

  function getTimeModel(video) {
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0 || !Number.isFinite(video.currentTime)) {
      return null;
    }

    const rate = getPlaybackRate(video);
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

  function positionPanel(target, panel) {
    const rect = getTimeHitboxRect(target) || target.getBoundingClientRect();
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

  function getTimeHitboxRect(element) {
    if (!element?.isConnected) {
      return null;
    }

    const currentTime = element.querySelector(".ytp-time-current");
    const duration = element.querySelector(".ytp-time-duration");
    if (!currentTime || !duration) {
      return element.getBoundingClientRect();
    }

    const currentRect = currentTime.getBoundingClientRect();
    const durationRect = duration.getBoundingClientRect();

    return {
      left: Math.min(currentRect.left, durationRect.left),
      right: Math.max(currentRect.right, durationRect.right),
      top: Math.min(currentRect.top, durationRect.top),
      bottom: Math.max(currentRect.bottom, durationRect.bottom),
      width: Math.max(currentRect.right, durationRect.right) - Math.min(currentRect.left, durationRect.left),
      height: Math.max(currentRect.bottom, durationRect.bottom) - Math.min(currentRect.top, durationRect.top)
    };
  }

  function isPointerOverElement(element) {
    if (!element?.isConnected || lastPointerX === null || lastPointerY === null) {
      return false;
    }

    const rect = getTimeHitboxRect(element);
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

  function showPanel() {
    cleanupDisconnectedRefs();

    if (!enabled || !triggerElement?.isConnected || !arePlayerControlsVisible()) {
      hidePanel();
      return;
    }

    const video = findActiveVideo();
    const model = getTimeModel(video);
    if (!model) {
      hidePanel();
      return;
    }

    const panel = ensurePanel();
    setPanelContent(panel, model);
    panel.classList.add("yrtc-panel-visible");
    positionPanel(triggerElement, panel);
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

  function bindTrigger(target) {
    if (triggerElement === target) {
      return;
    }

    removeTriggerListeners?.();
    triggerElement = target;
    triggerElement.classList.add("yrtc-time-trigger");

    const handleMouseEnter = (event) => {
      updatePointerPosition(event);
      if (isPointerOverElement(target)) {
        showPanel();
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

  function bindVideo(video) {
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
      if (document.getElementById(PANEL_ID)?.classList.contains("yrtc-panel-visible")) {
        showPanel();
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

  function removeUi() {
    removeTriggerListeners?.();
    removeVideoListeners?.();
    removePanel();
  }

  function updateUi() {
    if (!enabled) {
      removeUi();
      return;
    }

    cleanupDisconnectedRefs();

    if (!arePlayerControlsVisible()) {
      hidePanel();
      return;
    }

    const target = findTimeDisplay();
    const video = findActiveVideo();

    if (!target || !getTimeModel(video)) {
      removeUi();
      return;
    }

    bindTrigger(target);
    bindVideo(video);

    if (isPointerOverElement(target) || isPanelVisible()) {
      showPanel();
    }
  }

  function startUpdating() {
    stopUpdating();
    observeYouTubeChanges();
    updateTimer = window.setInterval(updateUi, UPDATE_INTERVAL_MS);
    updateUi();
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

  function scheduleUpdate() {
    if (pendingUpdateFrame !== null) {
      return;
    }

    pendingUpdateFrame = window.requestAnimationFrame(() => {
      pendingUpdateFrame = null;
      updateUi();
    });
  }

  function observeYouTubeChanges() {
    mutationObserver?.disconnect();
    mutationObserver = new MutationObserver(scheduleUpdate);

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true
    });
  }

  function bindStorageChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
        return;
      }

      enabled = changes[STORAGE_KEY].newValue !== false;
      if (enabled) {
        startUpdating();
      } else {
        stopUpdating();
        removeUi();
      }
    });
  }

  function bindGlobalEvents() {
    window.addEventListener(
      "mousemove",
      (event) => {
        if (!enabled) {
          return;
        }

        updatePointerPosition(event);

        if (triggerElement && !isPanelVisible() && isPointerOverElement(triggerElement)) {
          showPanel();
        } else if (triggerElement && isPanelVisible() && !isPointerOverElement(triggerElement)) {
          hidePanel();
        }
      },
      { passive: true }
    );

    window.addEventListener("resize", () => {
      const panel = document.getElementById(PANEL_ID);
      if (panel?.classList.contains("yrtc-panel-visible") && triggerElement) {
        positionPanel(triggerElement, panel);
      }
    });
  }

  async function init() {
    await readSetting();
    bindStorageChanges();
    bindGlobalEvents();

    if (enabled) {
      startUpdating();
    }
  }

  init();
})();
