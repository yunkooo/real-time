(() => {
  const STORAGE_KEY = "enabled";
  const UI_ID = "yrtc-pill";
  const PANEL_ID = "yrtc-panel";
  const DEFAULT_STATE = { [STORAGE_KEY]: true };
  const UPDATE_INTERVAL_MS = 500;

  let enabled = true;
  let updateTimer = null;
  let mutationObserver = null;
  let currentVideo = null;
  let isPanelPinned = false;

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

  function findMountTarget() {
    return (
      document.querySelector(".ytp-left-controls .ytp-time-display") ||
      document.querySelector(".ytp-left-controls")
    );
  }

  function getTimeModel(video) {
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0 || !Number.isFinite(video.currentTime)) {
      return null;
    }

    const rate = Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1;
    const remaining = Math.max(video.duration - video.currentTime, 0);

    return {
      rate,
      realCurrent: video.currentTime / rate,
      realDuration: video.duration / rate,
      realRemaining: remaining / rate,
      sourceDuration: video.duration
    };
  }

  function createPill() {
    const pill = document.createElement("button");
    pill.id = UI_ID;
    pill.className = "yrtc-pill";
    pill.type = "button";
    pill.setAttribute("aria-expanded", "false");
    pill.setAttribute("aria-label", "배속 기준 남은 시간");

    pill.addEventListener("mouseenter", showPanel);
    pill.addEventListener("mouseleave", () => {
      if (!isPanelPinned) {
        hidePanel();
      }
    });
    pill.addEventListener("click", (event) => {
      event.stopPropagation();
      isPanelPinned = !isPanelPinned;
      if (isPanelPinned) {
        showPanel();
      } else {
        hidePanel();
      }
    });

    return pill;
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "yrtc-panel";
    panel.setAttribute("role", "tooltip");

    panel.addEventListener("mouseenter", showPanel);
    panel.addEventListener("mouseleave", () => {
      if (!isPanelPinned) {
        hidePanel();
      }
    });

    return panel;
  }

  function ensureUi() {
    const existing = document.getElementById(UI_ID);
    if (existing) {
      return existing;
    }

    const target = findMountTarget();
    if (!target) {
      return null;
    }

    const pill = createPill();
    target.insertAdjacentElement("afterend", pill);
    return pill;
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPanel();
      document.body.appendChild(panel);
    }
    return panel;
  }

  function positionPanel(pill, panel) {
    const rect = pill.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - panelRect.width - viewportPadding
    );
    const top = Math.max(rect.top - panelRect.height - 10, viewportPadding);

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function setPanelContent(panel, model) {
    panel.innerHTML = `
      <div class="yrtc-panel-title">배속 기준 시간</div>
      <div class="yrtc-row"><span>현재 배속</span><strong>${formatRate(model.rate)}</strong></div>
      <div class="yrtc-row"><span>현실 남은 시간</span><strong>${formatDuration(model.realRemaining)}</strong></div>
      <div class="yrtc-row"><span>현실 전체 소요</span><strong>${formatDuration(model.realDuration)}</strong></div>
      <div class="yrtc-row"><span>영상 원본 길이</span><strong>${formatDuration(model.sourceDuration)}</strong></div>
    `;
  }

  function showPanel() {
    const pill = document.getElementById(UI_ID);
    const model = getTimeModel(currentVideo || findActiveVideo());
    if (!pill || !model) {
      return;
    }

    const panel = ensurePanel();
    setPanelContent(panel, model);
    panel.classList.add("yrtc-panel-visible");
    pill.setAttribute("aria-expanded", "true");
    positionPanel(pill, panel);
  }

  function hidePanel() {
    const panel = document.getElementById(PANEL_ID);
    const pill = document.getElementById(UI_ID);
    if (panel) {
      panel.classList.remove("yrtc-panel-visible");
    }
    if (pill) {
      pill.setAttribute("aria-expanded", "false");
    }
  }

  function removeUi() {
    document.getElementById(UI_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    isPanelPinned = false;
  }

  function updateUi() {
    if (!enabled) {
      removeUi();
      return;
    }

    currentVideo = findActiveVideo();
    const model = getTimeModel(currentVideo);
    if (!model) {
      removeUi();
      return;
    }

    const pill = ensureUi();
    if (!pill) {
      return;
    }

    pill.textContent = `${formatRate(model.rate)} · ${formatDuration(model.realRemaining)} 남음`;
    pill.title = `현재 배속 기준으로 ${formatDuration(model.realRemaining)} 남았습니다.`;

    const panel = document.getElementById(PANEL_ID);
    if (panel?.classList.contains("yrtc-panel-visible")) {
      setPanelContent(panel, model);
      positionPanel(pill, panel);
    }
  }

  function startUpdating() {
    stopUpdating();
    updateTimer = window.setInterval(updateUi, UPDATE_INTERVAL_MS);
    updateUi();
  }

  function stopUpdating() {
    if (updateTimer) {
      window.clearInterval(updateTimer);
      updateTimer = null;
    }
  }

  function observeYouTubeChanges() {
    mutationObserver?.disconnect();
    mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(updateUi);
    });

    mutationObserver.observe(document.documentElement, {
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
    window.addEventListener("resize", () => {
      const panel = document.getElementById(PANEL_ID);
      const pill = document.getElementById(UI_ID);
      if (panel?.classList.contains("yrtc-panel-visible") && pill) {
        positionPanel(pill, panel);
      }
    });

    document.addEventListener("click", (event) => {
      if (!isPanelPinned) {
        return;
      }

      const pill = document.getElementById(UI_ID);
      const panel = document.getElementById(PANEL_ID);
      if (!pill?.contains(event.target) && !panel?.contains(event.target)) {
        isPanelPinned = false;
        hidePanel();
      }
    });
  }

  async function init() {
    await readSetting();
    bindStorageChanges();
    bindGlobalEvents();
    observeYouTubeChanges();

    if (enabled) {
      startUpdating();
    }
  }

  init();
})();
