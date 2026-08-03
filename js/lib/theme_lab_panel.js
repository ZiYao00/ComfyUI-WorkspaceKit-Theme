// Theme Lab panel. Renders into the host's Blueprint slots (Header / Toolbar /
// Controls / Content) using the shared WorkspaceKit Panel UI Template `ui`.
// All visual chrome is built from `ui.*` primitives + `--workspacekit-ui-*`
// tokens; the plugin only owns its data model, field rendering, and event
// handlers. The data layer (theme_document / theme_runtime_adapter / color_utils)
// is untouched.

import { FIELD_META, GROUP_META, inferFieldMeta, SECTION_META } from "./field_meta.js";
import { formatCssColor, parseCssColor, rgbToHex, sampleCanvasColor, withAlpha } from "./color_utils.js";
import { extractReferencePalette } from "./reference_palette.js";
import { cloneTheme, downloadTheme, getThemeValue, setThemeValue, validateThemeDocument } from "./theme_document.js";
import { labelsFor, resolveLocale, t } from "./i18n.js";
import { THEME_ICONS, iconButton } from "./theme_icons.js";

const MAX_HISTORY = 80;
const ROOT_CLASS = "wkt-theme-lab";
const FIELD_GRID_MIN = "180px"; // compact auto-fill minimum; still keeps a usable color row

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function pathKey(section, key) {
  return `${section}.${key}`;
}

