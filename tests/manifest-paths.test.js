const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");

test("manifest content script file paths exist", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "manifest.json"), "utf8"));
  const contentScripts = manifest.content_scripts || [];
  const paths = contentScripts.flatMap((script) => [...(script.js || []), ...(script.css || [])]);

  assert.ok(paths.length > 0, "manifest should declare content script assets");
  for (const assetPath of paths) {
    assert.ok(fs.existsSync(path.join(rootDir, assetPath)), `${assetPath} should exist`);
  }
});
