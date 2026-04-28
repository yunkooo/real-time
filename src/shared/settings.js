(() => {
  const STORAGE_KEYS = {
    ENABLED: "enabled",
    LANGUAGE: "language",
    PANEL_POSITION: "panelPosition"
  };

  const LANGUAGES = ["en", "ko", "ja", "zh-CN", "es", "fr", "de", "pt-BR"];
  const PANEL_POSITIONS = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "top-center",
    "bottom-center",
    "center-left",
    "center-center",
    "center-right"
  ];

  const DEFAULT_STATE = {
    [STORAGE_KEYS.ENABLED]: true,
    [STORAGE_KEYS.LANGUAGE]: "en",
    [STORAGE_KEYS.PANEL_POSITION]: "top-left"
  };

  function normalizeLanguage(language) {
    return LANGUAGES.includes(language) ? language : DEFAULT_STATE[STORAGE_KEYS.LANGUAGE];
  }

  function normalizePanelPosition(position) {
    return PANEL_POSITIONS.includes(position) ? position : DEFAULT_STATE[STORAGE_KEYS.PANEL_POSITION];
  }

  window.RealtimeSettings = {
    DEFAULT_STATE,
    LANGUAGES,
    PANEL_POSITIONS,
    STORAGE_KEYS,
    normalizeLanguage,
    normalizePanelPosition
  };
})();
