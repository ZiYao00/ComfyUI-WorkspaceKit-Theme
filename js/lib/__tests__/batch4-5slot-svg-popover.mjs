// Batch 4 smoke: verify the four-slot / SVG / popover / title fallback fixes.
//
//   1. theme_icons exposes the 9 expected names
//   2. iconButton returns a button with innerHTML SVG and aria-label
//   3. mountBlueprint normalizes a standard four-slot Blueprint unchanged
//   4. renderShell populates header / toolbar / controls / content without adding a
//      Theme-specific sibling slot
//   6. renderControls creates a sibling "more" popover with save/exit groups
//   7. renderReference produces a palette placeholder for batch6
//   8. applyLiteGraph writes both prototype field and CSS variable for
//      NODE_TITLE_COLOR / NODE_SELECTED_TITLE_COLOR
//   9. i18n labels include the new group + action keys for both locales
//  10. a compatible UI Template supplies the shared control row and icon buttons

import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

// --- jsdom-lite (lighter than batch3's, but enough for our checks) -------
class StubElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.className = "";
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this._attrs = new Map();
    this._listeners = new Map();
    this._hidden = false;
  }
  append(...kids) {
    for (const k of kids) {
      if (k == null) continue;
      const arr = Array.isArray(k) ? k : [k];
      for (const n of arr) {
        if (n == null) continue;
        n.parent = this;
        this.children.push(n);
      }
    }
  }
  appendChild(node) { this.append(node); return node; }
  get parentElement() { return this.parent instanceof StubElement ? this.parent : null; }
  insertBefore(node, ref) {
    if (ref == null) { this.append(node); return; }
    const i = this.children.indexOf(ref);
    if (i < 0) { this.append(node); return; }
    node.parent = this;
    this.children.splice(i, 0, node);
  }
  replaceChildren(...kids) {
    for (const c of this.children) c.parent = null;
    this.children.length = 0;
    this.append(...kids);
  }
  set hidden(v) { this._hidden = v; }
  get hidden() { return this._hidden === true; }
  set innerHTML(v) { this._innerHTML = v; this._text = v; }
  get innerHTML() { return this._innerHTML ?? ""; }
  set textContent(v) { this._text = v; }
  get textContent() { return this._text ?? ""; }
  set type(v) { this._attrs.set("type", v); }
  get type() { return this._attrs.get("type"); }
  set id(v) { this._attrs.set("id", v); }
  get id() { return this._attrs.get("id"); }
  set name(v) { this._attrs.set("name", v); }
  get name() { return this._attrs.get("name"); }
  set value(v) { this._attrs.set("value", v); }
  get value() { return this._attrs.get("value"); }
  set checked(v) { this._attrs.set("checked", v); }
  get checked() { return Boolean(this._attrs.get("checked")); }
  set selected(v) { this._attrs.set("selected", v); }
  get selected() { return Boolean(this._attrs.get("selected")); }
  set placeholder(v) { this._attrs.set("placeholder", v); }
  get placeholder() { return this._attrs.get("placeholder"); }
  set min(v) { this._attrs.set("min", v); }
  get min() { return this._attrs.get("min"); }
  set max(v) { this._attrs.set("max", v); }
  get max() { return this._attrs.get("max"); }
  set step(v) { this._attrs.set("step", v); }
  get step() { return this._attrs.get("step"); }
  setAttribute(k, v) { this._attrs.set(k, v); }
  getAttribute(k) { return this._attrs.get(k); }
  removeAttribute(k) { this._attrs.delete(k); }
  addEventListener(name, fn) {
    const arr = this._listeners.get(name) || [];
    arr.push(fn);
    this._listeners.set(name, arr);
  }
  removeEventListener(name, fn) {
    const arr = this._listeners.get(name) || [];
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  click() {
    for (const fn of this._listeners.get("click") || []) fn({ target: this });
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  get style() {
    if (!this._style) this._style = { setProperty: (k, v) => { this._attrs.set(`style:${k}`, v); }, removeProperty: (k) => { this._attrs.delete(`style:${k}`); } };
    return this._style;
  }
  get classList() {
    return {
      add: (...cls) => { for (const c of cls) if (!this.className.split(/\s+/).includes(c)) this.className = (this.className + " " + c).trim(); },
      remove: (...cls) => { this.className = this.className.split(/\s+/).filter((c) => !cls.includes(c)).join(" "); },
      contains: (c) => this.className.split(/\s+/).includes(c),
    };
  }
}

const document = {
  createElement: (tag) => new StubElement(tag),
  getElementById: () => null,
  head: new StubElement("head"),
  ownerDocument: null,
  documentElement: new StubElement("html"),
};
globalThis.document = document;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "zh-CN" } });
globalThis.window = { comfyAPI: { app: { app: { ui: { settings: { getSettingValue: () => "zh" } } } } } };
Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: () => ({ getPropertyValue: () => "" }) });
let savedCss = {};
Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: function () {} });

