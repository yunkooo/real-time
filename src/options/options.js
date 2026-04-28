const STORAGE_KEY = "enabled";
const DEFAULT_STATE = { [STORAGE_KEY]: true };

const enabledInput = document.querySelector("#enabled");
const statusText = document.querySelector("#status");

function updateState(enabled) {
  enabledInput.checked = enabled;
  statusText.textContent = enabled ? "On" : "Off";
}

chrome.storage.sync.get(DEFAULT_STATE, (items) => {
  updateState(items[STORAGE_KEY] !== false);
});

enabledInput.addEventListener("change", () => {
  const enabled = enabledInput.checked;
  updateState(enabled);
  chrome.storage.sync.set({ [STORAGE_KEY]: enabled });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
    return;
  }

  updateState(changes[STORAGE_KEY].newValue !== false);
});
