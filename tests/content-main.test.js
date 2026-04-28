const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function loadMainRuntime(overrides = {}) {
  const source = fs.readFileSync(path.join(rootDir, "src/content/main.js"), "utf8");
  const calls = {
    contentModels: [],
    intervalDelays: [],
    observedOptions: [],
    panelPositions: [],
    storageChangeListener: null
  };
  const adapter = overrides.adapter || {
    findVideo() {
      return null;
    }
  };
  const window = {
    Realtime: {
      constants: {
        DEFAULT_PANEL_POSITION: "top-left",
        DEFAULT_STATE: { enabled: true, language: "en", panelPosition: "top-left" },
        PANEL_ID: "realtime-panel",
        PANEL_POSITION_KEY: "panelPosition",
        PANEL_POSITIONS: [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
          "top-center",
          "bottom-center",
          "center-left",
          "center-center",
          "center-right"
        ],
        RATE_CACHE_GRACE_MS: 900,
        STORAGE_KEY: "enabled",
        UPDATE_INTERVAL_MS: 500
      },
      panel: {
        ensurePanel() {
          return { classList: { add() {} } };
        },
        hidePanel() {},
        positionPanel(_video, _panel, _adapter, panelPosition) {
          calls.panelPositions.push(panelPosition);
        },
        removePanel() {},
        setPanelContent(_panel, model) {
          calls.contentModels.push(model);
        }
      },
      video: {
        getVideoRate() {
          return 1;
        },
        isUsableVideo:
          overrides.isUsableVideo ||
          function isUsableVideo() {
            return false;
          }
      },
      adapters: {
        createAdapterForCurrentPage() {
          return adapter;
        }
      }
    },
    addEventListener() {},
    cancelAnimationFrame() {},
    clearInterval() {},
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setInterval(_callback, delay) {
      calls.intervalDelays.push(delay);
      return 1;
    }
  };
  const document = {
    addEventListener() {},
    documentElement: {},
    getElementById() {
      return null;
    }
  };
  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
    }

    disconnect() {}

    observe(target, options) {
      calls.observedOptions.push({ target, options });
    }
  }
  const chrome = {
    storage: {
      sync: {
        get() {
          return Promise.resolve({
            enabled: true,
            panelPosition: overrides.panelPosition || "top-left"
          });
        }
      },
      onChanged: {
        addListener(listener) {
          calls.storageChangeListener = listener;
        }
      }
    }
  };
  const context = {
    chrome,
    document,
    MutationObserver,
    window
  };

  vm.runInNewContext(source, context, { filename: "src/content/main.js" });

  return { calls };
}

test("content runtime starts without a polling interval or attribute observer", async () => {
  const { calls } = loadMainRuntime();

  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(calls.intervalDelays, []);
  assert.equal(calls.observedOptions.length, 1);
  assert.equal(calls.observedOptions[0].options.childList, true);
  assert.equal(calls.observedOptions[0].options.subtree, true);
  assert.equal(Object.hasOwn(calls.observedOptions[0].options, "attributes"), false);
  assert.equal(Object.hasOwn(calls.observedOptions[0].options, "attributeFilter"), false);
});

test("content runtime accepts adapter remaining seconds for infinite duration videos", async () => {
  const liveVideo = {
    currentTime: 1180,
    duration: Infinity,
    addEventListener() {},
    removeEventListener() {}
  };
  const adapter = {
    findTrigger() {
      return null;
    },
    findVideo() {
      return liveVideo;
    },
    getRemainingSeconds() {
      return 20;
    }
  };
  const { calls } = loadMainRuntime({
    adapter,
    isUsableVideo() {
      return false;
    }
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(calls.contentModels.some((model) => model.realRemaining === 20));
});

test("content runtime passes stored panel position to panel positioning", async () => {
  const video = {
    currentTime: 10,
    duration: 70,
    addEventListener() {},
    removeEventListener() {}
  };
  const adapter = {
    findTrigger() {
      return null;
    },
    findVideo() {
      return video;
    }
  };
  const { calls } = loadMainRuntime({
    adapter,
    isUsableVideo() {
      return true;
    },
    panelPosition: "bottom-right"
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(calls.panelPositions.includes("bottom-right"));
});

test("content runtime updates visible panel when panel position storage changes", async () => {
  const video = {
    currentTime: 10,
    duration: 70,
    isConnected: true,
    addEventListener() {},
    removeEventListener() {}
  };
  const adapter = {
    findTrigger() {
      return null;
    },
    findVideo() {
      return video;
    }
  };
  const { calls } = loadMainRuntime({
    adapter,
    isUsableVideo() {
      return true;
    }
  });

  await new Promise((resolve) => setImmediate(resolve));

  calls.storageChangeListener(
    {
      panelPosition: {
        newValue: "center-right"
      }
    },
    "sync"
  );

  assert.ok(calls.panelPositions.includes("center-right"));
});
