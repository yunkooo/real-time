const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function createElement({ className = "", inlineStyle = {} } = {}) {
  const element = {
    className,
    isConnected: true,
    parentElement: null,
    style: {
      position: inlineStyle.position || "",
      zIndex: inlineStyle.zIndex || "",
      pointerEvents: inlineStyle.pointerEvents || ""
    },
    children: [],
    contains(target) {
      return target === element || element.children.some((child) => child.contains?.(target));
    },
    closest(selector) {
      if (selector !== ".video-js") {
        return null;
      }

      let current = element;
      while (current) {
        if (current.className.split(/\s+/).includes("video-js")) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    },
    getBoundingClientRect() {
      return { width: 640, height: 360 };
    }
  };
  return element;
}

function appendChild(parent, child) {
  parent.children.push(child);
  child.parentElement = parent;
}

function loadKmoocAdapter() {
  const player = createElement({ className: "video-js" });
  const controlBar = createElement({
    className: "vjs-control-bar",
    inlineStyle: { position: "absolute", zIndex: "7", pointerEvents: "none" }
  });
  const progressControl = createElement({ className: "vjs-progress-control" });
  const video = createElement();

  appendChild(player, video);
  appendChild(player, controlBar);
  appendChild(player, progressControl);

  const document = {
    querySelector(selector) {
      return {
        ".video-js": player,
        ".vjs-control-bar": controlBar,
        ".vjs-progress-control": progressControl
      }[selector] || null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const window = {
    innerHeight: 1080,
    innerWidth: 1920,
    location: {
      hostname: "lms.kmooc.kr",
      pathname: "/mod/vod/viewer.php"
    }
  };
  const context = {
    document,
    getComputedStyle(element) {
      return {
        display: "block",
        objectFit: "contain",
        opacity: "1",
        pointerEvents: element.style.pointerEvents || "auto",
        position: element.style.position || "static",
        visibility: "visible"
      };
    },
    window
  };

  for (const file of ["src/content/utils.js", "src/content/platforms/kmooc.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(rootDir, file), "utf8"), context, { filename: file });
  }

  return {
    adapter: window.Realtime.adapters.createAdapterForCurrentPage(),
    controlBar,
    player,
    progressControl,
    video
  };
}

test("kmooc adapter only raises controls inside the player stacking context", () => {
  const { adapter, controlBar, player, progressControl, video } = loadKmoocAdapter();

  assert.equal(adapter.findPointerActivityTarget(video), player);

  assert.equal(player.style.zIndex, "");
  assert.equal(player.style.pointerEvents, "");
  assert.equal(controlBar.style.zIndex, "3");
  assert.equal(controlBar.style.pointerEvents, "auto");
  assert.equal(progressControl.style.position, "relative");
  assert.equal(progressControl.style.zIndex, "3");
  assert.equal(progressControl.style.pointerEvents, "auto");
});

test("kmooc adapter cleanup restores promoted control styles", () => {
  const { adapter, controlBar, progressControl, video } = loadKmoocAdapter();

  adapter.findPointerActivityTarget(video);
  adapter.cleanup();

  assert.equal(controlBar.style.position, "absolute");
  assert.equal(controlBar.style.zIndex, "7");
  assert.equal(controlBar.style.pointerEvents, "none");
  assert.equal(progressControl.style.position, "");
  assert.equal(progressControl.style.zIndex, "");
  assert.equal(progressControl.style.pointerEvents, "");
});
