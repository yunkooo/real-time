(() => {
  const Realtime = window.Realtime;
  const { PANEL_ID } = Realtime.constants;
  const { formatDuration, formatRate } = Realtime.format;

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "realtime-panel";
    panel.setAttribute("role", "tooltip");
    return panel;
  }

  function getPanelRoot() {
    return document.fullscreenElement || document.body;
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    const root = getPanelRoot();
    if (!panel) {
      panel = createPanel();
    }
    if (panel.parentElement !== root) {
      root.appendChild(panel);
    }
    return panel;
  }

  function hidePanel() {
    document
      .getElementById(PANEL_ID)
      ?.classList.remove("realtime-panel-visible");
  }

  function isPanelVisible() {
    return (
      document
        .getElementById(PANEL_ID)
        ?.classList.contains("realtime-panel-visible") === true
    );
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function setPanelContent(panel, model) {
    panel.innerHTML = `
      <div class="realtime-row"><span>Speed</span><strong>${formatRate(model.rate)}</strong></div>
      <div class="realtime-row"><span>Time</span><strong>${formatDuration(model.realRemaining)}</strong></div>
    `;
  }

  function positionPanel(video, panel, adapter) {
    const panelPosition = adapter.getPanelPosition?.(video, panel);
    if (panelPosition) {
      panel.style.left = `${panelPosition.left}px`;
      panel.style.top = `${panelPosition.top}px`;
      return;
    }

    if (panelPosition === false || adapter.getPanelPosition) {
      hidePanel();
      return;
    }

    const rect = video?.getBoundingClientRect();
    if (!rect) {
      hidePanel();
      return;
    }

    const viewportPadding = 12;
    const inset = 16;
    const left = Math.max(rect.left + inset, viewportPadding);
    const top = Math.max(rect.top + inset, viewportPadding);

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  Realtime.panel = {
    ensurePanel,
    hidePanel,
    isPanelVisible,
    positionPanel,
    removePanel,
    setPanelContent
  };
})();
