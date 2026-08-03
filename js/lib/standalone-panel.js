// Standalone fallback: a normal ComfyUI sidebar tab used when WorkspaceKit is
// not present (or cannot host the provider). The same panel renders through
// the bundled WorkspaceKit UI Template's four-slot Blueprint, so merged and
// standalone modes share the same visual anatomy.
//
// When a WorkspaceKit host later claims the provider, main removes this tab via
// unregisterStandalonePanel() from the provider's onHostClaimed callback.

import { createPanelUiTemplate as createVendorPanelUiTemplate } from "../vendor/workspacekit-ui/template.js";
import { ThemeRuntimeAdapter } from "./theme_runtime_adapter.js";
import { ThemeLabPanel } from "./theme_lab_panel.js";
import { labelsFor, resolveLocale } from "./i18n.js";
import { THEME_ICONS } from "./theme_icons.js";

const PANEL_ID = "workspacekit-theme-lab";

// Reuse a single Template instance per document. The Vendor runtime is
// side-effect-free on its first use aside from installing the shared stylesheet
// (idempotent), so this is safe to call from any standalone render call.
let cachedUi = null;
function resolveStandaloneUi(document) {
  if (cachedUi?.document === document) return cachedUi.ui;
  const ui = createVendorPanelUiTemplate({ document });
  cachedUi = { document, ui };
  return ui;
}

const mountedPanels = new WeakMap();

export function registerStandalonePanel({ app }) {
  if (typeof app?.extensionManager?.registerSidebarTab !== "function") return false;
  const labels = labelsFor(resolveLocale({ app }));
  app.extensionManager.registerSidebarTab({
    id: PANEL_ID,
    icon: "pi pi-palette",
    title: labels.standaloneTitle,
    tooltip: labels.standaloneTooltip,
    type: "custom",
    render: (host) => {
      host.replaceChildren();
      const document = host.ownerDocument || globalThis.document;
      const ui = resolveStandaloneUi(document);

      // Use the standard four Blueprint slots. Do not insert extra siblings:
      // WorkspaceKit hosts and standalone Vendor fallback must keep identical
      // Header / Toolbar / Controls / Content structure.
      const blueprint = typeof ui.createPanelBlueprint === "function"
        ? ui.createPanelBlueprint()
        : null;

      const shell = document.createElement("div");
      shell.className = "wkt-theme-lab-host";
      host.append(shell);

      if (blueprint) {
        // Standalone and merged modes deliberately use the same Blueprint.
        // Only standalone owns the outer WK tab/settings shell; putting the
        // Blueprint in its `content` area avoids a second Theme-specific UI.
        const standaloneShell = typeof ui.createStandaloneShell === "function"
          ? ui.createStandaloneShell({
            title: `🎨 ${labels.headerTitle}`,
            settingsLabel: labels.actionSettings,
            settingsContent: (() => {
              const icon = document.createElement("span");
              icon.innerHTML = THEME_ICONS.settings;
              return icon;
            })(),
            onSettings: () => {
              try { app?.ui?.settings?.showDialog?.(); } catch { /* noop */ }
            },
          })
          : null;
        if (standaloneShell) {
          standaloneShell.content.append(blueprint.element);
          shell.append(standaloneShell.shell);
        } else {
          shell.append(blueprint.element);
        }
        const adapter = new ThemeRuntimeAdapter(app);
        const panel = new ThemeLabPanel(app, adapter);
        mountedPanels.set(host, panel);
        panel.mountBlueprint({ ...blueprint, ui, document }, ui);
        return () => panel.unmount();
      }

      // Safety net: a too-old Vendor copy without the Blueprint. Fall
      // back to the legacy single-root mount rather than throwing.
      const adapter = new ThemeRuntimeAdapter(app);
      const panel = new ThemeLabPanel(app, adapter);
      mountedPanels.set(host, panel);
      panel.mount(shell);
      return () => panel.unmount();
    },
  });
  return true;
}

export function unregisterStandalonePanel(app) {
  if (typeof app?.extensionManager?.unregisterSidebarTab !== "function") return false;
  app.extensionManager.unregisterSidebarTab(PANEL_ID);
  return true;
}
