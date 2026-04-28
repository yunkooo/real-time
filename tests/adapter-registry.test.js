const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");

function loadContentUtils() {
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
      }
    },
    getComputedStyle() {
      return { objectFit: "contain" };
    },
    window
  };

  vm.runInNewContext(source, context, { filename: utilsPath });
  return window.Realtime.adapters;
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
