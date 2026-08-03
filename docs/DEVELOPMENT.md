# 开发指南

## 开发环境

该项目是纯客户端扩展，Python 文件只用于向 ComfyUI 暴露 `WEB_DIRECTORY`。

推荐环境：

- Python 3.9+
- Node.js 18+，仅用于语法检查
- 现代 ComfyUI 与 ComfyUI Frontend
- Chrome 或 Edge

## 安装到开发环境

将仓库放入：

```text
ComfyUI/custom_nodes/ComfyUI-WorkspaceKit-Theme
```

重启 ComfyUI 并刷新页面。修改 JS 或 CSS 后通常只需刷新浏览器，不需要重启 Python 后端；修改 `__init__.py` 后需要重启后端。

## 检查命令

```bash
python tests/smoke_test.py
python tests/test_theme_storage.py
node --check js/theme_lab.js
node --check js/lib/theme_lab_panel.js
node js/lib/__tests__/batch3-mount-i18n-icons.mjs
node js/lib/__tests__/batch4-5slot-svg-popover.mjs
node js/lib/__tests__/batch4c-save-session.mjs
```

## 代码边界

### 可以修改

- `theme_lab_panel.js`：产品交互。
- `field_meta.js`：字段说明和控件类型。
- `theme_runtime_adapter.js`：前端兼容。
- `color_utils.js`：颜色处理。
- `reference_palette.js`：参考图推荐色的本地分析边界。

### 谨慎修改

- ComfyUI 内部 Store 或未文档化对象。
- 全局 CSS 选择器。
- 工作流和用户设置持久化。

## 增加字段

在 `FIELD_META` 对应分区中添加：

```js
NEW_FIELD: {
  type: "color",
  label: "中文名称",
  description: "经实际验证的作用说明",
}
```

不要仅根据字段名猜测作用。应记录：

- ComfyUI Frontend 版本。
- Vue Nodes 是否启用。
- 触发该视觉状态的步骤。
- 修改前后截图。

## 兼容层策略

当新版 Frontend 使实时预览失效时：

1. 先确认主题 JSON 字段是否变化。
2. 确认旧 LiteGraph 与 Vue Nodes 的行为是否不同。
3. 仅修改 `ThemeRuntimeAdapter`。
4. 保留旧路径作为 fallback。
5. 更新 `COMPATIBILITY.md` 和测试矩阵。

## 更新本地 Vendor

`js/vendor/color-thief/` 只允许在有明确功能或安全理由时更新。更新时必须：固定版本、保留上游 MIT 文本、更新 `THIRD_PARTY_NOTICES.md`、重新验证参考图上传/色板/移除流程；不能改为 CDN 或 npm 运行时加载。

## 发布

修改 `pyproject.toml` 版本，更新 `CHANGELOG.md`，运行测试后再发布。Registry 发布格式参考官方 ComfyUI Registry 文档。