// Track CSS variables written to documentElement.
const _set = document.documentElement.style.setProperty;
document.documentElement.style.setProperty = (k, v) => { savedCss[k] = v; return _set.call(document.documentElement.style, k, v); };

// --- Modules under test -------------------------------------------------
const { THEME_ICONS, iconButton } = await import(pathToFileURL(path.join(ROOT, "js/lib/theme_icons.js")).href);
const { ThemeLabPanel } = await import(pathToFileURL(path.join(ROOT, "js/lib/theme_lab_panel.js")).href);
const { resolveLocale, labelsFor, t } = await import(pathToFileURL(path.join(ROOT, "js/lib/i18n.js")).href);
const { validateThemeDocument } = await import(pathToFileURL(path.join(ROOT, "js/lib/theme_document.js")).href);
const { ThemeRuntimeAdapter } = await import(pathToFileURL(path.join(ROOT, "js/lib/theme_runtime_adapter.js")).href);

// --- 1. icon set --------------------------------------------------------
const expectedIcons = ["import", "capture", "export", "undo", "redo", "reset", "restore", "apply", "save", "exit", "more", "settings", "close"];
for (const name of expectedIcons) {
  assert.ok(THEME_ICONS[name]?.startsWith("<svg"), `icon "${name}" is an inline SVG`);
  assert.ok(THEME_ICONS[name].includes("currentColor"), `icon "${name}" uses currentColor`);
}

// --- 2. iconButton helper -----------------------------------------------
const btn = iconButton("apply", "Apply Theme", () => {});
assert.equal(btn.tagName, "BUTTON");
assert.ok(btn.className.includes("wkt-button-icon"), "icon button class");
assert.ok(btn.innerHTML.includes("<svg"), "icon button has inner SVG");
assert.equal(btn.getAttribute("aria-label"), "Apply Theme");

// --- 3. i18n coverage ---------------------------------------------------
const zh = labelsFor("zh");
const en = labelsFor("en");
for (const key of ["groupFile", "groupHistory", "groupRestore", "groupSession", "actionSave", "actionSaveCopy", "actionExit", "actionSaveExit", "alphaTitle"]) {
  assert.ok(typeof zh[key] === "string" && zh[key].length, `zh.${key} present`);
  assert.ok(typeof en[key] === "string" && en[key].length, `en.${key} present`);
}
assert.equal(t("zh", "actionApply"), "应用主题", "zh actionApply label");
assert.equal(t("en", "actionApply"), "Apply Theme", "en actionApply label");

// --- 4. adapter writes both prototype and CSS variable ------------------
savedCss = {};
const fakeLiteGraph = {};
const fakeCanvas = { NODE_TITLE_COLOR: "#000" };
function FakeCanvasClass() {}
FakeCanvasClass.prototype.NODE_TITLE_COLOR = "#000";
const adapter = new ThemeRuntimeAdapter({});
Object.defineProperty(adapter, "liteGraph", { value: fakeLiteGraph });
Object.defineProperty(adapter, "canvasClass", { value: FakeCanvasClass });
Object.defineProperty(adapter, "canvas", { value: fakeCanvas });
adapter.applyLiteGraph({
  NODE_TITLE_COLOR: "#FFFFFF",
  NODE_SELECTED_TITLE_COLOR: "#FF0000",
});
assert.equal(fakeLiteGraph.NODE_TITLE_COLOR, "#FFFFFF", "field set on LiteGraph globals");
assert.equal(FakeCanvasClass.NODE_TITLE_COLOR, "#FFFFFF", "field set on LGraphCanvas class (own property)");
assert.equal(fakeCanvas.NODE_TITLE_COLOR, "#FFFFFF", "field set on canvas instance");
assert.equal(savedCss["--lg-node-title-color"], "#FFFFFF", "CSS variable for node title");
assert.equal(savedCss["--lg-node-selected-title-color"], "#FF0000", "CSS variable for selected title");

