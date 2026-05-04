const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function loadContentRuntime(overrides = {}) {
  const utilsPath = fs.existsSync(path.join(rootDir, "src/content/utils.js"))
    ? path.join(rootDir, "src/content/utils.js")
    : path.join(rootDir, "content-utils.js");
  const source = fs.readFileSync(utilsPath, "utf8");
  const window = {
    innerHeight: 1080,
    innerWidth: 1920,
    location: {
      hostname: "example.com",
      pathname: "/watch"
    }
  };
  const context = {
    document: {
      querySelectorAll() {
        return [];
      },
      ...overrides.document
    },
    getComputedStyle(element) {
      if (overrides.getComputedStyle) {
        return overrides.getComputedStyle(element);
      }
      return { objectFit: "contain" };
    },
    window
  };

  vm.runInNewContext(source, context, { filename: utilsPath });
  return window.Realtime;
}

function loadContentUtils() {
  return loadContentRuntime().adapters;
}

test("registered platform adapter is selected from the current location", () => {
  const adapters = loadContentUtils();

  adapters.registerPlatform({
    name: "example",
    isMatch({ host, pathname }) {
      return host === "example.com" && pathname === "/watch";
    },
    create() {
      return { platform: "example" };
    }
  });

  assert.deepEqual(adapters.createAdapterForCurrentPage(), { platform: "example" });
});

test("adapter lookup returns null when no registered platform matches", () => {
  const adapters = loadContentUtils();

  assert.equal(adapters.createAdapterForCurrentPage(), null);
});

test("findActiveVideo skips hidden videos before selecting an active video", () => {
  const hiddenPlayingVideo = {
    paused: false,
    readyState: 1,
    isConnected: true,
    getBoundingClientRect() {
      return { width: 0, height: 0 };
    }
  };
  const visiblePausedVideo = {
    paused: true,
    readyState: 1,
    isConnected: true,
    getBoundingClientRect() {
      return { width: 640, height: 360 };
    }
  };

  const runtime = loadContentRuntime({
    document: {
      querySelectorAll(selector) {
        return selector === "video" ? [hiddenPlayingVideo, visiblePausedVideo] : [];
      }
    },
    getComputedStyle() {
      return { display: "block", objectFit: "contain", opacity: "1", visibility: "visible" };
    }
  });

  assert.equal(runtime.video.findActiveVideo(), visiblePausedVideo);
});

test("findActiveVideo prefers the largest visible video over small playing previews", () => {
  const mainVideo = {
    paused: true,
    readyState: 1,
    isConnected: true,
    getBoundingClientRect() {
      return { width: 960, height: 540 };
    }
  };
  const previewVideo = {
    paused: false,
    readyState: 1,
    isConnected: true,
    getBoundingClientRect() {
      return { width: 180, height: 100 };
    }
  };

  const runtime = loadContentRuntime({
    document: {
      querySelectorAll(selector) {
        return selector === "video" ? [mainVideo, previewVideo] : [];
      }
    },
    getComputedStyle() {
      return { display: "block", objectFit: "contain", opacity: "1", visibility: "visible" };
    }
  });

  assert.equal(runtime.video.findActiveVideo(), mainVideo);
});
