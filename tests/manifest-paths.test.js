const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");

test("manifest extension file paths exist", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "manifest.json"), "utf8"));
  const contentScripts = manifest.content_scripts || [];
  const paths = [
    manifest.action?.default_popup,
    ...contentScripts.flatMap((script) => [...(script.js || []), ...(script.css || [])])
  ].filter(Boolean);

  assert.ok(paths.length > 0, "manifest should declare extension assets");
  for (const assetPath of paths) {
    assert.ok(fs.existsSync(path.join(rootDir, assetPath)), `${assetPath} should exist`);
  }
});
