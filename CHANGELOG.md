# Changelog

All notable changes will be documented in this file.

## Unreleased

### Changed

- Added bundled WK Catppuccin Macchiato and Mocha themes, with their preview assets registered in the theme manifest.
- Added a local, MIT-licensed Color Thief 3.3.0 browser build for reference-image suggested palettes; no CDN or runtime npm dependency is used.
- Reference images now have a clickable/dropable empty state, a compact thumbnail, re-import/remove controls, and eight suggested colors that apply only to the active color field.
- Reorganized Theme documentation around a current redesign plan, test checklist, publishing readiness, and third-party notices.

- Normalize Theme Lab standalone and WorkspaceKit-hosted rendering to the
  shared four-slot Panel Blueprint.
- Keep the reference-color picker inside Content instead of injecting a
  Theme-specific host slot.
- Prefer shared UI Template controls for the Theme header status, action row,
  and high-frequency icon buttons, with a standalone fallback for older Vendor
  copies.
- Apply shared section and button anatomy to Theme content groups, reference
  color sampling, and per-field restore actions without changing edit behavior.
- Align field cards, inputs, and range controls with the shared WorkspaceKit
  control height, border, shadow, focus, and theme-token rules.

## [0.1.0] - 2026-07-23

### Added

- Initial WorkspaceKit Theme Lab framework.
- ComfyUI sidebar registration.
- Theme JSON import and export.
- Runtime preview adapter for `node_slot`, `litegraph_base`, and `comfy_base`.
- Undo, redo, reset, search, and live-preview controls.
- Reference image canvas with 1×1, 3×3, and 5×5 average color sampling.
- EyeDropper integration when the browser exposes the API.
- Documentation for architecture, roadmap, compatibility, licensing, and testing.
