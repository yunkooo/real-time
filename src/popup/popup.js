const STORAGE_KEY = "enabled";
const DEFAULT_STATE = { [STORAGE_KEY]: true };

const enabledInput = document.querySelector("#enabled");
const optionsButton = document.querySelector("#open-options");

chrome.storage.sync.get(DEFAULT_STATE, (items) => {
  enabledInput.checked = items[STORAGE_KEY] !== false;
});

enabledInput.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY]: enabledInput.checked });
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
