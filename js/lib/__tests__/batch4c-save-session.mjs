// Batch 4C: save-session state tests. These stay DOM-free and exercise the
// critical data rules before browser UI wiring: overwrite detection, copy
// naming, saved baseline, and safe editor exit.

import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

globalThis.document = { createElement: () => ({}) };
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US" } });
Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: () => ({ getPropertyValue: () => "" }) });

const { ThemeLabPanel } = await import(pathToFileURL(path.join(ROOT, "js/lib/theme_lab_panel.js")).href);
const { validateThemeDocument } = await import(pathToFileURL(path.join(ROOT, "js/lib/theme_document.js")).href);

const adapter = {
  captureSnapshot: () => ({ colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} } }),
  captureRuntimeTheme: () => validateThemeDocument({ colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} } }),
  applyTheme() {},
  applyField() {},
};
const panel = new ThemeLabPanel({}, adapter);
const theme = validateThemeDocument({
  id: "wk-dark-zy",
  name: "WK Dark ZY",
  colors: { node_slot: {}, litegraph_base: {}, comfy_base: {} },
});
panel.loadTheme(theme, "loaded", { sourceType: "wk", sourceFile: "themes/wk/wk-dark-zy.json" });
assert.equal(panel.isOverwriteTarget(), true, "unchanged WK source is an overwrite target");
panel.metadata.fileName = "wk-dark-zy-v2";
panel.metadata.id = "wk-dark-zy-v2";
assert.equal(panel.isOverwriteTarget(), false, "changed file name turns a WK save into a new copy");
panel.metadata.fileName = "wk-dark-zy";
panel.metadata.id = "manual-id-is-ignored";
assert.equal(panel.isOverwriteTarget(), true, "manual ID cannot change an overwrite target");
panel.bundledThemes = [
  { id: "wk-dark-zy", file: "themes/wk/wk-dark-zy.json", sourceType: "wk" },
  { id: "wk-dark-zy-copy", file: "themes/wk/wk-dark-zy-copy.json", sourceType: "wk" },
];
assert.deepEqual(
  panel.suggestCopyMetadata(),
  { fileName: "wk-dark-zy-copy-2", id: "wk-dark-zy-copy-2", name: "WK Dark ZY" },
  "copy metadata skips occupied WK filename and ID",
);
const documentToSave = panel.buildSaveTheme({ fileName: "saved", name: "Saved Theme", id: "ignored-manual-id" });
assert.equal(documentToSave.id, "saved", "save document derives ID from file name");
assert.equal(documentToSave.name, "Saved Theme", "save document uses metadata name");
panel.dirty = true;
let restored = false;
panel.restoreRuntimeSnapshot = () => { restored = true; };
panel.rebuildContent = () => {};
panel.setStatus = () => {};
panel.finishEditing({ restoreRuntime: true });
assert.equal(restored, true, "normal exit restores the pre-open runtime snapshot");
assert.equal(panel.theme, null, "normal exit clears editing theme");
assert.equal(panel.dirty, false, "normal exit clears dirty state");

console.log("batch4c: checks passed (overwrite, copy naming, save document, safe exit)");
