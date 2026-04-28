const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const expectedLanguages = ["en", "ko", "ja", "zh-CN", "es", "fr", "de", "pt-BR"];

function readRepoFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), "utf8");
}

function loadSettings() {
  const context = { window: {} };
  vm.runInNewContext(readRepoFile("src/shared/settings.js"), context, {
    filename: "src/shared/settings.js"
  });
  return context.window.RealtimeSettings;
}

function getLanguageOptions() {
  const html = readRepoFile("src/options/index.html");
  const select = html.match(/<select id="language">([\s\S]*?)<\/select>/);
  assert.ok(select, "options page should include the language select");

  return [...select[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map((match) => ({
    label: match[2],
    value: match[1]
  }));
}

function getDataI18nKeys() {
  const html = readRepoFile("src/options/index.html");
  return [...new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]))];
}

function loadOptionTranslations() {
  const inputs = [
    "top-left",
    "top-center",
    "top-right",
    "center-left",
    "center-center",
    "center-right",
    "bottom-left",
    "bottom-center",
    "bottom-right"
  ].map((value) => ({
    checked: false,
    value,
    addEventListener() {}
  }));
  const settings = loadSettings();
  const context = {
    chrome: {
      storage: {
        sync: {
          get(defaultState, callback) {
            callback(defaultState);
          },
          set() {}
        },
        onChanged: {
          addListener() {}
        }
      }
    },
    document: {
      documentElement: {},
      title: "",
      querySelector(selector) {
        if (selector === "#enabled") {
          return { checked: false, addEventListener() {} };
        }
        if (selector === "#language") {
          return { value: "", addEventListener() {} };
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector === 'input[name="panel-position"]') {
          return inputs;
        }
        if (selector === "[data-i18n]") {
          return [];
        }
        return [];
      }
    },
    window: {
      RealtimeSettings: settings
    }
  };
  const source = `${readRepoFile("src/options/options.js")}\nglobalThis.__translations = translations;`;
  vm.runInNewContext(source, context, { filename: "src/options/options.js" });
  return context.__translations;
}

test("shared settings allow the supported options page languages", () => {
  const settings = loadSettings();

  assert.deepEqual([...settings.LANGUAGES], expectedLanguages);
  assert.equal(settings.DEFAULT_STATE[settings.STORAGE_KEYS.LANGUAGE], "en");
  for (const language of expectedLanguages) {
    assert.equal(settings.normalizeLanguage(language), language);
  }
  assert.equal(settings.normalizeLanguage("unknown"), "en");
});

test("options language dropdown matches supported languages", () => {
  const options = getLanguageOptions();

  assert.deepEqual(options.map((option) => option.value), expectedLanguages);
  assert.deepEqual(options.map((option) => option.label), [
    "English",
    "한국어",
    "日本語",
    "简体中文",
    "Español",
    "Français",
    "Deutsch",
    "Português"
  ]);
});

test("options translations cover every i18n key for every supported language", () => {
  const translations = loadOptionTranslations();
  const expectedTranslationKeys = [...getDataI18nKeys(), "documentTitle"].sort();

  assert.deepEqual(Object.keys(translations), expectedLanguages);
  for (const language of expectedLanguages) {
    const copy = translations[language];
    assert.deepEqual(Object.keys(copy).sort(), expectedTranslationKeys, `${language} should have every translation key`);
    for (const [key, value] of Object.entries(copy)) {
      assert.equal(typeof value, "string", `${language}.${key} should be a string`);
      assert.notEqual(value.trim(), "", `${language}.${key} should not be empty`);
    }
  }
});
