const {
  DEFAULT_STATE,
  STORAGE_KEYS,
  normalizeLanguage,
  normalizePanelPosition
} = window.RealtimeSettings;

const enabledInput = document.querySelector("#enabled");
const languageSelect = document.querySelector("#language");
const panelPositionInputs = [...document.querySelectorAll('input[name="panel-position"]')];

const translations = {
  en: {
    documentTitle: "Real Time Options",
    enableDescription: "Show adjusted remaining time while watching videos.",
    enableTitle: "Enable Real Time",
    languageDescription: "Choose the language used on this options page.",
    languageTitle: "Language",
    pageTitle: "Real Time Settings",
    positionBottomCenter: "Bottom center",
    positionBottomLeft: "Bottom left",
    positionBottomRight: "Bottom right",
    positionCenterCenter: "Center",
    positionCenterLeft: "Center left",
    positionCenterRight: "Center right",
    positionDescription: "Choose where the panel appears inside the video frame.",
    positionTitle: "Panel position",
    positionTopCenter: "Top center",
    positionTopLeft: "Top left",
    positionTopRight: "Top right"
  },
  ko: {
    documentTitle: "Real Time 설정",
    enableDescription: "영상을 볼 때 배속이 반영된 실제 남은 시간을 표시합니다.",
    enableTitle: "Real Time 켜기",
    languageDescription: "이 설정 페이지에서 사용할 언어를 선택합니다.",
    languageTitle: "언어",
    pageTitle: "Real Time 설정",
    positionBottomCenter: "중앙 하단",
    positionBottomLeft: "좌측 하단",
    positionBottomRight: "우측 하단",
    positionCenterCenter: "중앙",
    positionCenterLeft: "좌측 중앙",
    positionCenterRight: "우측 중앙",
    positionDescription: "패널이 영상 프레임 안에서 표시될 위치를 선택합니다.",
    positionTitle: "패널 위치",
    positionTopCenter: "중앙 상단",
    positionTopLeft: "좌측 상단",
    positionTopRight: "우측 상단"
  }
};

let currentLanguage = DEFAULT_STATE[STORAGE_KEYS.LANGUAGE];

function getCopy(key) {
  return translations[currentLanguage][key] || translations.en[key] || "";
}

function applyLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  document.documentElement.lang = currentLanguage;
  document.title = getCopy("documentTitle");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = getCopy(element.dataset.i18n);
  });
}

function updateEnabled(enabled) {
  enabledInput.checked = enabled;
}

function updateLanguage(language) {
  const nextLanguage = normalizeLanguage(language);
  languageSelect.value = nextLanguage;
  applyLanguage(nextLanguage);
}

function updatePanelPosition(position) {
  const nextPosition = normalizePanelPosition(position);
  panelPositionInputs.forEach((input) => {
    input.checked = input.value === nextPosition;
  });
}

function updateState(items) {
  updateLanguage(items[STORAGE_KEYS.LANGUAGE]);
  updateEnabled(items[STORAGE_KEYS.ENABLED] !== false);
  updatePanelPosition(items[STORAGE_KEYS.PANEL_POSITION]);
}

chrome.storage.sync.get(DEFAULT_STATE, updateState);

enabledInput.addEventListener("change", () => {
  const enabled = enabledInput.checked;
  updateEnabled(enabled);
  chrome.storage.sync.set({ [STORAGE_KEYS.ENABLED]: enabled });
});

languageSelect.addEventListener("change", () => {
  const language = normalizeLanguage(languageSelect.value);
  updateLanguage(language);
  chrome.storage.sync.set({ [STORAGE_KEYS.LANGUAGE]: language });
});

panelPositionInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) {
      return;
    }

    const panelPosition = normalizePanelPosition(input.value);
    updatePanelPosition(panelPosition);
    chrome.storage.sync.set({ [STORAGE_KEYS.PANEL_POSITION]: panelPosition });
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.LANGUAGE)) {
    updateLanguage(changes[STORAGE_KEYS.LANGUAGE].newValue);
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.ENABLED)) {
    updateEnabled(changes[STORAGE_KEYS.ENABLED].newValue !== false);
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.PANEL_POSITION)) {
    updatePanelPosition(changes[STORAGE_KEYS.PANEL_POSITION].newValue);
  }
});
