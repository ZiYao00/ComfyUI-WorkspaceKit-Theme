# 测试清单

## 安装

- [ ] ComfyUI 启动日志无 `import failed`。
- [ ] 侧边栏出现 Theme Lab 图标。
- [ ] 打开、关闭、再次打开侧边栏不重复创建样式标签。

## WorkspaceKit UI（2026-08-01）

- [x] 测试包 8190：Theme 作为 WK 合并标签正常打开。
- [x] 合并模式仅使用宿主四个标准区域，未动态插入 `referenceHost`。
- [x] 共享 Header、Control Row、Icon Button、Section 与字段卡片已在真实页面渲染。
- [ ] 独立模式：关闭“允许扩展合并到侧边栏”并刷新后，做同一轮视觉验收；完成后恢复原设置。

## 导入导出

- [ ] 能导入 `examples/ZY_02.json`。
- [ ] 非 JSON 文件显示错误。
- [ ] 缺少 `colors` 的 JSON 被拒绝。
- [ ] 未识别字段在导出后仍存在。
- [ ] Base64 背景图片未被截断。

## 实时预览

- [ ] `CLEAR_BACKGROUND_COLOR` 立即改变画布背景。
- [ ] `NODE_DEFAULT_COLOR` 立即改变节点标题栏。
- [ ] `NODE_DEFAULT_BGCOLOR` 立即改变节点主体。
- [ ] `NODE_BYPASS_BGCOLOR` 对 Bypass 节点生效。
- [ ] `NODE_ERROR_COLOUR` 对真实错误状态生效。
- [ ] `IMAGE`、`LATENT`、`MODEL` 插槽颜色更新。
- [ ] `comfy-menu-bg` 和 `comfy-input-bg` 更新界面。
- [ ] 暂停实时预览后，编辑不会立刻应用。
- [ ] 点击“重新应用”后当前主题生效。

## 历史

- [ ] 颜色拖动完成后可以撤销。
- [ ] 数值修改可以撤销和重做。
- [ ] 单项恢复回到导入值。
- [ ] 全部恢复回到导入主题。

## 参考图

- [x] 测试包 8190：PNG 可显示为缩略图并生成 8 个推荐色。
- [x] 测试包 8190：选中 `NODE_TITLE_COLOR` 后点击推荐色，字段值实际更新。
- [x] 测试包 8190：移除参考图后缩略图/色板清空，导入表面恢复。
- [ ] JPG、PNG、WebP 分别可以显示。
- [ ] 1×1、3×3、5×5 采样工作。
- [ ] 未选择目标字段时给出提示。
- [ ] 取色后颜色参数和真实界面一起更新。
- [ ] EyeDropper 不支持时显示降级说明。

## 发布前必须补齐

- [ ] 独立模式与合并模式各完成一次完整人工视觉验收。
- [ ] 深色、浅色、透明、磨砂四种 WK 背景下检查 Theme 面板。
- [ ] 以 `examples/ZY_02.json` 走完导入、编辑、撤销、导出、重新导入。
- [ ] 确认 `origin`、默认分支与 `pyproject.toml` 的仓库 URL 一致。

## 版本矩阵

每次发布记录：

| Frontend | Vue Nodes | Browser | 结果 |
|---|---|---|---|
| 待填写 | On | Chrome | 待测试 |
| 待填写 | Off | Chrome | 待测试 |
| 待填写 | On | Edge | 待测试 |
