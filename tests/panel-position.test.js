const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function assertPosition(actual, expected) {
  assert.equal(actual.left, expected.left);
  assert.equal(actual.top, expected.top);
}

function loadContentRuntime() {
  const video = {
    isConnected: true,
    parentElement: {
      contains(target) {
        return target === video;
      }
    },
    videoHeight: 300,
    videoWidth: 400,
    getBoundingClientRect() {
      return {
        bottom: 350,
        height: 300,
        left: 100,
        right: 500,
        top: 50,
        width: 400
      };
    }
  };
  const panel = {
    getBoundingClientRect() {
      return {
        height: 40,
        width: 80
      };
    }
  };
  const context = {
    document: {
      elementsFromPoint() {
        return [video];
      },
      querySelectorAll() {
        return [];
      }
    },
    getComputedStyle() {
      return {
        display: "block",
        objectFit: "contain",
        opacity: "1",
        visibility: "visible"
      };
    },
    window: {
      innerHeight: 600,
      innerWidth: 800,
      location: {
        hostname: "example.com",
        pathname: "/watch"
      }
    }
  };

  for (const file of ["src/shared/settings.js", "src/content/utils.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(rootDir, file), "utf8"), context, { filename: file });
  }

  return { panel, runtime: context.window.Realtime, video };
}

test("video panel position supports all nine frame anchors", () => {
  const { panel, runtime, video } = loadContentRuntime();
  const cases = {
    "bottom-center": { left: 260, top: 294 },
    "bottom-left": { left: 116, top: 294 },
    "bottom-right": { left: 404, top: 294 },
    "center-center": { left: 260, top: 180 },
    "center-left": { left: 116, top: 180 },
    "center-right": { left: 404, top: 180 },
    "top-center": { left: 260, top: 66 },
    "top-left": { left: 116, top: 66 },
    "top-right": { left: 404, top: 66 }
  };

  for (const [position, expected] of Object.entries(cases)) {
    assertPosition(runtime.video.getVideoPanelPosition(video, panel, null, position), expected);
  }
});

test("video panel position falls back to top left for unknown values", () => {
  const { panel, runtime, video } = loadContentRuntime();

  assertPosition(runtime.video.getVideoPanelPosition(video, panel, null, "middle"), { left: 116, top: 66 });
});