function normalizeThemeFileStem(value, fallback = "wk-theme") {
  const stem = String(value ?? "")
    .replace(/\.json$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return stem || fallback;
}

// Install plugin-scoped styles exactly once. Plugin selectors stay under
// .wkt-theme-lab so they never touch the shared template tokens or the
// WorkspaceKit internals.
function ensureStyles(document) {
  if (document.getElementById("wkt-theme-lab-style")) return;
  const link = document.createElement("link");
  link.id = "wkt-theme-lab-style";
  link.rel = "stylesheet";
  // This module lives in js/lib; the stylesheet is owned by js/.
  link.href = new URL("../theme_lab.css", import.meta.url).href;
  document.head.append(link);
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export class ThemeLabPanel {
  constructor(app, adapter) {
    this.app = app;
    this.adapter = adapter;
    this.root = null;          // legacy mount() target (standalone)
    this.hosts = null;         // Blueprint slots (merged/standalone via Blueprint)
    this.ui = null;
    this.theme = null;
    this.baselineTheme = null;
    this.runtimeSnapshot = null;
    this.history = [];
    this.historyIndex = -1;
    this.livePreview = true;
    this.searchQuery = "";
    this.activeColorTarget = null;
    this.imageCanvas = null;
    this.imageObjectUrl = null;
    this.referenceImage = null;
    this.referenceFileName = "";
    this.referencePalette = [];
    this.referenceOpen = false;
    this.sampleSize = 3;
    this.bundledThemes = [];
    this.bundledThemeGroups = [];
    this._manifestRequest = null;
    // Save-target state is deliberately separate from `theme`. Theme history
    // remains about visual parameters, while metadata is applied only by the
    // later controlled save API.
    this.sourceType = "none";
    this.sourceFile = null;
    this.metadata = { fileName: "", name: "", id: "" };
    this.baselineMetadata = null;
    this.dirty = false;
    this._onOutsideClickRef = null;
    this._onPopoverKeyDownRef = null;

    // Render-time element references. Recreated on each mount/render.
    this.refs = {
      statusText: null,
      statusDot: null,
      livePreview: null,
      search: null,
      metadataFileName: null,
      metadataThemeName: null,
      importInput: null,
      themeSelect: null,
      activeTarget: null,
      imagePlaceholder: null,
      referenceCanvasWrap: null,
      referencePalette: null,
    };
    this._onOutsideClickRef = null;
    this._onPopoverKeyDownRef = null;
  }

  // All interactive panel copy resolves at render/action time so a rebuilt
  // panel follows ComfyUI's active locale without duplicating message maps.
  label(key, values) {
    return t(resolveLocale({ app: this.app }), key, values);
  }

  // Legacy entry point used by the original standalone path. Preserved so the
  // previous behavior keeps working in any caller that has not migrated to
  // Blueprint yet.
  mount(root) {
    ensureStyles(root?.ownerDocument ?? globalThis.document);
    this.root = root;
    this.root.classList.add("wkt-theme-lab-host");
    this.runtimeSnapshot = this.adapter.captureSnapshot();
    this.renderShell();
  }

  // New entry point used by the WorkspaceKit provider. `hosts` may be either:
  //   - host slot bag:  { headerHost, toolbarHost, controlsHost, contentHost, surface, document, ui }
  //   - Blueprint bag:  { header, toolbar, controls, content, element, setHeader, setToolbar, setControls, setContent, ui }
  // Theme uses the four standard slots only. The reference-color picker lives
  // inside Content so a host never needs a Theme-specific fifth slot.
  mountBlueprint(hosts, ui) {
    const doc = hosts?.document ?? hosts?.element?.ownerDocument ?? hosts?.contentHost?.ownerDocument ?? hosts?.content?.ownerDocument ?? globalThis.document;
    ensureStyles(doc);
    const normalized = this.#normalizeHosts(hosts, ui);
    this.hosts = normalized;
    this.ui = normalized.ui ?? ui;
    // The scoped CSS in theme_lab.css targets `.wkt-theme-lab-host` as the
    // ancestor. Apply it to the shell (or content slot if no shell) so the
    // rules hit no matter which host side wires the panel.
    (normalized.surface ?? normalized.contentHost)?.classList?.add?.("wkt-theme-lab-host");
    this.runtimeSnapshot = this.adapter.captureSnapshot();
    this.renderShell();
  }

  // Normalize either host or Blueprint slot bags to a single host-naming
  // shape without modifying the host DOM structure.
  #normalizeHosts(hosts, ui) {
    if (!hosts) return { document: globalThis.document, ui };
    if (hosts.headerHost || hosts.contentHost) {
      return {
        document: hosts.document ?? globalThis.document,
        headerHost: hosts.headerHost,
        toolbarHost: hosts.toolbarHost,
        controlsHost: hosts.controlsHost,
        contextHost: hosts.contextHost ?? hosts.toolbarHost,
        contentHost: hosts.contentHost,
        surface: hosts.surface,
        ui: hosts.ui ?? ui,
      };
    }
    // Blueprint bag — bind the standard four accessors as the host slots.
    return {
      document: hosts.element?.ownerDocument ?? globalThis.document,
      headerHost: hosts.header,
      toolbarHost: hosts.toolbar,
      controlsHost: hosts.controls,
      contextHost: hosts.context,
      contentHost: hosts.content,
      surface: hosts.element,
      ui: hosts.ui ?? ui,
    };
  }

  unmount() {
    if (this.imageObjectUrl) URL.revokeObjectURL(this.imageObjectUrl);
    if (this.hosts) {
      for (const slot of [this.hosts.headerHost, this.hosts.toolbarHost, this.hosts.controlsHost, this.hosts.contentHost]) {
        slot?.replaceChildren();
        if (slot) slot.hidden = false;
      }
      this.hosts = null;
      this.ui = null;
    } else if (this.root) {
      this.root.replaceChildren();
      this.root = null;
    }
  }

  restoreRuntimeBeforeClose() {
    this.restoreRuntimeSnapshot();
  }

  // -----------------------------------------------------------------------
  // Shell: Blueprint slot wiring
  // -----------------------------------------------------------------------

  renderShell() {
    if (!this.hosts && !this.root) return;

    if (this.hosts) {
      // Theme Lab uses the shared four-slot anatomy.
      for (const [slot, fn] of [
        [this.hosts.headerHost, () => this.renderHeader()],
        [this.hosts.toolbarHost, () => this.renderToolbar()],
        [this.hosts.controlsHost, () => this.renderControls()],
      ]) {
        if (!slot) continue;
        slot.replaceChildren();
        slot.hidden = false;
        slot.append(fn());
      }
      if (this.hosts.contentHost) {
        this.hosts.contentHost.hidden = false;
        this.rebuildContent();
      }
    } else {
      this.root.replaceChildren();
      const panel = createElement("div", ROOT_CLASS);
      panel.append(this.renderStandaloneShell());
      panel.append(this.renderHeader());
      panel.append(this.renderControls());
      panel.append(this.buildContent());
      this.root.append(panel);
    }
  }

  // -----------------------------------------------------------------------
  // Header (Blueprint: title + status)
  // -----------------------------------------------------------------------

  renderHeader() {
    const locale = resolveLocale({ app: this.app });
    const labels = labelsFor(locale);
    const headerTitle = labels.headerTitle;
    if (this.ui?.supports?.(1) && typeof this.ui.createModuleHeader === "function") {
      const header = this.ui.createModuleHeader({ title: headerTitle });
      // Keep the shared header-status element instead of replacing it. Theme
      // only adds its level dot/message inside the standard product component.
      const status = this.renderStatus();
      // Moving children into the shared host detaches them from `status`, so
      // retain the references created by renderStatus() before replaceChildren.
      const statusText = this.refs.statusText;
      const statusDot = this.refs.statusDot;
      // In hosted mode the WK slot itself is not necessarily a Vendor root.
      // Make this module-owned element the token bridge instead of styling the
      // host surface, which could otherwise affect sibling provider tabs.
      header.element.classList.add("workspacekit-ui-root");
      header.status.replaceChildren(...status.children);
      this.refs.statusText = statusText;
      this.refs.statusDot = statusDot;
      return header.element;
    }
    // Legacy: hand-rolled header row.
    const header = createElement("div", "wkt-header workspacekit-ui-root");
    header.append(
      createElement("span", "wkt-header-title", `🎨 ${headerTitle}`),
      this.renderStatus(),
    );
    this.refs.statusText = header.querySelector('[data-role="status-text"]');
    this.refs.statusDot = header.querySelector('[data-role="status-dot"]');
    return header;
  }

  // Row 1 (standalone only): sticky top bar with the localized title and a
  // settings button. The merged WorkspaceKit host already provides this; we
  // only render it when no host header covers the same ground.
  renderStandaloneShell() {
    const locale = resolveLocale({ app: this.app });
    const labels = labelsFor(locale);
    const shell = createElement("div", "wkt-standalone-shell");
    const title = createElement("span", "wkt-standalone-title", `🎨 ${labels.headerTitle}`);
    const settings = document.createElement("button");
    settings.type = "button";
    settings.className = "wkt-button wkt-button-icon wkt-standalone-settings";
    settings.innerHTML = THEME_ICONS.settings;
    settings.title = labels.actionSettings;
    settings.setAttribute("aria-label", labels.actionSettings);
    settings.addEventListener("click", () => {
      try { this.app?.ui?.settings?.showDialog?.(); } catch { /* noop */ }
    });
    shell.append(title, settings);
    return shell;
  }

  // -----------------------------------------------------------------------
  // Toolbar (Blueprint: search)
  // -----------------------------------------------------------------------

  renderToolbar() {
    const labels = labelsFor(resolveLocale({ app: this.app }));
    const wrap = createElement("div", "wkt-toolbar");
    const leading = this.theme
      ? this.renderToolbarMetadata(labels)
      : this.renderSearchInput();

    // The Toolbar owns high-frequency editor actions. Keeping this separate
    // from the source picker below preserves the WK five-zone anatomy and
    // keeps "choose a file" from competing with search/history controls.
    const actions = [
      this.createSharedIconButton("undo", labels.actionUndo, () => this.undo()),
      this.createSharedIconButton("redo", labels.actionRedo, () => this.redo()),
      this.createSharedIconButton("export", labels.actionExport, () => this.exportTheme()),
      this.renderMoreMenu(labels),
    ];
    if (this.ui?.supports?.(1) && typeof this.ui.createControlRow === "function") {
      const row = this.ui.createControlRow({ leading, trailing: actions });
      row.element.classList.add("wkt-toolbar-row");
      row.trailing.classList.add("wkt-toolbar-actions");
      wrap.append(row.element);
    } else {
      const actionsWrap = createElement("div", "wkt-toolbar-actions");
      actionsWrap.append(...actions);
      wrap.append(leading, actionsWrap);
    }
    return wrap;
  }

  // Search stays available while editing, but it belongs directly above the
  // parameter cards once Toolbar is occupied by file metadata. Rebuilding the
  // Content slot keeps filters correct; focus and caret are restored so this
  // move does not turn normal typing into a one-character interaction.
  renderSearchInput({ inContent = false } = {}) {
    const input = createElement("input", "wkt-input wkt-search-input");
    input.type = "search";
    input.placeholder = this.label("searchPlaceholder");
    input.value = this.searchQuery;
    input.addEventListener("input", () => {
      const caret = input.selectionStart ?? input.value.length;
      this.searchQuery = input.value.trim().toLowerCase();
      this.rebuildContent();
      if (inContent) {
        const next = this.refs.search;
        next?.focus?.();
        next?.setSelectionRange?.(caret, caret);
      }
    });
    this.refs.search = input;
    return input;
  }

  refreshToolbar() {
    const slot = this.hosts?.toolbarHost;
    if (!slot) return;
    slot.replaceChildren();
    slot.hidden = false;
    slot.append(this.renderToolbar());
  }

  // -----------------------------------------------------------------------
  // Controls (Blueprint: action buttons + live preview + edit history)
  // -----------------------------------------------------------------------

  renderControls() {
    const locale = resolveLocale({ app: this.app });
    const labels = labelsFor(locale);
    const wrap = createElement("div", "wkt-controls workspacekit-ui-root");

    // Hidden file input, shared by the import button.
    const importInput = createElement("input", "wkt-visually-hidden");
    importInput.type = "file";
    importInput.accept = ".json,application/json";
    importInput.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      importInput.value = "";
      if (!file) return;
      try {
        const theme = validateThemeDocument(JSON.parse(await file.text()), locale);
        this.loadTheme(theme, this.label("statusImported", { name: file.name }), { sourceType: "external", sourceFile: file.name });
      } catch (error) {
        this.notify("error", this.label("notifyThemeImportFailed"), error instanceof Error ? error.message : String(error));
      }
    });
    this.refs.importInput = importInput;

    // Theme library row: static manifest only. The browser cannot enumerate a
    // plugin folder, so the checked-in manifest under js/themes is the source
    // of truth. This intentionally does not inspect ComfyUI's theme directory.
    const sourceRow = createElement("div", "wkt-theme-source-row");
    const themeSelect = createElement("select", "wkt-input wkt-theme-select");
    themeSelect.setAttribute("aria-label", labels.themeSelectPlaceholder);
    themeSelect.addEventListener("change", () => {
      const themeId = themeSelect.value;
      if (themeId) void this.loadBundledTheme(themeId);
    });
    this.refs.themeSelect = themeSelect;
    this.populateThemeSelect(labels);

    const refresh = this.createSharedIconButton("reset", labels.actionRefresh, () => {
      void this.refreshBundledThemes();
    });
    const sourceImport = this.createSharedButton(labels.actionImport, () => this.requestThemeImport(), "wkt-theme-source-action");
    const sourceCapture = this.createSharedButton(labels.actionCapture, () => this.captureCurrentTheme(), "wkt-theme-source-action");
    sourceRow.append(themeSelect, refresh, sourceImport, sourceCapture);

    if (this.ui?.supports?.(1) && typeof this.ui.createControlRow === "function") {
      // Pass an explicit empty trailing list for older compatible Vendor
      // implementations whose createControlRow does not provide a default.
      const row = this.ui.createControlRow({ leading: sourceRow, trailing: [] });
      row.element.classList.add("wkt-controls-row");
      wrap.append(row.element, importInput);
    } else {
      const row = createElement("div", "wkt-controls-row");
      row.append(sourceRow);
      wrap.append(row, importInput);
    }
    // Do not make a network request under Node test stubs or file:// imports.
    // In the browser this immediately fills the select from js/themes/manifest.
    if (globalThis.window?.location?.protocol?.startsWith("http")) {
      void this.refreshBundledThemes({ silent: true });
    }
    return wrap;
  }

  populateThemeSelect(labels = labelsFor(resolveLocale({ app: this.app }))) {
    const select = this.refs.themeSelect;
    if (!select) return;
    const selected = select.value;
    select.replaceChildren();
    const placeholder = createElement("option", "", labels.themeSelectPlaceholder);
    placeholder.value = "";
    placeholder.selected = !selected;
    select.append(placeholder);
    for (const group of this.bundledThemeGroups) {
      const optgroup = createElement("optgroup");
      optgroup.label = group.label?.[resolveLocale({ app: this.app })] ?? group.label?.en ?? group.id;
      for (const item of group.items) {
        const option = createElement("option", "", item.name);
        option.value = item.id;
        option.selected = selected === item.id;
        optgroup.append(option);
      }
      select.append(optgroup);
    }
  }

  async refreshBundledThemes({ silent = false } = {}) {
    if (this._manifestRequest) return this._manifestRequest;
    const manifestUrl = new URL("../themes/manifest.json", import.meta.url).href;
    this._manifestRequest = (async () => {
      try {
        const response = await fetch(manifestUrl, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const manifest = await response.json();
        const groups = Array.isArray(manifest?.groups) ? manifest.groups : [];
        const normalized = groups.map((group) => ({
          id: String(group?.id ?? ""),
          label: group?.label ?? {},
          items: Array.isArray(group?.items) ? group.items.filter((item) => (
            typeof item?.id === "string"
            && typeof item?.name === "string"
            && this.isSafeBundledThemeFile(item?.file)
          )) : [],
        })).filter((group) => group.id && group.items.length);
        if (!normalized.length) throw new Error("Theme manifest has no usable items.");
        this.bundledThemeGroups = normalized;
        this.bundledThemes = normalized.flatMap((group) => group.items.map((item) => ({
          ...item,
          sourceType: group.id === "wk" ? "wk" : "builtin",
        })));
        this.populateThemeSelect();
        if (!silent) this.setStatus(this.label("statusThemeListRefreshed", { count: this.bundledThemes.length }), "success");
      } catch (error) {
        if (!silent) this.notify("error", this.label("notifyThemeListFailed"), error instanceof Error ? error.message : String(error));
      } finally {
        this._manifestRequest = null;
      }
    })();
    return this._manifestRequest;
  }

  isSafeBundledThemeFile(file) {
    return typeof file === "string"
      && /^themes\/(?:comfyui-default|wk)\/[A-Za-z0-9][A-Za-z0-9._-]*\.json$/i.test(file);
  }

  async loadBundledTheme(themeId) {
    const item = this.bundledThemes.find((candidate) => candidate.id === themeId);
    if (!item) return;
    try {
      const url = new URL(`../${item.file}`, import.meta.url).href;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.loadTheme(
        validateThemeDocument(await response.json(), resolveLocale({ app: this.app })),
        this.label("statusThemeLoaded", { name: item.name }),
        { sourceType: item.sourceType, sourceFile: item.file },
      );
    } catch (error) {
      this.notify("error", this.label("notifyThemeLoadFailed"), error instanceof Error ? error.message : String(error));
    }
  }

  exportTheme() {
    const labels = labelsFor(resolveLocale({ app: this.app }));
    if (!this.theme) return this.notify("warn", labels.notifyNoThemeSummary, labels.notifyNoThemeDetail);
    downloadTheme(this.theme);
    this.setStatus(labels.statusExported, "success");
  }

  // Prefer the shared UI Kit button when it is available. The inline SVG stays
  // Theme-owned, while sizing, focus, hover, and theme tokens come from the
  // common component. The fallback preserves standalone compatibility with an
  // older Vendor copy.
  createSharedIconButton(name, label, handler, { primary = false } = {}) {
    if (this.ui?.supports?.(1) && typeof this.ui.createIconButton === "function") {
      const glyph = createElement("span", "wkt-theme-icon");
      glyph.innerHTML = THEME_ICONS[name] ?? "";
      const button = this.ui.createIconButton({ label, content: glyph, onPress: handler });
      button.classList.add("wkt-theme-icon-button");
      if (primary) button.classList.add("wkt-button-primary");
      return button;
    }
    return iconButton(name, label, handler, { primary });
  }

  createSharedButton(label, handler, extraClass = "") {
    if (this.ui?.supports?.(1) && typeof this.ui.createButton === "function") {
      const button = this.ui.createButton({ label, onPress: handler });
      if (extraClass) button.classList.add(...extraClass.split(/\s+/).filter(Boolean));
      return button;
    }
    return this.button(label, handler, extraClass);
  }

  // "More actions" popover with 3 groups separated by dividers. The menu is
  // a sibling of its toggle, never a child of a <button>; nested interactive
  // content was the cause of the old unreliable opening behavior.
  renderMoreMenu(labels) {
    const toggle = this.createSharedIconButton("more", labels.actionMore, () => {});
    toggle.classList.add("wkt-more-toggle");
    toggle.setAttribute("aria-haspopup", "menu");
    toggle.setAttribute("aria-expanded", "false");

    const anchor = createElement("div", "wkt-popover-anchor");

    const popover = createElement("div", "wkt-popover");
    popover.hidden = true;
    popover.setAttribute("role", "menu");

    const buildGroup = (titleText, items) => {
      const group = createElement("div", "wkt-popover-group");
      const head = createElement("div", "wkt-popover-group-title", titleText);
      group.append(head);
      for (const item of items) group.append(item);
      return group;
    };

    // Preview is always live. Saving therefore belongs in a separate file
    // group rather than being confused with an "apply" action.
    const fileGroup = buildGroup(labels.groupFile, [
      this.popoverItem("import", labels.actionImport, () => { this.requestThemeImport(); this.closePopover(popover, toggle); }, labels.actionImport),
      this.popoverItem("capture", labels.actionCapture, () => { this.captureCurrentTheme(); this.closePopover(popover, toggle); }, labels.actionCapture),
      this.popoverItem("export", labels.actionExport, () => { this.exportTheme(); this.closePopover(popover, toggle); }, labels.actionExport),
      this.popoverItem("save", labels.actionSave, () => { void this.saveTheme(); this.closePopover(popover, toggle); }, labels.actionSave),
      this.popoverItem("save", labels.actionSaveCopy, () => { void this.saveTheme({ saveCopy: true }); this.closePopover(popover, toggle); }, labels.actionSaveCopy),
    ]);
    popover.append(fileGroup);

    // History group: undo / redo.
    const historyGroup = buildGroup(labels.groupHistory, [
      this.popoverItem("undo", labels.actionUndo, () => { this.undo(); this.closePopover(popover, toggle); }, labels.actionUndo),
      this.popoverItem("redo", labels.actionRedo, () => { this.redo(); this.closePopover(popover, toggle); }, labels.actionRedo),
    ]);
    popover.append(historyGroup);

    // Restore group.
    const restoreGroup = buildGroup(labels.groupRestore, [
      this.popoverItem("reset", labels.actionReset, () => { this.revertAll(); this.closePopover(popover, toggle); }, labels.actionReset),
    ]);
    popover.append(restoreGroup);

    const sessionGroup = buildGroup(labels.groupSession, [
      this.popoverItem("exit", labels.actionExit, () => { void this.requestExit(); this.closePopover(popover, toggle); }, labels.actionExit),
      this.popoverItem("save", labels.actionSaveExit, () => { void this.requestSaveAndExit(); this.closePopover(popover, toggle); }, labels.actionSaveExit),
    ]);
    popover.append(sessionGroup);

    // Open/close + outside-click handling.
    const ownerDocument = this.hosts?.document ?? this.root?.ownerDocument ?? globalThis.document;
    const onOutsideClick = (event) => {
      if (anchor.contains(event.target)) return;
      this.closePopover(popover, toggle);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || popover.hidden) return;
      event.preventDefault();
      this.closePopover(popover, toggle);
      toggle.focus();
    };
    this._onOutsideClickRef = onOutsideClick;
    this._onPopoverKeyDownRef = onKeyDown;
    const onToggle = (event) => {
      event?.stopPropagation?.();
      const isOpen = !popover.hidden;
      if (isOpen) {
        this.closePopover(popover, toggle);
      } else {
        popover.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        toggle.classList.add("is-open");
        // Defer outside-click binding to next tick so the click that opened
        // the popover does not immediately close it.
        setTimeout(() => {
          ownerDocument.addEventListener("click", onOutsideClick, { capture: true });
          ownerDocument.addEventListener("keydown", onKeyDown, { capture: true });
        }, 0);
      }
    };
    toggle.addEventListener("click", onToggle);
    anchor.append(toggle, popover);
    return anchor;
  }

  popoverItem(iconName, label, handler, title) {
    const item = createElement("button", "wkt-popover-item");
    item.type = "button";
    item.setAttribute("role", "menuitem");
    item.innerHTML = THEME_ICONS[iconName] ?? "";
    const text = createElement("span", "", label);
    item.append(text);
    item.title = title ?? label;
    item.setAttribute("aria-label", title ?? label);
    item.addEventListener("click", handler);
    return item;
  }

  closePopover(popover, toggle) {
    if (!popover) return;
    popover.hidden = true;
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.classList.remove("is-open");
    }
    if (this._onOutsideClickRef) {
      const ownerDocument = this.hosts?.document ?? this.root?.ownerDocument ?? globalThis.document;
      ownerDocument.removeEventListener("click", this._onOutsideClickRef, { capture: true });
      this._onOutsideClickRef = null;
    }
    if (this._onPopoverKeyDownRef) {
      const ownerDocument = this.hosts?.document ?? this.root?.ownerDocument ?? globalThis.document;
      ownerDocument.removeEventListener("keydown", this._onPopoverKeyDownRef, { capture: true });
      this._onPopoverKeyDownRef = null;
    }
  }

  // -----------------------------------------------------------------------
  // Content: reference picker + field groups in auto-fill grid.
  // rebuildContent() mutates the standard Content slot in place so that
  // loadTheme / undo / redo / restoreField / revertAll / applySampledColor
  // all see a fresh DOM tree without losing the host reference. The first
  // mount also routes through here via renderShell.
  // -----------------------------------------------------------------------

  rebuildContent() {
    const target = this.hosts?.contentHost ?? this.root?.querySelector?.(`.${ROOT_CLASS}`) ?? this.root;
    if (!target) return null;
    target.replaceChildren();
    const wrap = this.buildContent();
    target.append(wrap);
    this.updateActiveTargetLabel();
    return wrap;
  }

  buildContent() {
    const wrap = createElement("div", "wkt-content workspacekit-ui-root");
    if (this.theme) {
      const search = this.renderSearchInput({ inContent: true });
      search.classList.add("wkt-content-search");
      wrap.append(search);
    }
    wrap.append(this.renderReference());

    if (!this.theme) {
      const labels = labelsFor(resolveLocale({ app: this.app }));
      const empty = createElement("div", "wkt-empty");
      empty.append(
        createElement("strong", "", labels.emptyTitle),
        createElement("p", "", labels.emptyDescription),
      );
      const actions = createElement("div", "wkt-empty-actions");
      const importButton = this.createSharedButton(labels.actionImport, () => this.requestThemeImport(), "wkt-empty-action wkt-empty-action-primary");
      const captureButton = this.createSharedButton(labels.actionCapture, () => this.captureCurrentTheme(), "wkt-empty-action");
      actions.append(importButton, captureButton);
      empty.append(actions);
      wrap.append(empty);
      return wrap;
    }

    const grouped = new Map();
    for (const meta of GROUP_META) grouped.set(meta.id, []);

    for (const section of Object.keys(SECTION_META)) {
      const values = this.theme.colors?.[section] ?? {};
      for (const [key, value] of Object.entries(values)) {
        const meta = inferFieldMeta(section, key, value);
        if (!grouped.has(meta.group)) grouped.set(meta.group, []);
        if (this.searchQuery) {
          const haystack = `${meta.label} ${key} ${meta.description}`.toLowerCase();
          if (!haystack.includes(this.searchQuery)) continue;
        }
        grouped.get(meta.group).push({ section, key, value, meta });
      }
    }

    for (const group of GROUP_META) {
      const entries = grouped.get(group.id);
      if (!entries || !entries.length) continue;
      wrap.append(this.renderGroup(group, entries));
    }

    return wrap;
  }

  // File name and theme name are editing context, not parameter cards. ID is
  // deliberately not exposed: it always derives from the normalized file
  // name, so save targets remain predictable without a third narrow field.
  renderToolbarMetadata(labels) {
    const wrap = createElement("div", "wkt-toolbar-metadata");
    const fileInput = createElement("input", "wkt-input wkt-toolbar-metadata-input");
    fileInput.type = "text";
    fileInput.value = this.metadata.fileName;
    fileInput.maxLength = 80;
    fileInput.spellcheck = false;
    fileInput.placeholder = labels.metadataFileName;
    fileInput.setAttribute("aria-label", labels.metadataFileName);
    fileInput.title = labels.metadataFileName;
    fileInput.addEventListener("input", () => {
      this.metadata.fileName = normalizeThemeFileStem(fileInput.value, this.metadata.fileName || "wk-theme");
      this.metadata.id = this.metadata.fileName;
      fileInput.value = this.metadata.fileName;
      this.refreshDirtyState();
    });
    const nameInput = createElement("input", "wkt-input wkt-toolbar-metadata-input");
    nameInput.type = "text";
    nameInput.value = this.metadata.name;
    nameInput.maxLength = 120;
    nameInput.spellcheck = false;
    nameInput.placeholder = labels.metadataThemeName;
    nameInput.setAttribute("aria-label", labels.metadataThemeName);
    nameInput.title = labels.metadataThemeName;
    nameInput.addEventListener("input", () => {
      this.metadata.name = nameInput.value;
      this.refreshDirtyState();
    });
    this.refs.metadataFileName = fileInput;
    this.refs.metadataThemeName = nameInput;
    wrap.append(fileInput, nameInput);
    return wrap;
  }

  renderGroup(group, entries) {
    const details = createElement("details", "wkt-group workspacekit-ui-section");
    details.open = true; // all groups expanded by default (per Q4)
    const summary = createElement("summary", "wkt-group-summary workspacekit-ui-section-head");
    const title = createElement("span", "wkt-group-title workspacekit-ui-section-title", group.label);
    const count = createElement("span", "wkt-group-count", String(entries.length));
    summary.append(title, count);
    details.append(summary);
    if (group.description) details.append(createElement("p", "wkt-group-description workspacekit-ui-section-description", group.description));

    // Color cards go into the auto-fill grid; non-color params (number / select
    // / text) are rendered full-width after the grid (per Q1: start with B).
    const colorCards = [];
    const otherCards = [];
    for (const entry of entries) {
      if (entry.meta.type === "color") colorCards.push(entry);
      else otherCards.push(entry);
    }

    if (colorCards.length) {
      const grid = createElement("div", "wkt-field-grid");
      grid.style.setProperty("--wkt-field-min", FIELD_GRID_MIN);
      for (const entry of colorCards) grid.append(this.renderField(entry));
      details.append(grid);
    }
    for (const entry of otherCards) {
      const row = createElement("div", "wkt-field-full");
      row.append(this.renderField(entry));
      details.append(row);
    }

    return details;
  }

  renderField({ section, key, value, meta }) {
    const field = createElement("div", "wkt-field");
    field.dataset.path = pathKey(section, key);
    // The JSON key and long explanatory copy remain available without forcing
    // every card to spend two extra visual rows in the narrow sidebar.
    const fieldHelp = [key, meta.description].filter(Boolean).join("\n");
    field.title = fieldHelp;
    field.setAttribute("aria-label", meta.label);
    if (fieldHelp) field.setAttribute("aria-description", fieldHelp);

    const header = createElement("div", "wkt-field-header");
    const labelWrap = createElement("div", "wkt-field-label-wrap");
    labelWrap.append(
      createElement("div", "wkt-field-label", meta.label),
      createElement("code", "wkt-field-key", key),
    );
    const reset = this.createSharedButton(this.label("actionResetField"), () => this.restoreField(section, key), "wkt-button-small");
    header.append(labelWrap, reset);
    field.append(header);

    if (meta.type === "color") field.append(this.renderColorControl(section, key, value));
    else if (meta.type === "number") field.append(this.renderNumberControl(section, key, value, meta));
    else if (meta.type === "select") field.append(this.renderSelectControl(section, key, value, meta));
    else field.append(this.renderTextControl(section, key, value));

    return field;
  }

  // Standard color card: title + color swatch + hex input + alpha slider.
  renderColorControl(section, key, value) {
    const wrapper = createElement("div", "wkt-color-control");
    const parsed = parseCssColor(value) ?? { r: 0, g: 0, b: 0, a: 1 };

    const picker = createElement("input", "wkt-color-picker");
    picker.type = "color";
    picker.value = rgbToHex(parsed);
    picker.title = this.label("colorPickerTitle");

    const textInput = createElement("input", "wkt-input wkt-color-text");
    textInput.type = "text";
    textInput.value = String(value ?? "");
    textInput.spellcheck = false;

    const alphaWrap = createElement("label", "wkt-alpha");
    const alphaText = createElement("span", "wkt-alpha-value", `${Math.round(parsed.a * 100)}%`);
    const alpha = createElement("input", "workspacekit-ui-range");
    alpha.type = "range";
    alpha.min = "0";
    alpha.max = "1";
    alpha.step = "0.01";
    alpha.value = String(parsed.a);
    alpha.setAttribute("aria-label", t(resolveLocale({ app: this.app }), "alphaTitle"));
    alpha.title = alpha.getAttribute("aria-label");
    alphaWrap.append(alpha, alphaText);

    const activate = () => {
      this.activeColorTarget = { section, key };
      this.updateActiveTargetLabel();
      this.root?.querySelectorAll(".wkt-field.is-active-target").forEach((item) => item.classList.remove("is-active-target"));
      this.hosts?.contentHost?.querySelectorAll(".wkt-field.is-active-target").forEach((item) => item.classList.remove("is-active-target"));
      wrapper.closest(".wkt-field")?.classList.add("is-active-target");
    };

    picker.addEventListener("focus", activate);
    picker.addEventListener("click", activate);
    textInput.addEventListener("focus", activate);
    alpha.addEventListener("focus", activate);

    picker.addEventListener("input", () => {
      const next = withAlpha(picker.value, Number(alpha.value));
      textInput.value = next;
      this.updateField(section, key, next, { commit: false });
    });
    picker.addEventListener("change", () => this.commitCurrentState());

    alpha.addEventListener("input", () => {
      alphaText.textContent = `${Math.round(Number(alpha.value) * 100)}%`;
      const next = withAlpha(textInput.value || picker.value, Number(alpha.value));
      textInput.value = next;
      this.updateField(section, key, next, { commit: false });
    });
    alpha.addEventListener("change", () => this.commitCurrentState());

    textInput.addEventListener("input", () => {
      const color = parseCssColor(textInput.value);
      if (color) {
        picker.value = rgbToHex(color);
        alpha.value = String(color.a);
        alphaText.textContent = `${Math.round(color.a * 100)}%`;
        textInput.classList.remove("is-invalid");
        this.updateField(section, key, textInput.value, { commit: false });
      } else if (textInput.value.trim()) {
        textInput.classList.add("is-invalid");
      }
    });
    textInput.addEventListener("change", () => {
      if (parseCssColor(textInput.value)) this.commitCurrentState();
    });

    wrapper.append(picker, textInput, alphaWrap);
    return wrapper;
  }

  renderNumberControl(section, key, value, meta) {
    const wrapper = createElement("div", "wkt-number-control");
    const range = createElement("input", "workspacekit-ui-range");
    range.type = "range";
    range.min = String(meta.min);
    range.max = String(meta.max);
    range.step = String(meta.step);
    range.value = String(Number(value));

    const input = createElement("input", "wkt-input wkt-number-input");
    input.type = "number";
    input.min = String(meta.min);
    input.max = String(meta.max);
    input.step = String(meta.step);
    input.value = String(value);

    const apply = (raw) => {
      const next = Number(raw);
      if (!Number.isFinite(next)) return;
      range.value = String(next);
      input.value = String(next);
      this.updateField(section, key, next, { commit: false });
    };
    range.addEventListener("input", () => apply(range.value));
    input.addEventListener("input", () => apply(input.value));
    range.addEventListener("change", () => this.commitCurrentState());
    input.addEventListener("change", () => this.commitCurrentState());
    wrapper.append(range, input);
    return wrapper;
  }

  renderSelectControl(section, key, value, meta) {
    const select = createElement("select", "wkt-input");
    for (const optionInfo of meta.options) {
      const option = createElement("option", "", optionInfo.label);
      option.value = String(optionInfo.value);
      option.selected = String(optionInfo.value) === String(value);
      select.append(option);
    }
    select.addEventListener("change", () => {
      const raw = select.value;
      const next = typeof value === "number" ? Number(raw) : raw;
      this.updateField(section, key, next, { commit: true });
    });
    return select;
  }

  renderTextControl(section, key, value) {
    const input = createElement("textarea", "wkt-input wkt-textarea");
    input.rows = String(key === "BACKGROUND_IMAGE" ? 3 : 2);
    input.value = String(value ?? "");
    input.addEventListener("input", () => this.updateField(section, key, input.value, { commit: false }));
    input.addEventListener("change", () => this.commitCurrentState());
    return input;
  }

  // -----------------------------------------------------------------------
  // Reference picker (image-based color sampling) — lives inside the standard
  // Content slot. Keeping it there preserves the shared four-slot contract.
  // -----------------------------------------------------------------------

  renderReference() {
    const wrap = createElement("details", "wkt-reference workspacekit-ui-section");
    // An unloaded reference is an explicit drop surface, not an invisible
    // optional tool. Once a user closes an empty section it may stay closed
    // until the next panel rebuild; a loaded image always stays visible.
    wrap.open = this.referenceOpen || Boolean(this.referenceImage) || !this.referenceFileName;
    wrap.addEventListener("toggle", () => { this.referenceOpen = wrap.open; });

    const header = createElement("summary", "wkt-reference-summary workspacekit-ui-section-head");
    const locale = resolveLocale({ app: this.app });
    const labels = labelsFor(locale);
    header.append(
      createElement("span", "wkt-section-title workspacekit-ui-section-title", labels.referenceTitle),
      createElement("span", "wkt-section-count", this.referenceFileName || "JPG / PNG"),
    );
    wrap.append(header);

    const body = createElement("div", "wkt-reference-body");

    const imageInput = createElement("input", "wkt-visually-hidden");
    imageInput.type = "file";
    imageInput.accept = "image/jpeg,image/png,image/webp";
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];
      imageInput.value = "";
      if (file) this.loadReferenceImage(file);
    });

    const controls = createElement("div", "wkt-reference-controls");
    if (!this.referenceImage) {
      const onBrowse = () => imageInput.click();
      const onDrop = (event) => {
        const file = event.dataTransfer?.files?.[0];
        if (file) this.loadReferenceImage(file);
      };
      const surface = this.ui?.supports?.(1) && typeof this.ui.createDropzoneSurface === "function"
        ? this.ui.createDropzoneSurface({
          label: labels.referenceDropTitle,
          description: labels.referenceDropDescription,
          onBrowse,
          onDrop,
        }).element
        : this.renderReferenceDropzone(labels, onBrowse, onDrop);
      body.append(imageInput, surface);
    } else {
      const imageLabel = createElement("label", "wkt-button", "📥");
      imageLabel.title = labels.actionImportReference;
      imageLabel.setAttribute("aria-label", labels.actionImportReference);
      imageLabel.append(imageInput);
      const clear = this.createSharedIconButton("close", labels.actionClearReference, () => this.clearReferenceImage());
      controls.append(imageLabel, clear);
    }

    const eyeDropperButton = this.button("📸", async () => {
      if (!("EyeDropper" in globalThis)) {
        return this.notify("warn", labels.notifyUnsupportedPickerSummary, labels.notifyUnsupportedPickerDetail);
      }
      if (!this.activeColorTarget) {
        return this.notify("warn", labels.notifySelectColorSummary, labels.notifySelectColorForScreen);
      }
      try {
        const result = await new globalThis.EyeDropper().open();
        this.applySampledColor(result.sRGBHex);
      } catch (error) {
        if (error?.name !== "AbortError") this.notify("error", labels.notifyEyedropperFailed, String(error));
      }
    });
    eyeDropperButton.title = labels.actionScreenPicker;
    eyeDropperButton.setAttribute("aria-label", eyeDropperButton.title);
    if (this.referenceImage) {
      controls.insertBefore(eyeDropperButton, controls.children[1] || null);
    } else {
      controls.append(eyeDropperButton);
    }
    body.append(controls);

    const sizeLabel = createElement("label", "wkt-sample-size");
    sizeLabel.append(createElement("span", "", labels.sampleLabel));
    const sizeSelect = createElement("select", "wkt-input");
    for (const size of [1, 3, 5]) {
      const option = createElement("option", "", `${size}×${size}`);
      option.value = String(size);
      option.selected = size === this.sampleSize;
      sizeSelect.append(option);
    }
    sizeSelect.addEventListener("change", () => { this.sampleSize = Number(sizeSelect.value); });
    sizeLabel.append(sizeSelect);

    const target = createElement("div", "wkt-active-target", labels.currentTargetNone);
    target.dataset.role = "active-target";
    this.refs.activeTarget = target;
    const sampling = createElement("div", "wkt-reference-sampling");
    sampling.hidden = !this.referenceImage;
    sampling.append(sizeLabel, target);
    body.append(sampling);

    const visuals = createElement("div", "wkt-reference-visuals");
    visuals.hidden = !this.referenceImage;
    const canvasWrap = createElement("div", "wkt-reference-canvas-wrap");
    this.refs.referenceCanvasWrap = canvasWrap;
    const canvas = createElement("canvas", "wkt-reference-canvas");
    canvas.hidden = !this.referenceImage;
    canvas.addEventListener("click", (event) => {
      if (!this.activeColorTarget) {
        return this.notify("warn", labels.notifySelectColorSummary, labels.notifySelectColorForReference);
      }
      try {
        const sampled = sampleCanvasColor(canvas, event.clientX, event.clientY, this.sampleSize, locale);
        if (sampled) this.applySampledColor(formatCssColor({ ...sampled, a: 1 }));
      } catch (error) {
        this.notify("error", labels.notifyImageSampleFailed, error instanceof Error ? error.message : String(error));
      }
    });
    this.imageCanvas = canvas;
    canvasWrap.append(canvas);

    const palette = createElement("div", "wkt-palette-slot");
    palette.dataset.role = "reference-palette";
    this.refs.referencePalette = palette;
    this.renderReferencePalette(palette, labels);
    visuals.append(canvasWrap, palette);
    body.append(visuals);

    wrap.append(body);
    if (this.referenceImage?.naturalWidth) this.drawReferenceImage(this.referenceImage);

    return wrap;
  }

  renderReferenceDropzone(labels, onBrowse, onDrop) {
    const surface = createElement("button", "wkt-reference-dropzone");
    surface.type = "button";
    surface.setAttribute("aria-label", labels.referenceDropTitle);
    surface.append(
      createElement("strong", "", labels.referenceDropTitle),
      createElement("span", "", labels.referenceDropDescription),
    );
    surface.addEventListener("click", onBrowse);
    surface.addEventListener("dragover", (event) => event.preventDefault());
    surface.addEventListener("drop", (event) => {
      event.preventDefault();
      onDrop(event);
    });
    return surface;
  }

  renderReferencePalette(slot, labels) {
    if (!slot) return;
    slot.replaceChildren();
    for (const color of this.referencePalette) {
      const swatch = createElement("button", "wkt-palette-swatch");
      swatch.type = "button";
      swatch.style.setProperty("--swatch", color);
      swatch.title = labels.actionApplyPaletteColor.replace("{color}", color);
      swatch.setAttribute("aria-label", swatch.title);
      swatch.addEventListener("click", () => {
        if (!this.activeColorTarget) {
          this.notify("warn", labels.notifySelectColorSummary, labels.notifySelectColorForReference);
          return;
        }
        this.applySampledColor(color);
      });
      slot.append(swatch);
    }
  }

  // -----------------------------------------------------------------------
  // Status (re-usable across header / standalone)
  // -----------------------------------------------------------------------

  renderStatus() {
    const wrapper = createElement("div", "wkt-status");
    const indicator = createElement("span", "wkt-status-dot");
    indicator.dataset.role = "status-dot";
    const text = createElement("span", "wkt-status-text", this.label("statusInitial"));
    text.dataset.role = "status-text";
    wrapper.append(indicator, text);
    this.refs.statusText = text;
    this.refs.statusDot = indicator;
    return wrapper;
  }

  // -----------------------------------------------------------------------
  // Legacy standalone mount() shell
  // -----------------------------------------------------------------------

  renderFooter() {
    const labels = labelsFor(resolveLocale({ app: this.app }));
    const footer = createElement("div", "wkt-footer");
    footer.append(
      this.button(labels.actionUndo, () => this.undo()),
      this.button(labels.actionRedo, () => this.redo()),
      this.button(labels.actionReset, () => this.revertAll()),
      this.button(labels.actionRestore, () => this.restoreRuntimeSnapshot()),
      this.button(labels.apply, () => {
        if (this.theme) this.adapter.applyTheme(this.theme);
      }, "wkt-button-primary"),
    );
    return footer;
  }

  // -----------------------------------------------------------------------
  // Shared helpers
  // -----------------------------------------------------------------------

  button(label, handler, extraClass = "") {
    const button = createElement("button", `wkt-button ${extraClass}`.trim(), label);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  // Both the compact top controls and the unloaded-state primary actions use
  // these methods. Keeping one import/capture path prevents the initial
  // screen from drifting away from the established loadTheme() lifecycle.
  requestThemeImport() {
    this.refs.importInput?.click?.();
  }

  captureCurrentTheme() {
    try {
      this.loadTheme(
        validateThemeDocument(this.adapter.captureRuntimeTheme(), resolveLocale({ app: this.app })),
        this.label("statusRuntimeCaptured"),
        { sourceType: "runtime" },
      );
    } catch (error) {
      this.notify("error", this.label("notifyCaptureFailed"), error instanceof Error ? error.message : String(error));
    }
  }

  loadTheme(theme, statusText, { sourceType = "external", sourceFile = null } = {}) {
    this.runtimeSnapshot ??= this.adapter.captureSnapshot();
    this.theme = cloneTheme(theme);
    this.baselineTheme = cloneTheme(theme);
    this.sourceType = sourceType;
    this.sourceFile = sourceFile;
    const defaultStem = normalizeThemeFileStem(
      sourceFile ? String(sourceFile).split(/[\\/]/).pop() : this.theme.id,
      "wk-theme",
    );
    this.metadata = {
      fileName: defaultStem,
      name: String(this.theme.name || defaultStem),
      id: defaultStem,
    };
    this.baselineMetadata = { ...this.metadata };
    this.dirty = false;
    this.history = [cloneTheme(theme)];
    this.historyIndex = 0;
    this.activeColorTarget = null;
    if (this.livePreview) this.adapter.applyTheme(this.theme);
    this.refreshToolbar();
    this.rebuildContent();
    this.updateActiveTargetLabel();
    this.setStatus(statusText, "success");
  }

  updateField(section, key, value, { commit = false } = {}) {
    if (!this.theme) return;
    setThemeValue(this.theme, section, key, value);
    if (this.livePreview) this.adapter.applyField(section, key, value);
    if (commit) this.commitCurrentState();
    this.setStatus(this.label("statusPreview", { key, value: String(value) }), "info");
  }

  commitCurrentState() {
    if (!this.theme) return;
    const snapshot = cloneTheme(this.theme);
    const previous = this.history[this.historyIndex];
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) {
      this.refreshDirtyState();
      return;
    }
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.refreshDirtyState();
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex -= 1;
    this.theme = cloneTheme(this.history[this.historyIndex]);
    this.refreshDirtyState();
    if (this.livePreview) this.adapter.applyTheme(this.theme);
    this.rebuildContent();
    this.setStatus(this.label("statusUndo"), "info");
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex += 1;
    this.theme = cloneTheme(this.history[this.historyIndex]);
    this.refreshDirtyState();
    if (this.livePreview) this.adapter.applyTheme(this.theme);
    this.rebuildContent();
    this.setStatus(this.label("statusRedo"), "info");
  }

  restoreField(section, key) {
    if (!this.theme || !this.baselineTheme) return;
    const baselineValue = getThemeValue(this.baselineTheme, section, key);
    if (baselineValue === undefined) return;
    this.updateField(section, key, baselineValue, { commit: true });
    this.rebuildContent();
  }

  revertAll() {
    if (!this.theme || !this.baselineTheme) return;
    this.theme = cloneTheme(this.baselineTheme);
    this.metadata = { ...(this.baselineMetadata ?? this.metadata) };
    this.history = [cloneTheme(this.theme)];
    this.historyIndex = 0;
    this.refreshDirtyState();
    if (this.livePreview) this.adapter.applyTheme(this.theme);
    this.refreshToolbar();
    this.rebuildContent();
    this.setStatus(this.label("statusResetLoaded"), "info");
  }

  restoreRuntimeSnapshot() {
    if (!this.runtimeSnapshot) return;
    this.adapter.applyTheme(this.runtimeSnapshot);
    this.setStatus(this.label("statusRestoredBeforeOpen"), "info");
  }

  buildSaveTheme(metadata = this.metadata) {
    if (!this.theme) return null;
    return {
      ...cloneTheme(this.theme),
      id: normalizeThemeFileStem(metadata.fileName, "wk-theme"),
      name: String(metadata.name || metadata.fileName),
    };
  }

  isOverwriteTarget(metadata = this.metadata) {
    const fileName = normalizeThemeFileStem(metadata.fileName, "wk-theme");
    return this.sourceType === "wk"
      && fileName === this.baselineMetadata?.fileName
      && this.sourceFile === `themes/wk/${fileName}.json`;
  }

  suggestCopyMetadata() {
    const existingFiles = new Set(this.bundledThemes
      .filter((item) => item.sourceType === "wk")
      .map((item) => String(item.file || "").replace(/^.*\//, "").replace(/\.json$/i, "")));
    const existingIds = new Set(this.bundledThemes
      .filter((item) => item.sourceType === "wk")
      .map((item) => item.id));
    const fileBase = normalizeThemeFileStem(this.metadata.fileName, "wk-theme");
    const idBase = fileBase;
    let index = 1;
    while (index <= 999) {
      const suffix = index === 1 ? "-copy" : `-copy-${index}`;
      const fileName = normalizeThemeFileStem(`${fileBase}${suffix}`);
      const id = normalizeThemeFileStem(`${idBase}${suffix}`);
      if (!existingFiles.has(fileName) && !existingIds.has(id)) {
        return { fileName, id, name: this.metadata.name };
      }
      index += 1;
    }
    return null;
  }

  async saveTheme({ saveCopy = false } = {}) {
    if (!this.theme) {
      this.notify("warn", this.label("notifyNoThemeSummary"), this.label("notifyNoThemeDetail"));
      return false;
    }
    const locale = resolveLocale({ app: this.app });
    const labels = labelsFor(locale);
    const metadata = saveCopy ? this.suggestCopyMetadata() : { ...this.metadata };
    if (!metadata) {
      this.notify("error", this.label("notifyCopySaveFailed"), this.label("notifyCopySaveFailedDetail"));
      return false;
    }
    if (!saveCopy && this.isOverwriteTarget(metadata)) {
      const confirmed = await this.showConfirm({
        title: labels.confirmOverwriteTitle,
        message: labels.confirmOverwriteMessage,
        confirmText: labels.actionSave,
      });
      if (!confirmed) return false;
    }

    const theme = this.buildSaveTheme(metadata);
    try {
      const response = await fetch("/workspacekit-theme/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: metadata.fileName, theme, overwrite: !saveCopy && this.isOverwriteTarget(metadata) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || `HTTP ${response.status}`);
      this.theme = cloneTheme(theme);
      this.baselineTheme = cloneTheme(theme);
      this.metadata = { ...metadata, id: normalizeThemeFileStem(metadata.fileName, "wk-theme") };
      this.baselineMetadata = { ...this.metadata };
      this.sourceType = "wk";
      this.sourceFile = result.file;
      this.history = [cloneTheme(theme)];
      this.historyIndex = 0;
      this.refreshDirtyState();
      await this.refreshBundledThemes({ silent: true });
      this.refreshToolbar();
      this.rebuildContent();
      const detail = saveCopy
        ? this.label("statusCopySaved", { name: `${metadata.fileName}.json` })
        : this.label("statusSaved", { name: `${metadata.fileName}.json` });
      this.notify("success", this.label("notifyThemeSaved"), detail);
      return true;
    } catch (error) {
      this.notify("error", this.label("notifyThemeSaveFailed"), error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async requestExit() {
    if (this.dirty) {
      const labels = labelsFor(resolveLocale({ app: this.app }));
      const confirmed = await this.showConfirm({
        title: labels.confirmExitTitle,
        message: labels.confirmExitMessage,
        confirmText: labels.actionExit,
        danger: true,
      });
      if (!confirmed) return false;
    }
    this.finishEditing({ restoreRuntime: true });
    return true;
  }

  async requestSaveAndExit() {
    if (!this.theme) return this.requestExit();
    const labels = labelsFor(resolveLocale({ app: this.app }));
    const confirmed = await this.showConfirm({
      title: labels.confirmSaveExitTitle,
      message: labels.confirmSaveExitMessage,
      confirmText: labels.actionSaveExit,
    });
    if (!confirmed) return false;
    if (!await this.saveTheme()) return false;
    this.finishEditing({ restoreRuntime: false });
    return true;
  }

  finishEditing({ restoreRuntime }) {
    if (restoreRuntime) this.restoreRuntimeSnapshot();
    this.theme = null;
    this.baselineTheme = null;
    this.sourceType = "none";
    this.sourceFile = null;
    this.metadata = { fileName: "", name: "", id: "" };
    this.baselineMetadata = null;
    this.history = [];
    this.historyIndex = -1;
    this.activeColorTarget = null;
    this.dirty = false;
    this.refreshToolbar();
    this.rebuildContent();
    this.setStatus(this.label(restoreRuntime ? "statusExitRestored" : "statusSavedAndExit"), "success");
  }

  showConfirm({ title, message, confirmText, danger = false }) {
    const ownerDocument = this.hosts?.document ?? this.root?.ownerDocument ?? globalThis.document;
    if (!ownerDocument?.body) return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
    return new Promise((resolve) => {
      const backdrop = createElement("div", "wkt-theme-dialog-backdrop");
      const dialog = createElement("div", "wkt-theme-dialog workspacekit-ui-root");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      const titleElement = createElement("h2", "wkt-theme-dialog-title", title);
      const messageElement = createElement("p", "wkt-theme-dialog-message", message);
      const actions = createElement("div", "wkt-theme-dialog-actions");
      const cancel = createElement("button", "wkt-button", labelsFor(resolveLocale({ app: this.app })).actionCancel);
      cancel.type = "button";
      const confirm = createElement("button", `wkt-button wkt-button-primary${danger ? " wkt-button-danger" : ""}`, confirmText);
      confirm.type = "button";
      actions.append(cancel, confirm);
      dialog.append(titleElement, messageElement, actions);
      backdrop.append(dialog);
      let settled = false;
      const close = (result) => {
        if (settled) return;
        settled = true;
        ownerDocument.removeEventListener("keydown", onKeyDown, true);
        backdrop.remove();
        resolve(result);
      };
      const onKeyDown = (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        close(false);
      };
      backdrop.addEventListener("pointerdown", (event) => { if (event.target === backdrop) close(false); });
      cancel.addEventListener("click", () => close(false));
      confirm.addEventListener("click", () => close(true));
      ownerDocument.addEventListener("keydown", onKeyDown, true);
      ownerDocument.body.append(backdrop);
      setTimeout(() => cancel.focus(), 0);
    });
  }

  refreshDirtyState() {
    if (!this.theme || !this.baselineTheme || !this.baselineMetadata) {
      this.dirty = false;
      return this.dirty;
    }
    // ID is machine-owned metadata. Normalize here as a final guard for
    // callers/tests that still construct a metadata object directly.
    this.metadata.fileName = normalizeThemeFileStem(this.metadata.fileName, "wk-theme");
    this.metadata.id = this.metadata.fileName;
    this.dirty = JSON.stringify(this.theme) !== JSON.stringify(this.baselineTheme)
      || JSON.stringify(this.metadata) !== JSON.stringify(this.baselineMetadata);
    return this.dirty;
  }

  async loadReferenceImage(file) {
    if (this.imageObjectUrl) URL.revokeObjectURL(this.imageObjectUrl);
    this.imageObjectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      this.referenceImage = image;
      this.referenceFileName = file.name;
      try {
        this.referencePalette = extractReferencePalette(image);
      } catch (error) {
        // A reference picture is still useful for manual sampling if automatic
        // quantization fails, so leave the image loaded and omit only swatches.
        this.referencePalette = [];
        console.warn("[WorkspaceKit Theme] palette extraction failed:", error);
      }
      this.referenceOpen = true;
      this.rebuildContent();
      this.setStatus(this.label("statusReferenceLoaded", { name: file.name }), "success");
    };
    image.onerror = () => this.notify("error", this.label("notifyReferenceLoadFailed"), file.name);
    image.src = this.imageObjectUrl;
  }

  clearReferenceImage() {
    if (this.imageObjectUrl) URL.revokeObjectURL(this.imageObjectUrl);
    this.imageObjectUrl = null;
    this.referenceImage = null;
    this.referenceFileName = "";
    this.referencePalette = [];
    this.imageCanvas = null;
    this.referenceOpen = true;
    this.rebuildContent();
  }

  drawReferenceImage(image) {
    const canvas = this.imageCanvas;
    if (!canvas || !image?.naturalWidth || !image?.naturalHeight) return;
    const maxWidth = 900;
    const maxHeight = 900;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.hidden = false;
    if (this.refs.referenceCanvasWrap) this.refs.referenceCanvasWrap.hidden = false;
  }

  applySampledColor(value) {
    if (!this.activeColorTarget || !this.theme) return;
    const { section, key } = this.activeColorTarget;
    this.updateField(section, key, value, { commit: true });
    this.rebuildContent();
    requestAnimationFrame(() => {
      const escaped = globalThis.CSS?.escape ? CSS.escape(pathKey(section, key)) : pathKey(section, key).replace(/["\\]/g, "\\$&");
      const root = this.hosts?.contentHost ?? this.root;
      const field = root?.querySelector?.(`[data-path="${escaped}"]`);
      field?.classList.add("is-active-target");
    });
  }

  updateActiveTargetLabel() {
    const label = this.refs.activeTarget ?? this.hosts?.contentHost?.querySelector?.('[data-role="active-target"]');
    if (!label) return;
    if (!this.activeColorTarget) {
      label.textContent = this.label("currentTargetNone");
      return;
    }
    const { section, key } = this.activeColorTarget;
    const value = getThemeValue(this.theme, section, key);
    const meta = inferFieldMeta(section, key, value);
    label.textContent = this.label("currentTargetValue", { label: meta.label, key });
  }

  setStatus(message, level = "info") {
    if (this.refs.statusText) this.refs.statusText.textContent = message;
    if (this.refs.statusDot) this.refs.statusDot.dataset.level = level;
  }

  notify(severity, summary, detail) {
    const toast = this.app?.extensionManager?.toast;
    if (toast?.add) {
      toast.add({ severity, summary, detail, life: 4500 });
    } else {
      console[severity === "error" ? "error" : "warn"](`[WorkspaceKit Theme] ${summary}: ${detail}`);
    }
    this.setStatus(`${summary}：${detail}`, severity);
  }
}
