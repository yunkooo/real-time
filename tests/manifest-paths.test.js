const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");

function assertRepoPathExists(assetPath) {
  assert.ok(fs.existsSync(path.join(rootDir, assetPath)), `${assetPath} should exist`);
}

function readManifest() {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "manifest.json"), "utf8"));
}

function getHtmlAssetPaths(htmlPath) {
  const html = fs.readFileSync(path.join(rootDir, htmlPath), "utf8");
  const htmlDir = path.dirname(htmlPath);
  const assetPaths = [];
  const assetPattern = /\b(?:href|src)="([^"]+\.(?:css|js))"/g;

  for (const match of html.matchAll(assetPattern)) {
    assetPaths.push(path.normalize(path.join(htmlDir, match[1])));
  }

  return assetPaths;
}

test("manifest extension file paths exist", () => {
  const manifest = readManifest();
  const contentScripts = manifest.content_scripts || [];
  const paths = [
    manifest.action?.default_popup,
    manifest.options_page,
    ...contentScripts.flatMap((script) => [...(script.js || []), ...(script.css || [])])
  ].filter(Boolean);

  assert.ok(paths.length > 0, "manifest should declare extension assets");
  for (const assetPath of paths) {
    assertRepoPathExists(assetPath);
  }
});

test("manifest html page asset paths exist", () => {
  const manifest = readManifest();
  const htmlPaths = [
    manifest.action?.default_popup,
    manifest.options_page
  ].filter(Boolean);

  assert.ok(htmlPaths.length > 0, "manifest should declare extension html pages");
  for (const htmlPath of htmlPaths) {
    for (const assetPath of getHtmlAssetPaths(htmlPath)) {
      assertRepoPathExists(assetPath);
    }
  }
});
