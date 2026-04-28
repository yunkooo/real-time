const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function loadMainRuntime() {
  const source = fs.readFileSync(path.join(rootDir, "src/content/main.js"), "utf8");
  const calls = {
    intervalDelays: [],
    observedOptions: []
  };
  const adapter = {
    findVideo() {
      return null;
    }
  };
  const window = {
    Realtime: {
      constants: {
        DEFAULT_STATE: { enabled: true },
        PANEL_ID: "realtime-panel",
        RATE_CACHE_GRACE_MS: 900,
        STORAGE_KEY: "enabled",
        UPDATE_INTERVAL_MS: 500
      },
      panel: {
        ensurePanel() {
          return { classList: { add() {} } };
        },
        hidePanel() {},
        positionPanel() {},
        removePanel() {},
        setPanelContent() {}
      },
      video: {
        getVideoRate() {
          return 1;
        },
        isUsableVideo() {
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
          return Promise.resolve({ enabled: true });
        }
      },
      onChanged: {
        addListener() {}
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
