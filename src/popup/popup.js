const { DEFAULT_STATE, STORAGE_KEYS, normalizeLanguage, normalizePanelPosition } = window.RealtimeSettings;
const STORAGE_KEY = STORAGE_KEYS.ENABLED;

const enabledInput = document.querySelector("#enabled");
const optionsButton = document.querySelector("#open-options");
const positionTitle = document.querySelector("#position-title");
const panelPositionInputs = [...document.querySelectorAll('input[name="panel-position"]')];

const translations = {
  en: {
    positionTitle: "Panel position"
  },
  ko: {
    positionTitle: "패널 위치"
  },
  ja: {
    positionTitle: "パネルの位置"
  },
  "zh-CN": {
    positionTitle: "面板位置"
  },
  es: {
    positionTitle: "Posición del panel"
  },
  fr: {
    positionTitle: "Position du panneau"
  },
  de: {
    positionTitle: "Panelposition"
  },
  "pt-BR": {
    positionTitle: "Posição do painel"
  }
};

function updateEnabled(enabled) {
  enabledInput.checked = enabled;
}

function updateLanguage(language) {
  const nextLanguage = normalizeLanguage(language);
  document.documentElement.lang = nextLanguage;
  positionTitle.textContent = translations[nextLanguage]?.positionTitle || translations.en.positionTitle;
}

function updatePanelPosition(position) {
  const nextPosition = normalizePanelPosition(position);
  panelPositionInputs.forEach((input) => {
    input.checked = input.value === nextPosition;
  });
}

chrome.storage.sync.get(DEFAULT_STATE, (items) => {
  updateEnabled(items[STORAGE_KEY] !== false);
  updateLanguage(items[STORAGE_KEYS.LANGUAGE]);
  updatePanelPosition(items[STORAGE_KEYS.PANEL_POSITION]);
});

enabledInput.addEventListener("change", () => {
  const enabled = enabledInput.checked;
  updateEnabled(enabled);
  chrome.storage.sync.set({ [STORAGE_KEY]: enabled });
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

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.ENABLED)) {
    updateEnabled(changes[STORAGE_KEYS.ENABLED].newValue !== false);
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.LANGUAGE)) {
    updateLanguage(changes[STORAGE_KEYS.LANGUAGE].newValue);
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.PANEL_POSITION)) {
    updatePanelPosition(changes[STORAGE_KEYS.PANEL_POSITION].newValue);
  }
});
