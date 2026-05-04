const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function createVisibleElement(children = {}) {
  return {
    classList: {
      contains() {
        return false;
      }
    },
    isConnected: true,
    parentElement: null,
    textContent: "",
    closest() {
      return null;
    },
    querySelector(selector) {
      return children[selector] || null;
    },
    getBoundingClientRect() {
      return { width: 120, height: 24 };
    }
  };
}

function loadAdapter({ file, hostname, pathname }) {
  const speedDisplay = createVisibleElement();
  const udemyProgressDisplay = createVisibleElement({
    '[data-purpose="current-time"]': createVisibleElement(),
    '[data-purpose="duration"]': createVisibleElement()
  });
  const vimeoProgressBar = createVisibleElement();
  vimeoProgressBar.parentElement = createVisibleElement();

  const document = {
    visibilityState: "visible",
    querySelector(selector) {
      return {
        ".mpv_current_speed": speedDisplay,
        "[data-progress-bar='true']": vimeoProgressBar
      }[selector] || null;
    },
    querySelectorAll(selector) {
      return {
        '[data-purpose="progress-display"]': [udemyProgressDisplay]
      }[selector] || [];
    }
  };
  const window = {
    innerHeight: 1080,
    innerWidth: 1920,
    location: {
      hostname,
      pathname
    }
  };
  const context = {
    document,
    getComputedStyle() {
      return {
        display: "block",
        objectFit: "contain",
        opacity: "1",
        visibility: "visible"
      };
    },
    window
  };

  for (const sourceFile of ["src/content/utils.js", file]) {
    vm.runInNewContext(fs.readFileSync(path.join(rootDir, sourceFile), "utf8"), context, {
      filename: sourceFile
    });
  }

  return window.Realtime.adapters.createAdapterForCurrentPage();
}

test("hover trigger platforms disable hidden-trigger fallback", () => {
  const cases = [
    {
      file: "src/content/platforms/ebsi.js",
      hostname: "www.ebsi.co.kr",
      pathname: "/ebs/lms/player/retrieveLmsPlayerHtml5.ebs"
    },
    {
      file: "src/content/platforms/ebsi.js",
      hostname: "mid.ebs.co.kr",
      pathname: "/pleasure/course/plain/player/main/index"
    },
    {
      file: "src/content/platforms/udemy.js",
      hostname: "www.udemy.com",
      pathname: "/course/example/learn/"
    },
    {
      file: "src/content/platforms/vimeo.js",
      hostname: "vimeo.com",
      pathname: "/123456789"
    }
  ];

  for (const options of cases) {
    const adapter = loadAdapter(options);
    assert.equal(adapter.fallbackOnUnusableTrigger, false, `${options.file} should hide hidden trigger fallback`);
  }
});
