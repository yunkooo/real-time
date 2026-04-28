const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const maxVideoRemainingSeconds = toSeconds(12, 0, 0);
const liveRemainingOffsetSeconds = toSeconds(0, 58, 30);

function toSeconds(hours, minutes, seconds) {
  return hours * 60 * 60 + minutes * 60 + seconds;
}

function createVisibleElement() {
  return {
    classList: {
      contains() {
        return false;
      }
    },
    isConnected: true,
    getBoundingClientRect() {
      return { width: 120, height: 24 };
    }
  };
}

function loadYouTubeAdapter({ live = false } = {}) {
  const liveBadge = live ? createVisibleElement() : null;
  const player = createVisibleElement();
  const document = {
    querySelector(selector) {
      return {
        ".html5-video-player": player,
        ".html5-video-player .ytp-live-badge": liveBadge,
        ".html5-video-player .ytp-left-controls .ytp-time-display": createVisibleElement()
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
      hostname: "www.youtube.com",
      pathname: "/watch"
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

  for (const file of ["src/content/utils.js", "src/content/platforms/youtube.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(rootDir, file), "utf8"), context, { filename: file });
  }

  return window.Realtime.adapters.createAdapterForCurrentPage();
}

function createSeekable(...ranges) {
  return {
    length: ranges.length,
    start(index) {
      return ranges[index][0];
    },
    end(index) {
      return ranges[index][1];
    }
  };
}

test("youtube adapter keeps normal videos on duration minus current time", () => {
  const adapter = loadYouTubeAdapter();

  assert.equal(adapter.getRemainingSeconds({ duration: 600, currentTime: 150 }), 450);
});

test("youtube adapter clamps normal videos without live offset", () => {
  const adapter = loadYouTubeAdapter();

  assert.equal(adapter.getRemainingSeconds({ duration: toSeconds(13, 4, 10), currentTime: 0 }), maxVideoRemainingSeconds);
});

test("youtube adapter subtracts live offset before clamping to twelve hours", () => {
  const adapter = loadYouTubeAdapter({ live: true });

  assert.equal(adapter.getRemainingSeconds({ duration: toSeconds(13, 4, 10), currentTime: 0 }), maxVideoRemainingSeconds);
});

test("youtube adapter keeps live videos below twelve hours after offset", () => {
  const adapter = loadYouTubeAdapter({ live: true });

  assert.equal(adapter.getRemainingSeconds({ duration: toSeconds(12, 41, 52), currentTime: 0 }), toSeconds(11, 43, 22));
});

test("youtube adapter hides live time when offset consumes the remaining time", () => {
  const adapter = loadYouTubeAdapter({ live: true });

  assert.equal(adapter.getRemainingSeconds({ duration: liveRemainingOffsetSeconds, currentTime: 0 }), null);
});

test("youtube adapter subtracts live offset from seekable fallback", () => {
  const adapter = loadYouTubeAdapter({ live: true });
  const video = {
    currentTime: 1180,
    duration: Infinity,
    seekable: createSeekable([0, 900], [950, 1180 + liveRemainingOffsetSeconds + 20])
  };

  assert.equal(adapter.getRemainingSeconds(video), 20);
});

test("youtube adapter hides live time when seekable range is unavailable", () => {
  const adapter = loadYouTubeAdapter({ live: true });
  const video = {
    currentTime: 1180,
    duration: Infinity,
    seekable: createSeekable()
  };

  assert.equal(adapter.getRemainingSeconds(video), null);
});
