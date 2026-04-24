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

  function positionPanel(target, panel, adapter) {
    const panelPosition = adapter.getPanelPosition?.(target, panel);
    if (panelPosition) {
      panel.style.left = `${panelPosition.left}px`;
      panel.style.top = `${panelPosition.top}px`;
      return;
    }

    if (panelPosition === false) {
      hidePanel();
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

  YRTC.panel = {
    ensurePanel,
    hidePanel,
    isPanelVisible,
    positionPanel,
    removePanel,
    setPanelContent
  };
})();