// --- 5. mountBlueprint preserves the standard four Blueprint slots -------
const hostContainer = document.createElement("div");
const header = document.createElement("div");
const toolbar = document.createElement("div");
const controls = document.createElement("div");
const content = document.createElement("div");
const element = document.createElement("section");
hostContainer.append(element);
element.append(header, toolbar, controls, content);
const blueprint = {
  element, header, toolbar, controls, content,
  setHeader() {}, setToolbar() {}, setControls() {}, setContent() {},
  ui: null,
};
const captureAdapter = {
  captureSnapshot: () => ({ colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} } }),
  captureRuntimeTheme: () => validateThemeDocument({ colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} } }),
  applyTheme() {}, applyField() {},
};
const panel = new ThemeLabPanel({}, captureAdapter);
panel.mountBlueprint(blueprint, null);
assert.equal(element.children.length, 4, "Blueprint retains exactly four slots");
assert.ok(content.parentElement === element, "contentHost remains in the Blueprint");

// --- 6. renderShell populates the standard slots ------------------------
assert.ok(panel.hosts.headerHost.children.length > 0, "header slot populated");
assert.ok(panel.hosts.toolbarHost.children.length > 0, "toolbar slot populated");
assert.ok(panel.hosts.controlsHost.children.length > 0, "controls slot populated");
assert.ok(panel.hosts.contentHost.children.length > 0, "content slot populated");

// --- 8. Toolbar has search + high-frequency actions; Controls has source --
const toolbarWrap = panel.hosts.toolbarHost.children[0];
const search = toolbarWrap.children.find((c) => c.className.includes("wkt-search-input"));
assert.ok(search, "search input in toolbar");
assert.equal(search.type, "search", "search input type=search");
const toolbarActions = toolbarWrap.children.find((c) => c.className.includes("wkt-toolbar-actions"));
assert.ok(toolbarActions, "toolbar actions present");
const controlsWrap = panel.hosts.controlsHost.children[0];
const controlsRow = controlsWrap.children.find((c) => c.className.includes("wkt-controls-row"));
assert.ok(controlsRow, "controls row present");
const moreAnchor = toolbarActions.children.find((c) => c.className.includes("wkt-popover-anchor"));
assert.ok(moreAnchor, "more popover anchor present");
const more = moreAnchor.children.find((c) => c.className.includes("wkt-more-toggle"));
assert.ok(more, "more toggle present");
const popover = moreAnchor.children.find((c) => c.className.includes("wkt-popover"));
assert.ok(popover, "popover is a toggle sibling, not nested inside the button");
const groups = popover.children.filter((c) => c.className.includes("wkt-popover-group"));
assert.equal(groups.length, 4, "4 popover groups (file / history / restore / session)");
const allItems = popover.children.flatMap((g) => g.children.filter((c) => c.className.includes("wkt-popover-item") || c.className.includes("wkt-popover-toggle")));
assert.ok(allItems.length >= 10, "10+ popover items include source, export, save, history, restore, and session actions");

// --- 8. reference picker lives inside the Content slot -----------------
const findDescendant = (node, predicate) => {
  for (const child of node?.children ?? []) {
    if (predicate(child)) return child;
    const found = findDescendant(child, predicate);
    if (found) return found;
  }
  return null;
};
const palette = findDescendant(
  panel.hosts.contentHost,
  (node) => node.className?.includes?.("wkt-palette-slot") || node.dataset?.role === "palette-placeholder",
);
assert.ok(palette, "palette placeholder exists in Content");
const reference = findDescendant(
  panel.hosts.contentHost,
  (node) => node.className?.includes?.("wkt-reference"),
);
assert.ok(reference, "reference picker exists inside Content");
assert.equal(reference.open, true, "reference picker exposes the empty drop surface by default");
const referenceDropzone = findDescendant(
  reference,
  (node) => node.className?.includes?.("wkt-reference-dropzone") || node.className?.includes?.("workspacekit-ui-dropzone"),
);
assert.ok(referenceDropzone, "empty reference picker exposes a clickable drop surface");
const screenPicker = findDescendant(
  reference,
  (node) => node.getAttribute?.("aria-label") === labelsFor("zh").actionScreenPicker,
);
assert.ok(screenPicker, "reference picker retains the screen-color picker after the dropzone rework");
panel.referenceImage = { naturalWidth: 0, naturalHeight: 0 };
panel.referenceFileName = "reference.png";
const loadedReference = panel.renderReference();
const reimportReference = findDescendant(
  loadedReference,
  (node) => node.getAttribute?.("aria-label") === labelsFor("zh").actionImportReference,
);
const clearReference = findDescendant(
  loadedReference,
  (node) => node.getAttribute?.("aria-label") === labelsFor("zh").actionClearReference,
);
assert.ok(reimportReference, "loaded reference exposes a re-import action");
assert.ok(clearReference, "loaded reference exposes a remove action");
panel.referenceImage = null;
panel.referenceFileName = "";
const emptyPrimaryAction = findDescendant(
  panel.hosts.contentHost,
  (node) => node.className?.includes?.("wkt-empty-action-primary"),
);
const emptyActions = findDescendant(
  panel.hosts.contentHost,
  (node) => node.className?.includes?.("wkt-empty-actions"),
);
assert.ok(emptyPrimaryAction, "unloaded Theme state exposes a primary import action");
assert.ok(emptyActions?.children?.length === 2, "unloaded Theme state exposes import and capture actions");

