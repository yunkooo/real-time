const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const maxVideoRemainingSeconds = toSeconds(12, 0, 0);
const liveRemainingOffsetSeconds = toSeconds(0, 59, 30);

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

test("youtube adapter subtracts live offset from duration before clamping to twelve hours", () => {
  const adapter = loadYouTubeAdapter({ live: true });

  assert.equal(adapter.getRemainingSeconds({ duration: toSeconds(13, 4, 10), currentTime: 0 }), maxVideoRemainingSeconds);
});

test("youtube adapter keeps live videos below twelve hours after offset", () => {
  const adapter = loadYouTubeAdapter({ live: true });

  assert.equal(adapter.getRemainingSeconds({ duration: toSeconds(12, 41, 52), currentTime: 0 }), toSeconds(11, 42, 22));
});

test("youtube adapter hides live time when offset consumes the remaining time", () => {
  const adapter = loadYouTubeAdapter({ live: true });

  assert.equal(adapter.getRemainingSeconds({ duration: liveRemainingOffsetSeconds, currentTime: 0 }), null);
});

test("youtube adapter subtracts live offset from the seekable edge before comparing current time", () => {
  const adapter = loadYouTubeAdapter({ live: true });
  const video = {
    currentTime: 1000,
    duration: Infinity,
    seekable: createSeekable([0, 900], [950, 45010])
  };

  assert.equal(adapter.getRemainingSeconds(video), 11 * 60 * 60 + 14 * 60);
});

test("youtube adapter corrects the observed live one minute drift", () => {
  const adapter = loadYouTubeAdapter({ live: true });

  assert.equal(adapter.getRemainingSeconds({ duration: toSeconds(7, 24, 30), currentTime: 0 }), toSeconds(6, 25, 0));
});

test("youtube adapter subtracts live offset from seekable fallback", () => {
  const adapter = loadYouTubeAdapter({ live: true });
  const video = {
    currentTime: 1000,
    duration: Infinity,
    seekable: createSeekable([0, 900], [950, 1000 + liveRemainingOffsetSeconds + 20])
  };

  assert.equal(adapter.getRemainingSeconds(video), 20);
});

test("youtube adapter subtracts live offset from seekable before clamping to twelve hours", () => {
  const adapter = loadYouTubeAdapter({ live: true });
  const video = {
    currentTime: 1000,
    duration: Infinity,
    seekable: createSeekable([0, 1000 + 12 * 60 * 60 + liveRemainingOffsetSeconds])
  };

  assert.equal(adapter.getRemainingSeconds(video), 12 * 60 * 60);
});

test("youtube adapter handles YouTube day-style live time values after offsetting the live edge", () => {
  const adapter = loadYouTubeAdapter({ live: true });
  const day = 24 * 60 * 60;
  const currentTime = 52 * day + 3 * 60 * 60 + 7 * 60 + 37;
  const liveEdge = 52 * day + 15 * 60 * 60 + 49 * 60 + 2;
  const video = {
    currentTime,
    duration: Infinity,
    seekable: createSeekable([0, liveEdge])
  };

  assert.equal(adapter.getRemainingSeconds(video), 11 * 60 * 60 + 41 * 60 + 55);
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
