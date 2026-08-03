// Batch 3 smoke: verify the 5 bug fixes end-to-end without launching ComfyUI.
//
//  1. Panel mountBlueprint normalizes Blueprint slot bag -> host naming
//  2. Panel mountBlueprint normalizes host slot bag (pass-through)
//  3. Standalone-panel uses createContentSlots and feeds Blueprint bag
//  4. Provider tabLabel is a string that follows the ComfyUI locale
//  5. rebuildContent mutates the contentHost in place (loadTheme contract)
//
// Tests run under Node with a tiny jsdom-lite stub so we don't have to spin
// up ComfyUI for every fix. The Theme data layer is mocked; the panel is the
// surface under test.

import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

// --- jsdom-lite -----------------------------------------------------------
// We only need createElement + add/remove class + children. This avoids
// pulling in a heavy jsdom dependency just to test DOM mutations.

class StubElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.className = "";
    this.children = [];
    this.parent = null;
    this._attrs = new Map();
    this.dataset = new Proxy({}, {
      set: (target, key, value) => { target[key] = value; return true; },
    });
  }
  append(...kids) {
    for (const k of kids) {
      if (k == null) continue;
      const node = Array.isArray(k) ? k : [k];
      for (const n of node) {
        if (n == null) continue;
        n.parent = this;
        this.children.push(n);
      }
    }
  }
  appendChild(node) { this.append(node); return node; }
  replaceChildren(...kids) {
    for (const c of this.children) c.parent = null;
    this.children.length = 0;
    this.append(...kids);
  }
  set hidden(value) { this._hidden = value; }
  get hidden() { return this._hidden === true; }
  set textContent(value) { this._text = value; }
  get textContent() { return this._text ?? (this.children.length === 0 ? "" : ""); }
  set type(value) { this._attrs.set("type", value); }
  get type() { return this._attrs.get("type"); }
  set id(value) { this._attrs.set("id", value); }
  get id() { return this._attrs.get("id"); }
  setAttribute(k, v) { this._attrs.set(k, v); }
  getAttribute(k) { return this._attrs.get(k); }
  addEventListener() { /* noop */ }
  removeEventListener() { /* noop */ }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  get style() {
    if (!this._style) this._style = { setProperty: (k, v) => { this._attrs.set(`style:${k}`, v); }, removeProperty: (k) => { this._attrs.delete(`style:${k}`); } };
    return this._style;
  }
  classList = {
    add: (...cls) => { for (const c of cls) if (!this.className.split(/\s+/).includes(c)) this.className = (this.className + " " + c).trim(); },
    remove: (...cls) => { this.className = this.className.split(/\s+/).filter((c) => !cls.includes(c)).join(" "); },
    contains: (c) => this.className.split(/\s+/).includes(c),
  };
}

const document = {
  createElement: (tag) => new StubElement(tag),
  getElementById: () => null,
  head: new StubElement("head"),
  ownerDocument: null,
};

globalThis.document = document;
// `app` is referenced by the i18n resolver; an empty stub is enough for
// locale fallback path testing.
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { language: "zh-CN" },
});
globalThis.window = { comfyAPI: { app: { app: { ui: { settings: { getSettingValue: () => "zh" } } } } } };
// getComputedStyle is a window-level API the runtime adapter uses to read
// CSS variables off documentElement. Stub it so captureSnapshot is a no-op
// under Node.
Object.defineProperty(globalThis, "getComputedStyle", {
  configurable: true,
  value: () => ({ getPropertyValue: () => "" }),
});

// --- Load modules under test ---------------------------------------------
// We need to import theme_lab_panel.js and provider.js. They import a few
// ComfyUI-agnostic data modules that are safe to load under Node.

const { ThemeLabPanel } = await import(pathToFileURL(path.join(ROOT, "js/lib/theme_lab_panel.js")).href);
const { createThemeProvider } = await import(pathToFileURL(path.join(ROOT, "js/lib/provider.js")).href);
const { resolveLocale, labelsFor, t } = await import(pathToFileURL(path.join(ROOT, "js/lib/i18n.js")).href);
const { validateThemeDocument } = await import(pathToFileURL(path.join(ROOT, "js/lib/theme_document.js")).href);