// --- 9. provider render under a standard host bag -----------------------
const providerAdapter = {
  captureSnapshot: () => ({ colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} } }),
  captureRuntimeTheme: () => validateThemeDocument({ colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} } }),
  applyTheme() {}, applyField() {},
};
const host = document.createElement("div");
const hostHeader = document.createElement("div");
const hostToolbar = document.createElement("div");
const hostControls = document.createElement("div");
const hostContent = document.createElement("div");
host.append(hostHeader, hostToolbar, hostControls, hostContent);
const panel3 = new ThemeLabPanel({}, providerAdapter);
panel3.mountBlueprint({
  headerHost: hostHeader,
  toolbarHost: hostToolbar,
  controlsHost: hostControls,
  contentHost: hostContent,
}, null);
assert.ok(hostContent.children.length > 0, "host-bag content populated");

// --- 10. compatible UI Template uses shared controls --------------------
const sharedUi = {
  supports: () => true,
  createModuleHeader: ({ title }) => {
    const element = document.createElement("div");
    const status = document.createElement("output");
    element.append(status);
    return { element, status, setStatus: () => {}, title };
  },
  createIconButton: ({ label, content, onPress }) => {
    const button = document.createElement("button");
    button.className = "workspacekit-ui-icon-button";
    button.setAttribute("aria-label", label);
    button.append(content);
    button.addEventListener("click", onPress);
    return button;
  },
  createButton: ({ label, onPress }) => {
    const button = document.createElement("button");
    button.className = "workspacekit-ui-button";
    button.textContent = label;
    button.addEventListener("click", onPress);
    return button;
  },
  createControlRow: ({ leading, trailing }) => {
    const element = document.createElement("div");
    element.className = "workspacekit-ui-control-row";
    const leadingElement = document.createElement("div");
    const trailingElement = document.createElement("div");
    leadingElement.append(leading);
    trailingElement.append(...trailing);
    element.append(leadingElement, trailingElement);
    return { element, leading: leadingElement, trailing: trailingElement };
  },
};
const sharedHeader = document.createElement("div");
const sharedToolbar = document.createElement("div");
const sharedControls = document.createElement("div");
const sharedContent = document.createElement("div");
const sharedPanel = new ThemeLabPanel({}, providerAdapter);
sharedPanel.mountBlueprint({
  headerHost: sharedHeader,
  toolbarHost: sharedToolbar,
  controlsHost: sharedControls,
  contentHost: sharedContent,
  ui: sharedUi,
}, sharedUi);
assert.ok(findDescendant(sharedControls, (node) => node.className?.includes?.("workspacekit-ui-control-row")), "shared control row is used");
assert.ok(findDescendant(sharedToolbar, (node) => node.className?.includes?.("workspacekit-ui-icon-button")), "shared icon buttons are used in Toolbar");
sharedPanel.setStatus("Saved status", "success");
assert.equal(sharedPanel.refs.statusText?.textContent, "Saved status", "shared header retains a live status-text reference after moving its children");
const sharedField = sharedPanel.renderField({
  section: "comfy_base",
  key: "TEST",
  value: "value",
  meta: { type: "text", label: "Test", description: "" },
});
assert.ok(findDescendant(sharedField, (node) => node.className?.includes?.("workspacekit-ui-button")), "shared field action button is used");
const sharedNumberField = sharedPanel.renderField({
  section: "comfy_base",
  key: "SIZE",
  value: 12,
  meta: { type: "number", label: "Size", description: "", min: 1, max: 24, step: 1 },
});
assert.ok(findDescendant(sharedNumberField, (node) => node.className?.includes?.("workspacekit-ui-range")), "numeric fields use the shared range class");
assert.ok(findDescendant(sharedContent, (node) => node.className?.includes?.("workspacekit-ui-section")), "reference area uses shared section anatomy");

console.log("batch4: 10 checks passed (icons, i18n, adapter fallback, four slots, popover, palette, host-bag, shared controls, shared sections)");
