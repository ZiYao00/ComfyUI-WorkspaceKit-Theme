// Theme Lab provider factory for WorkspaceKit hosting.
//
// The host supplies four Blueprint slots (header / toolbar / controls / content)
// and a shared Panel UI Template `ui`. The panel populates each slot from the
// plugin's own UI structure; `ui` is used to render the shared header so the
// panel visually matches other WorkspaceKit family tabs.

import { ThemeRuntimeAdapter } from "./theme_runtime_adapter.js";
import { ThemeLabPanel } from "./theme_lab_panel.js";
import { labelsFor, resolveLocale } from "./i18n.js";

// Plugin identity. `id` is a stable unique key (users never see it). The host
// shows `icon` + `tabLabel`. The label/tooltip text follows the user's
// ComfyUI locale (see [[comfyui-locale-api]]).
export const PROVIDER_ID = "workspacekit.theme";
export const PROVIDER_TITLE = "WK Theme";
export const PROVIDER_ICON = "";
export const PROVIDER_ICON_KEY = "theme";
export const PROVIDER_API_VERSION = 1;

export function createThemeProvider({ app, onHostClaimed }) {
  const labels = labelsFor(resolveLocale({ app }));
  return Object.freeze({
    apiVersion: PROVIDER_API_VERSION,
    id: PROVIDER_ID,
    title: labels.providerTitle,
    icon: PROVIDER_ICON,
    iconKey: PROVIDER_ICON_KEY,
    getTitle: () => labels.providerTitle,
    tabLabel: labels.tabLabel,
    tabTooltip: labels.tabTooltip,
    onHostClaimed,
    render({ document = globalThis.document, headerHost, toolbarHost, controlsHost, contextHost, contentHost, surface, ui }) {
      const adapter = new ThemeRuntimeAdapter(app);
      const panel = new ThemeLabPanel(app, adapter);
      // Pass the Blueprint slot bag + shared UI to the panel. contextHost is a
      // compatibility alias for toolbarHost on older hosts; the panel uses
      // controlsHost.
      panel.mountBlueprint(
        { document, headerHost, toolbarHost, controlsHost, contextHost, contentHost, surface, ui },
        ui,
      );
      return () => {
        try { panel.restoreRuntimeBeforeClose?.(); } catch { /* best effort */ }
        panel.unmount();
      };
    },
  });
}
