import { app } from "../../scripts/app.js";
import { registerWorkspaceKitProvider } from "./integrations/workspacekit-adapter.js";
import { createThemeProvider } from "./lib/provider.js";
import { registerStandalonePanel, unregisterStandalonePanel } from "./lib/standalone-panel.js";

const EXTENSION_NAME = "WorkspaceKit.ThemeLab";

function loadStyles() {
  if (document.querySelector('link[data-workspacekit-theme-lab="styles"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./theme_lab.css", import.meta.url).href;
  link.dataset.workspacekitThemeLab = "styles";
  document.head.append(link);
}

app.registerExtension({
  name: EXTENSION_NAME,

  async setup() {
    loadStyles();

    // Standalone fallback first: the plugin stays usable even if WorkspaceKit
    // never loads. It is removed only after a host confirms it can render the
    // provider (via onHostClaimed), preventing a duplicate sidebar entry.
    registerStandalonePanel({ app });

    const provider = createThemeProvider({
      app,
      onHostClaimed: () => unregisterStandalonePanel(app),
    });

    const registration = registerWorkspaceKitProvider(provider);
    if (!registration.ok) {
      console.warn("[WorkspaceKit Theme] provider registration was not accepted:", registration.code);
    }
  },
});
