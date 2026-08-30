# ComfyUI-WorkspaceKit-Theme

> ⚠️ **Archived repository.** Independent development has moved to [ComfyUI-WorkspaceKit](https://github.com/ZiYao00/ComfyUI-WorkspaceKit). This repository is retained as a read-only historical snapshot; use the main WorkspaceKit repository for future updates.

WorkspaceKit Theme Lab is a live theme editor for the WorkspaceKit family of ComfyUI extensions.

It runs inside the real ComfyUI frontend and updates the active runtime rather than drawing a separate mock canvas. At archival, the 0.1.0 alpha supported theme JSON import/export, field-level live preview, undo/redo, reference-image sampling, an eight-color suggested palette, and browser EyeDropper integration when available.

## Status

This is an alpha framework. It supports both WorkspaceKit-hosted and standalone UI paths. Runtime preview is implemented through an isolated compatibility adapter. Persistent registration in ComfyUI's custom palette store is intentionally deferred until a stable public API is confirmed.

## Install

Place the extracted folder at:

```text
ComfyUI/custom_nodes/ComfyUI-WorkspaceKit-Theme
```

Restart ComfyUI and refresh the browser. No additional Python packages are required at runtime.

For the document map, current redesign plan, tests, architecture, roadmap, and compatibility details, see `docs/README.md` and the Chinese documentation under `docs/`.

## License

MIT. ComfyUI and ComfyUI Frontend are separate projects with their own licenses; their source code is not bundled here. The locally vendored Color Thief 3.3.0 palette algorithm is MIT; see `docs/THIRD_PARTY_NOTICES.md`.
