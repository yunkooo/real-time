(() => {
  const Realtime = window.Realtime;
  const {
    DEFAULT_STATE,
    PANEL_ID,
    RATE_CACHE_GRACE_MS,
    STORAGE_KEY,
    UPDATE_INTERVAL_MS
  } = Realtime.constants;
  const {
    createEbsiAdapter,
    createInflearnAdapter,
    createKmoocAdapter,
    createUdemyAdapter,
    createYouTubeAdapter,
    createVimeoAdapter
  } = Realtime.adapters;
  const { ensurePanel, hidePanel, positionPanel, removePanel, setPanelContent } = Realtime.panel;
  const { getVideoRate, isUsableVideo } = Realtime.video;

  let enabled = true;
  let updateTimer = null;
  let mutationObserver = null;
  let currentVideo = null;
  let triggerElement = null;
  let lastKnownRate = 1;
  let lastRateChangedAt = 0;
  let pendingUpdateFrame = null;
  let removeTriggerListeners = null;
  let removePointerActivityListeners = null;
  let removeVideoListeners = null;
  let panelMode = "hidden";
  let lastPointerPosition = null;
  let pointerActivityTargetElement = null;
  let pointerActivityHideTimer = null;

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
    const adapterRemaining = adapter.getRemainingSeconds?.(video);
    if (adapterRemaining === null) {
      return null;
    }

    const remaining = adapterRemaining ?? Math.max(video.duration - video.currentTime, 0);

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

  function showFallbackPanel(video, adapter) {
    panelMode = "fallback";
    showPanel(video, adapter);
  }

  function showHoverPanel(video, adapter) {
    panelMode = "hover";
    showPanel(video, adapter);
  }

  function showPointerActivityPanel(video, adapter) {
    panelMode = "pointer-activity";
    showPanel(video, adapter);
  }

  function hidePanelWithMode() {
    panelMode = "hidden";
    hidePanel();
  }

  function hidePanelAndCleanupTrigger() {
    hidePanelWithMode();
    removeTriggerListeners?.();
    removePointerActivityListeners?.();
  }

  function clearInteractionTargets() {
    removeTriggerListeners?.();
    removePointerActivityListeners?.();
  }

  function isTriggerUsable(adapter, target) {
    return adapter.isTriggerVisible ? adapter.isTriggerVisible(target) : true;
  }

  function rememberPointerPosition(event) {
    lastPointerPosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  function isPointerInsideElement(target) {
    if (!target?.isConnected) {
      return false;
    }

    if (!lastPointerPosition) {
      return target.matches(":hover");
    }

    const rect = target.getBoundingClientRect();
    return (
      lastPointerPosition.x >= rect.left &&
      lastPointerPosition.x <= rect.right &&
      lastPointerPosition.y >= rect.top &&
      lastPointerPosition.y <= rect.bottom
    );
  }

  function isPointerInsideRect(target, pointer) {
    if (!target?.isConnected || !pointer) {
      return false;
    }

    const rect = target.getBoundingClientRect();
    return pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
  }

  function isTriggerHovered(adapter, target) {
    return isTriggerUsable(adapter, target) && target.matches(":hover") && isPointerInsideElement(target);
  }

  function clearPointerActivityHideTimer() {
    if (pointerActivityHideTimer) {
      window.clearTimeout(pointerActivityHideTimer);
      pointerActivityHideTimer = null;
    }
  }

  function schedulePointerActivityHide(adapter) {
    clearPointerActivityHideTimer();
    const delay = adapter.pointerActivityHideDelayMs ?? 2000;
    pointerActivityHideTimer = window.setTimeout(() => {
      pointerActivityHideTimer = null;
      hidePanelWithMode();
    }, delay);
  }

  function updateVisiblePanel(video, adapter) {
    if (panelMode === "fallback") {
      showFallbackPanel(video, adapter);
      return;
    }

    if (panelMode === "pointer-activity" && pointerActivityTargetElement?.isConnected) {
      showPointerActivityPanel(video, adapter);
      return;
    }

    if (panelMode === "hover" && triggerElement && isTriggerHovered(adapter, triggerElement)) {
      showHoverPanel(video, adapter);
      return;
    }

    hidePanelWithMode();
  }

  function bindTrigger(target, adapter) {
    if (triggerElement === target && removeTriggerListeners) {
      return;
    }

    removeTriggerListeners?.();
    triggerElement = target;

    const handleMouseEnter = (event) => {
      rememberPointerPosition(event);

      if (!isTriggerHovered(adapter, target)) {
        hidePanelWithMode();
        return;
      }

      showHoverPanel(adapter.findVideo(), adapter);
    };
    const handleMouseLeave = (event) => {
      rememberPointerPosition(event);
      hidePanelWithMode();
    };

    target.addEventListener("mouseenter", handleMouseEnter);
    target.addEventListener("mouseleave", handleMouseLeave);

    removeTriggerListeners = () => {
      target.removeEventListener("mouseenter", handleMouseEnter);
      target.removeEventListener("mouseleave", handleMouseLeave);
      removeTriggerListeners = null;
      if (triggerElement === target) {
        triggerElement = null;
      }
    };
  }

  function bindPointerActivityTarget(target, adapter) {
    if (pointerActivityTargetElement === target && removePointerActivityListeners) {
      return;
    }

    const hadPointerActivityTarget = !!pointerActivityTargetElement;
    removePointerActivityListeners?.();
    if (hadPointerActivityTarget && panelMode === "pointer-activity") {
      hidePanelWithMode();
    }

    pointerActivityTargetElement = target;

    const handlePointerMove = (event) => {
      rememberPointerPosition(event);

      if (!target.isConnected) {
        removePointerActivityListeners?.();
        hidePanelWithMode();
        return;
      }

      if (!isPointerInsideRect(target, lastPointerPosition)) {
        return;
      }

      const video = adapter.findVideo();
      if (!video || !getTimeModel(video, adapter)) {
        hidePanelWithMode();
        return;
      }

      showPointerActivityPanel(video, adapter);
      schedulePointerActivityHide(adapter);
    };

    window.addEventListener("pointermove", handlePointerMove, true);

    removePointerActivityListeners = () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      clearPointerActivityHideTimer();
      removePointerActivityListeners = null;
      if (pointerActivityTargetElement === target) {
        pointerActivityTargetElement = null;
      }
    };
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
    const handleVideoUpdate = () => {
      updateVisiblePanel(boundVideo, adapter);
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
      hidePanelWithMode();
    }
    if (pointerActivityTargetElement && !pointerActivityTargetElement.isConnected) {
      removePointerActivityListeners?.();
      hidePanelWithMode();
    }
    if (currentVideo && !currentVideo.isConnected) {
      removeVideoListeners?.();
    }
  }

  function removeUi(adapter) {
    clearInteractionTargets();
    removeVideoListeners?.();
    panelMode = "hidden";
    removePanel();
    adapter.cleanup?.();
  }

  function syncPointerActivityTarget(video, adapter) {
    const pointerActivityTarget = adapter.findPointerActivityTarget(video);
    removeTriggerListeners?.();

    if (!pointerActivityTarget) {
      removePointerActivityListeners?.();
      hidePanelWithMode();
      return;
    }

    bindPointerActivityTarget(pointerActivityTarget, adapter);
  }

  function syncHoverTrigger(video, adapter) {
    removePointerActivityListeners?.();

    const trigger = adapter.findTrigger?.(video) || null;
    if (!trigger) {
      removeTriggerListeners?.();
      showFallbackPanel(video, adapter);
      return;
    }

    if (!isTriggerUsable(adapter, trigger)) {
      removeTriggerListeners?.();
      showFallbackPanel(video, adapter);
      return;
    }

    bindTrigger(trigger, adapter);

    if (isTriggerHovered(adapter, trigger)) {
      showHoverPanel(video, adapter);
    } else {
      hidePanelWithMode();
    }
  }

  function updateUi(adapter) {
    if (!enabled) {
      removeUi(adapter);
      return;
    }

    cleanupDisconnectedRefs();

    if (adapter.isSupportedPage?.() === false) {
      hidePanelAndCleanupTrigger();
      removeVideoListeners?.();
      return;
    }

    const video = adapter.findVideo();
    if (!video || !getTimeModel(video, adapter)) {
      hidePanelAndCleanupTrigger();
      removeVideoListeners?.();
      return;
    }

    bindVideo(video, adapter);

    if (adapter.findPointerActivityTarget) {
      syncPointerActivityTarget(video, adapter);
      return;
    }

    syncHoverTrigger(video, adapter);
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

  function isPanelNode(node) {
    if (!node) {
      return false;
    }

    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return !!element && (element.id === PANEL_ID || !!element.closest?.(`#${PANEL_ID}`));
  }

  function shouldScheduleForMutations(mutations) {
    return mutations.some((mutation) => {
      if (isPanelNode(mutation.target)) {
        return false;
      }

      const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return changedNodes.length === 0 || changedNodes.some((node) => !isPanelNode(node));
    });
  }

  function observePageChanges(adapter) {
    mutationObserver?.disconnect();
    mutationObserver = new MutationObserver((mutations) => {
      if (shouldScheduleForMutations(mutations)) {
        scheduleUpdate(adapter);
      }
    });

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
    window.addEventListener("pointermove", rememberPointerPosition, true);
    window.addEventListener("resize", () => {
      if (currentVideo?.isConnected) {
        updateUi(adapter);
      }
    });
    document.addEventListener("fullscreenchange", () => {
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

    if (host === "udemy.com" || host.endsWith(".udemy.com")) {
      return createUdemyAdapter({
        isSupportedPage() {
          return window.location.pathname.includes("/learn/");
        }
      });
    }

    if (host === "inflearn.com" || host.endsWith(".inflearn.com")) {
      return createInflearnAdapter({
        isSupportedPage() {
          return window.location.pathname.includes("/lecture/") || window.location.pathname.startsWith("/courses/lecture");
        }
      });
    }

    if (host === "www.ebsi.co.kr" || host === "ebsi.co.kr" || host.endsWith(".ebsi.co.kr")) {
      return createEbsiAdapter({
        isSupportedPage() {
          return window.location.pathname === "/ebs/lms/player/retrieveLmsPlayerHtml5.ebs";
        }
      });
    }

    if (host === "mid.ebs.co.kr") {
      return createEbsiAdapter({
        isSupportedPage() {
          return window.location.pathname === "/pleasure/course/plain/player/main/index";
        }
      });
    }

    if (host === "lms.kmooc.kr") {
      return createKmoocAdapter({
        isSupportedPage() {
          return window.location.pathname === "/mod/vod/viewer.php";
        }
      });
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