// --- 1. locale resolution ------------------------------------------------
assert.equal(resolveLocale({ app: { ui: { settings: { getSettingValue: () => "zh" } } } }), "zh", "ComfyUI zh setting -> zh");
assert.equal(resolveLocale({ app: { ui: { settings: { getSettingValue: () => "en-US" } } } }), "en", "en-US setting -> en");
assert.equal(resolveLocale({ app: { ui: { settings: { getSettingValue: () => "zh-TW" } } } }), "zh", "zh-TW setting -> zh family");
assert.equal(resolveLocale({ app: { ui: { settings: () => null } } }), "zh", "navigator zh-CN fallback");
assert.equal(resolveLocale({ app: {} }), "zh", "navigator fallback (no app)");
const labels = labelsFor("zh");
assert.ok(labels.tabLabel.includes("主题"), "zh tabLabel contains 主题");
assert.equal(labelsFor("en").tabLabel.includes("Theme"), true, "en tabLabel contains Theme");
assert.equal(labelsFor("en").emptyTitle, "No theme is being edited", "en chrome labels are available");
assert.equal(t("en", "statusImported", { name: "sample.json" }), "Imported sample.json", "i18n formats runtime values");
assert.equal(t("zh", "statusThemeListRefreshed", { count: 3 }), "已刷新 3 个内置主题。", "zh runtime status formats values");
assert.throws(
  () => validateThemeDocument([], "en"),
  /Theme file must be a JSON object/,
  "theme document validation follows the requested locale",
);

// --- 2. provider contract ------------------------------------------------
const fakeApp = { extensionManager: { toast: null } };
const provider = createThemeProvider({ app: fakeApp, onHostClaimed: () => {} });
assert.equal(provider.apiVersion, 1);
assert.equal(provider.id, "workspacekit.theme");
assert.equal(provider.icon, "🎨");
assert.ok(typeof provider.tabLabel === "string" && provider.tabLabel.length > 0, "tabLabel is non-empty string");
assert.ok(provider.tabLabel.includes("主题"), "zh tabLabel contains 主题");
assert.equal(typeof provider.render, "function");

// --- 3. mountBlueprint normalizes Blueprint bag --------------------------
const header = document.createElement("div");
const toolbar = document.createElement("div");
const controls = document.createElement("div");
const content = document.createElement("div");
const element = document.createElement("section");
element.append(header, toolbar, controls, content);
const blueprint = {
  element,
  header,
  toolbar,
  controls,
  content,
  setHeader() {}, setToolbar() {}, setControls() {}, setContent() {},
  ui: null,
};
const adapter = {
  captureSnapshot: () => ({ colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} } }),
  captureRuntimeTheme: () => validateThemeDocument({ colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} } }),
  applyTheme() {}, applyField() {},
};
const panel1 = new ThemeLabPanel(fakeApp, adapter);
panel1.mountBlueprint(blueprint, null);
assert.ok(panel1.hosts, "panel.hosts set after mountBlueprint");
assert.equal(panel1.hosts.contentHost, content, "Blueprint bag -> contentHost alias");
assert.equal(panel1.hosts.headerHost, header, "Blueprint bag -> headerHost alias");
assert.equal(panel1.hosts.controlsHost, controls, "Blueprint bag -> controlsHost alias");
assert.equal(panel1.hosts.toolbarHost, toolbar, "Blueprint bag -> toolbarHost alias");
assert.ok(element.className.includes("wkt-theme-lab-host"), "Blueprint surface (element) has wkt-theme-lab-host class");

// --- 4. mountBlueprint normalizes host bag (pass-through) ---------------
const headerH = document.createElement("div");
const toolbarH = document.createElement("div");
const controlsH = document.createElement("div");
const contentH = document.createElement("div");
const panel2 = new ThemeLabPanel(fakeApp, adapter);
panel2.mountBlueprint(
  { headerHost: headerH, toolbarHost: toolbarH, controlsHost: controlsH, contentHost: contentH },
  null,
);
assert.equal(panel2.hosts.contentHost, contentH, "host bag pass-through contentHost");
assert.equal(panel2.hosts.headerHost, headerH, "host bag pass-through headerHost");

