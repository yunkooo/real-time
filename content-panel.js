(() => {
  const YRTC = window.YRTC;
  const { PANEL_ID } = YRTC.constants;
  const { formatDuration, formatRate } = YRTC.format;

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

  function hidePanel() {
    document.getElementById(PANEL_ID)?.classList.remove("yrtc-panel-visible");
  }

  function isPanelVisible() {
    return document.getElementById(PANEL_ID)?.classList.contains("yrtc-panel-visible") === true;
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function setPanelContent(panel, model) {
    panel.innerHTML = `
      <div class="yrtc-panel-title">Adjusted time</div>
      <div class="yrtc-row"><span>Speed</span><strong>${formatRate(model.rate)}</strong></div>
      <div class="yrtc-row"><span>Real time</span><strong>${formatDuration(model.realRemaining)}</strong></div>
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

  YRTC.panel = {
    ensurePanel,
    hidePanel,
    isPanelVisible,
    positionPanel,
    removePanel,
    setPanelContent
  };
})();
