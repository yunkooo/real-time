const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const expectedPositions = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center-center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right"
];

function readRepoFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), "utf8");
}

function loadSettings() {
  const context = { window: {} };
  vm.runInNewContext(readRepoFile("src/shared/settings.js"), context, {
    filename: "src/shared/settings.js"
  });
  return context.window.RealtimeSettings;
}

function createInput(value) {
  return {
    checked: false,
    listeners: {},
    value,
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
  };
}

function loadPopupRuntime(storedItems = {}) {
  const inputs = expectedPositions.map(createInput);
  const enabledInput = createInput("enabled");
  const optionsButton = { addEventListener() {} };
  const positionTitle = { textContent: "" };
  const settings = loadSettings();
  const state = { ...settings.DEFAULT_STATE, ...storedItems };
  const writes = [];
  let onChanged;
  const context = {
    chrome: {
      runtime: {
        openOptionsPage() {}
      },
      storage: {
        sync: {
          get(defaultState, callback) {
            callback({ ...defaultState, ...state });
          },
          set(items) {
            writes.push(items);
          }
        },
        onChanged: {
          addListener(listener) {
            onChanged = listener;
          }
        }
      }
    },
    document: {
      documentElement: {},
      querySelector(selector) {
        if (selector === "#enabled") {
          return enabledInput;
        }
        if (selector === "#open-options") {
          return optionsButton;
        }
        if (selector === "#position-title") {
          return positionTitle;
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector === 'input[name="panel-position"]') {
          return inputs;
        }
        return [];
      }
    },
    window: {
      RealtimeSettings: settings
    }
  };

  vm.runInNewContext(readRepoFile("src/popup/popup.js"), context, {
    filename: "src/popup/popup.js"
  });

  return { context, enabledInput, inputs, onChanged, positionTitle, settings, writes };
}

test("popup exposes all panel position choices", () => {
  const html = readRepoFile("src/popup/index.html");
  const positions = [...html.matchAll(/<input type="radio" name="panel-position" value="([^"]+)"/g)].map(
    (match) => match[1]
  );

  assert.match(html, /<legend id="position-title" class="position-title">패널 위치<\/legend>/);
  assert.deepEqual(positions, expectedPositions);
});

test("popup position title follows the stored options language", () => {
  const { positionTitle } = loadPopupRuntime({
    language: "ja"
  });

  assert.equal(positionTitle.textContent, "パネルの位置");
});

test("popup position title updates when options language changes", () => {
  const { onChanged, positionTitle, settings } = loadPopupRuntime({
    language: "en"
  });

  onChanged(
    {
      [settings.STORAGE_KEYS.LANGUAGE]: {
        newValue: "ko"
      }
    },
    "sync"
  );

  assert.equal(positionTitle.textContent, "패널 위치");
});

test("popup syncs the selected panel position with storage", () => {
  const { inputs, settings, writes } = loadPopupRuntime({
    panelPosition: "bottom-right"
  });

  assert.equal(inputs.find((input) => input.value === "bottom-right").checked, true);

  const nextInput = inputs.find((input) => input.value === "center-center");
  nextInput.checked = true;
  nextInput.listeners.change();

  assert.equal(writes.at(-1)[settings.STORAGE_KEYS.PANEL_POSITION], "center-center");
});

test("popup updates panel position when sync storage changes", () => {
  const { inputs, onChanged, settings } = loadPopupRuntime({
    panelPosition: "top-left"
  });

  onChanged(
    {
      [settings.STORAGE_KEYS.PANEL_POSITION]: {
        newValue: "bottom-center"
      }
    },
    "sync"
  );

  assert.equal(inputs.find((input) => input.value === "bottom-center").checked, true);
});
