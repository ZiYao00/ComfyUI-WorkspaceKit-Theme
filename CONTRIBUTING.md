# Contributing

Thank you for improving WorkspaceKit Theme Lab.

## Principles

1. Prefer ComfyUI public extension APIs over private implementation details.
2. Do not bundle copied ComfyUI Frontend or LiteGraph source code.
3. Keep runtime dependencies at zero unless a dependency clearly removes more code than it adds.
4. Preserve unknown theme fields during import and export.
5. Treat live preview and persistent saving as separate operations.

## Development flow

1. Create a branch.
2. Keep changes focused.
3. Run `python tests/smoke_test.py`.
4. Run `node --check` on all JavaScript files.
5. Test with both legacy canvas nodes and Vue nodes when available.
6. Update `CHANGELOG.md` for user-visible changes.

See `docs/DEVELOPMENT.md` for details.
