# 兼容性说明

## 基线

`pyproject.toml` 当前声明：

```toml
dependencies = ["comfyui-frontend-package>=1.20.5"]
```

原因：该版本范围具备现代外观系统和背景图片相关能力，同时侧边栏扩展 API 已在更早版本提供。

## WorkspaceKit UI 契约

Theme 可选接入 WorkspaceKit 的 Provider 与 UI Template，但不会把它作为运行前提：

- 可用宿主：使用宿主提供的 Header、Toolbar、Controls、Content 四分区。
- 无宿主或不兼容宿主：使用插件内 Vendor Template 的同版本四分区回退。
- Theme 只依赖公开的 UI Template 能力；不直接读取 WorkspaceKit 私有 DOM、状态或样式实现。

这保证 Layout、Theme 等家族插件既能合并，也能作为独立插件运行。

已在测试包 8190 验证 Theme 的合并路径；独立路径与四种 WK 背景的完整人工验收仍保留在 `TEST_CHECKLIST.md`，不能以静态测试替代。

## 三类主题字段

### `comfy_base`

通过根元素 CSS 变量实时更新，通常最稳定。

### `litegraph_base`

框架同时尝试更新：

- 全局 `LiteGraph`
- 全局或当前 Canvas 的 `LGraphCanvas`
- 当前 `app.canvas`

然后调用 `setDirty`、`setDirtyCanvas` 和 `draw` 的可用方法。

### `node_slot`

框架尝试更新：

- `app.canvas.default_connection_color_byType`
- `LGraphCanvas.link_type_colors`
- `LiteGraph.link_type_colors`

不同前端版本可能只使用其中一处。

## Vue Nodes

现代 ComfyUI Frontend 可以使用 Vue 节点渲染。部分样式可能通过响应式 Store 而不是旧 LiteGraph 常量获取。当前框架会触发自定义事件：

```text
workspacekit-theme-preview
```

后续可由 Vue Nodes 专用适配器监听该事件或接入稳定 Store API。

## 第三方节点

以下情况可能不跟随主题：

- 节点自己写死颜色。
- 节点首次初始化时缓存颜色。
- 节点使用 DOM、SVG、WebGL 或独立 Canvas 绘制。
- 插件使用自己的主题系统。

本项目不会强制覆盖第三方节点代码。

## 状态名称

- `NODE_BYPASS_BGCOLOR`：Bypass 节点背景色。
- `NODE_ERROR_COLOUR`：节点错误状态颜色。
- Never / Mute 状态是否有独立主题字段，需要按 Frontend 版本实测，不能映射为错误颜色。

## `user.css`

`user.css` 在应用启动阶段载入，通常需要刷新页面。本项目首版不编辑或热重载该文件。
