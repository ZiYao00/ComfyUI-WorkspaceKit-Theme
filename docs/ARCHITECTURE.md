# 架构设计

## 总览

```text
ComfyUI Frontend
├─ app.registerExtension
├─ WorkspaceKit Provider（可用时合并为 WK 工作区标签）
├─ extensionManager.registerSidebarTab（WK 不可用时独立显示）
├─ 当前 LiteGraph / Vue Nodes 画布
└─ WorkspaceKit Theme Lab
   ├─ ThemeLabPanel
   ├─ ThemeDocument
   ├─ FieldMeta
   ├─ ColorUtils
   ├─ ReferencePalette
   └─ ThemeRuntimeAdapter
```

## 模块职责

### `js/theme_lab.js`

插件入口：

- 引入 ComfyUI 的 `app`。
- 加载 CSS。
- 注册侧边栏标签页。
- 创建运行时适配器和 UI 面板。

### 双模式 UI 壳

Theme Lab 始终使用同一套 WorkspaceKit Panel UI Template：

- 安装并允许 WorkspaceKit 合并时，Provider 接收宿主给出的四个标准分区。
- 未安装、版本不兼容或关闭合并时，`standalone-panel.js` 使用随插件携带的 Vendor Template 创建同样的四个分区。
- 四个分区固定为 Header、Toolbar、Controls、Content；Theme 的参考图取色器属于 Content，不能向宿主动态插入第五分区。

因此双模式共享标题、状态、控制条、图标按钮的尺寸、焦点、悬停和主题变量，而主题编辑数据与运行时适配器不依赖 WorkspaceKit 宿主。

### `js/lib/theme_lab_panel.js`

界面与交互：

- JSON 导入、导出。
- 参数搜索和控件生成。
- 实时预览开关。
- 撤销、重做、恢复。
- 参考图加载和取色目标管理。
- 参考图缩略图、推荐色显示与当前颜色字段应用。

该模块不直接了解 LiteGraph 内部实现，只调用适配器。

### `js/lib/theme_runtime_adapter.js`

宿主兼容层：

- 读取当前运行时中的已知主题值。
- 修改 LiteGraph 常量。
- 修改连接类型颜色映射。
- 修改 ComfyUI CSS 变量。
- 请求画布重绘。

未来所有因 ComfyUI Frontend 版本升级产生的兼容修改，应优先集中在该文件。

### `js/lib/theme_document.js`

主题文档层：

- 验证基本 JSON 结构。
- 补齐三个标准颜色分区。
- 读写字段。
- 深拷贝。
- 无损导出完整 JSON。

### `js/lib/field_meta.js`

字段知识库：

- 中文名称。
- 参数类型。
- 数值范围。
- 字段说明。
- 已知风险提示。

未知字段会根据值类型生成通用控件，但不会被删除。

### `js/lib/color_utils.js`

颜色工具：

- HEX / RGB / RGBA 解析。
- 透明度转换。
- Canvas 像素平均采样。

### `js/lib/reference_palette.js`

- 将用户临时载入的参考图缩放到最长边 `360px` 的分析 Canvas。
- 调用本地 Vendor 的 Color Thief 3.3.0 提取 8 个推荐色。
- 不拥有界面、不写入主题 JSON；ThemeLabPanel 决定何时显示和应用色块。
- 完整第三方来源与 MIT 文本见 `THIRD_PARTY_NOTICES.md` 和 `js/vendor/color-thief/LICENSE`。

## 数据流

```text
用户输入
  ↓
ThemeLabPanel 更新内存主题
  ↓
ThemeRuntimeAdapter.applyField
  ├─ node_slot → 连接颜色映射
  ├─ litegraph_base → LiteGraph / Canvas 常量
  └─ comfy_base → CSS 变量
  ↓
Canvas setDirty / draw
  ↓
真实 ComfyUI 界面更新
```

## 为什么不直接绑定私有 Store

ComfyUI Frontend 的内部 Pinia Store 会随版本调整。直接导入内部文件或依赖私有方法，会提高失效概率。框架首版选择兼容适配器，并将“官方持久化”留为独立接口。

未来确认稳定主题 API 后，可增加：

```text
ThemePersistenceAdapter
├─ createCustomPalette
├─ updateCustomPalette
├─ setActivePalette
└─ deleteCustomPalette
```

而不需要重写 UI 和主题文档层。
