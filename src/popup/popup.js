const { DEFAULT_STATE, STORAGE_KEYS, normalizePanelPosition } = window.RealtimeSettings;
const STORAGE_KEY = STORAGE_KEYS.ENABLED;

const enabledInput = document.querySelector("#enabled");
const optionsButton = document.querySelector("#open-options");
const panelPositionInputs = [...document.querySelectorAll('input[name="panel-position"]')];

function updateEnabled(enabled) {
  enabledInput.checked = enabled;
}

function updatePanelPosition(position) {
  const nextPosition = normalizePanelPosition(position);
  panelPositionInputs.forEach((input) => {
    input.checked = input.value === nextPosition;
  });
}

chrome.storage.sync.get(DEFAULT_STATE, (items) => {
  updateEnabled(items[STORAGE_KEY] !== false);
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
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.PANEL_POSITION)) {
    updatePanelPosition(changes[STORAGE_KEYS.PANEL_POSITION].newValue);
  }
});
