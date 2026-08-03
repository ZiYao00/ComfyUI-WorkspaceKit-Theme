# Security Policy

WorkspaceKit Theme Lab is intended to operate locally inside ComfyUI.

## Data handling

- Imported theme JSON files are read in the browser.
- Reference images are decoded in the browser.
- The framework performs no network upload.
- The framework includes no Python package installation beyond ComfyUI's normal frontend compatibility metadata.

## Reporting

Please report security concerns privately to the repository owner before opening a public issue.

## Scope warning

A ComfyUI custom node can execute Python and JavaScript with the user's permissions. Users should review custom nodes before installation and install only from trusted sources.