// --- 5. rebuildContent mutates contentHost in place ---------------------
// First mount: rebuildContent populates contentHost.
const panel3 = new ThemeLabPanel(fakeApp, adapter);
const hostC = document.createElement("div");
panel3.mountBlueprint({ headerHost: document.createElement("div"), toolbarHost: document.createElement("div"), controlsHost: document.createElement("div"), contentHost: hostC }, null);
const initialChildren = hostC.children.length;
assert.ok(initialChildren > 0, "rebuildContent populated contentHost on first mount");

// loadTheme -> rebuildContent must reuse the same contentHost, not replace it.
const originalHost = panel3.hosts.contentHost;
const theme = validateThemeDocument({
  id: "smoke",
  name: "Smoke",
  colors: {
    node_slot: { CLIP: "#FFA726", IMAGE: "#42A5F5" },
    litegraph_base: { NODE_TITLE_COLOR: "#ffffff" },
    comfy_base: { BG_COLOR: "#202020" },
  },
});
panel3.loadTheme(theme, "已导入测试", { sourceType: "wk", sourceFile: "themes/wk/smoke.json" });
assert.strictEqual(panel3.hosts.contentHost, originalHost, "loadTheme keeps the same contentHost reference");
assert.ok(originalHost.children.length > 0, "loadTheme populated contentHost with groups");
assert.deepEqual(panel3.metadata, { fileName: "smoke", name: "Smoke", id: "smoke" }, "loadTheme initializes save metadata from the source file");
assert.equal(panel3.sourceType, "wk", "loadTheme retains the theme source type");
assert.equal(panel3.sourceFile, "themes/wk/smoke.json", "loadTheme retains the source file");
assert.equal(panel3.dirty, false, "freshly loaded theme is clean");

// Loaded metadata moves into Toolbar. ID stays in the data model for save
// documents but is not a third user-editable field in the visible panel.
const toolbarTree = panel3.hosts.toolbarHost;
const toolbarMetadata = toolbarTree.children.find((c) => c.className.includes("wkt-toolbar"))
  ?.children.find((c) => c.className.includes("wkt-toolbar-metadata"));
assert.ok(toolbarMetadata, "loaded theme shows metadata in Toolbar");
assert.equal(toolbarMetadata.children.length, 2, "Toolbar exposes only file name and theme name fields");
assert.equal(toolbarMetadata.children[0].getAttribute("aria-label"), "文件名", "first Toolbar field is file name");
assert.equal(toolbarMetadata.children[1].getAttribute("aria-label"), "主题名", "second Toolbar field is theme name");

// loadTheme should also have produced nested groups inside the contentHost.
const wktContent = originalHost.children.find((c) => c.className.includes("wkt-content"));
assert.ok(wktContent, "wkt-content wrap present in contentHost");
assert.ok(wktContent.children.some((c) => c.className.includes("wkt-content-search")), "parameter search remains above cards in Content");
const groups = wktContent.children.filter((c) => c.className.includes("wkt-group"));
assert.ok(groups.length >= 1, "at least one wkt-group rendered (node_slot / litegraph_base / comfy_base)");

// --- 6. undo / redo also call rebuildContent -----------------------------
const undoBefore = originalHost.children.length;
panel3.undo(); // No-op since only one history entry
assert.equal(originalHost.children.length, undoBefore, "undo on first state is a safe no-op for content");
panel3.revertAll();
assert.ok(originalHost.children.length > 0, "revertAll keeps contentHost populated");
panel3.updateField("node_slot", "CLIP", "#FFFFFF", { commit: true });
assert.equal(panel3.dirty, true, "committed parameter edits mark the session dirty");
panel3.revertAll();
assert.equal(panel3.dirty, false, "revertAll restores the clean baseline state");

// --- 7. provider render accepts the documented host bag ----------------
const hostHeader = document.createElement("div");
const hostToolbar = document.createElement("div");
const hostControls = document.createElement("div");
const hostContent = document.createElement("div");
const dispose = provider.render({
  document,
  headerHost: hostHeader,
  toolbarHost: hostToolbar,
  controlsHost: hostControls,
  contextHost: hostToolbar,
  contentHost: hostContent,
  surface: null,
  ui: null,
});
assert.equal(typeof dispose, "function", "provider.render returns a dispose function");
assert.ok(hostContent.children.length > 0, "provider.render populated contentHost");
dispose();

console.log("batch3: checks passed (locale, provider, mountBlueprint, rebuildContent, metadata, dirty state, render)");
