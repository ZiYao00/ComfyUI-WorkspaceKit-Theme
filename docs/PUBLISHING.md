# 发布说明

## 发布前

1. 更新 `pyproject.toml` 中的语义化版本号。
2. 更新 `CHANGELOG.md`。
3. 完成 `TEST_CHECKLIST.md`。
4. 运行：

   ```bash
   python tests/smoke_test.py
   python tests/test_theme_storage.py
   node --check js/theme_lab.js
   node --check js/lib/theme_lab_panel.js
   node js/lib/__tests__/batch3-mount-i18n-icons.mjs
   node js/lib/__tests__/batch4-5slot-svg-popover.mjs
   node js/lib/__tests__/batch4c-save-session.mjs
   ```

5. 确认 `PublisherId = "ZiYao00"` 与 Registry 账户一致。
6. 确认仓库 URL、文档 URL 和问题追踪 URL 正确。
7. 确认 Git 已配置 `origin`，并且推送分支与 GitHub 默认分支一致；当前文档 URL 使用 `main`，若继续使用 `master` 必须先统一。
8. 确认 `.theme-backups/` 与 `.codex-backups/` 未被暂存；它们只保留在本机用于恢复。

## Registry

可以使用 Comfy CLI：

```bash
comfy node publish
```

仓库附带的 GitHub Actions 仅支持手动触发，发布前需要配置：

```text
REGISTRY_ACCESS_TOKEN
```

推送到 GitHub 不会自动发布 Registry。推送成功后，仍需要在 Actions 手动触发 `Publish to Comfy Registry`，并由该工作流读取仓库 Secret。
