# ComfyUI-WorkspaceKit-Theme

> ⚠️ **本仓库已归档。** 独立开发已迁移至 [ComfyUI-WorkspaceKit](https://github.com/ZiYao00/ComfyUI-WorkspaceKit)。本仓库仅作为只读历史快照保留；后续更新请使用主 WorkspaceKit 仓库。

**WorkspaceKit Theme Lab** 是 WK 家族中的 ComfyUI 实时主题调色插件。

它直接运行在真实 ComfyUI 前端中，不重新绘制或模拟节点画布。导入主题 JSON 后，修改颜色、透明度或数值时，插件会尝试立即更新当前 ComfyUI 运行时并触发画布重绘；只有导出时才会生成新的 JSON 文件。

> 归档时的历史版本：**0.1.0 Alpha**。已完成 WK 合并/独立双模式、主题读取、实时预览、参考图精确取色与推荐色板；尚未接入 ComfyUI 私有的“自定义主题持久化 Store”。

## 核心目标

- 使用真实 ComfyUI Frontend / LiteGraph 画布预览，而不是自行模拟。
- 调色过程不保存、不刷新网页、不重启 ComfyUI。
- 导入和导出时保留未识别字段。
- 把易变的 ComfyUI 运行时适配集中在单独文件中。
- 不复制、不打包 ComfyUI Frontend 或 LiteGraph 源码。
- 与 `ComfyUI-WorkspaceKit`、`ComfyUI-WorkspaceKit-Layout` 形成统一系列。

## 当前已实现

- 注册 `Theme Lab` ComfyUI 侧边栏。
- 导入 ComfyUI 主题 JSON。
- 从当前运行时采集一部分可识别的主题参数。
- 编辑 `node_slot`、`litegraph_base`、`comfy_base`。
- 颜色、透明度、数字、枚举和文本控件。
- 字段搜索。
- 字段级实时预览与画布重绘。
- 撤销、重做、单项恢复、全部恢复。
- 可点击或拖入 JPG、PNG、WebP 参考图。
- 参考图缩略图、精确取色与 8 个推荐色；推荐色只会填入当前选中的颜色字段。
- 1×1、3×3、5×5 平均取色。
- 在支持的浏览器环境中使用 `EyeDropper` 屏幕吸色。
- 导出修改后的完整主题 JSON。
- 内置 WK Dark ZY、WK Catppuccin Macchiato 与 WK Catppuccin Mocha 主题；主题清单保留对应预览图路径，供后续主题库界面使用。

## 安装

### ZIP 安装

1. 解压仓库。
2. 确保最终目录名为：

   ```text
   ComfyUI/custom_nodes/ComfyUI-WorkspaceKit-Theme
   ```

3. 重启 ComfyUI。
4. 刷新浏览器页面。
5. 在侧边栏寻找调色板图标和 `Theme Lab`。

本插件没有额外 Python 运行依赖，不需要手动执行 `pip install`。

### Git 安装

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ZiYao00/ComfyUI-WorkspaceKit-Theme.git
```

然后重启 ComfyUI 并刷新页面。

## 使用方法

1. 打开侧边栏中的 `Theme Lab`。
2. 点击“导入主题”，选择从 ComfyUI 设置中导出的主题 JSON。
3. 修改参数；实时预览时，真实画布会立即重绘。
4. 点击任意颜色参数，使它成为参考图取色目标。
5. 导入参考图并点击缩略图精确取色，或点击推荐色、使用“屏幕吸色”。
6. 点击“导出 JSON”保存结果。
7. 在 ComfyUI 的外观设置中载入导出的主题文件。

## 为什么暂时不直接“保存到 ComfyUI 主题列表”

ComfyUI 的侧边栏扩展 API和设置 API是公开接口，但自定义主题的注册、更新和持久化细节仍可能随前端版本调整。首版把以下两件事分开：

- **实时预览**：直接修改当前浏览器运行时，不写入设置。
- **持久化**：先导出 JSON，再由 ComfyUI 官方主题导入功能保存。

后续确认稳定的公共主题 API 后，可在 `ThemeRuntimeAdapter` 中增加“另存为 ComfyUI 自定义主题”，无需重写编辑器。

## 文件结构

```text
ComfyUI-WorkspaceKit-Theme/
├─ __init__.py
├─ pyproject.toml
├─ LICENSE
├─ README.md
├─ js/
│  ├─ theme_lab.js
│  ├─ theme_lab.css
│  └─ lib/
│     ├─ color_utils.js
│     ├─ reference_palette.js
│     ├─ field_meta.js
│     ├─ theme_document.js
│     ├─ theme_lab_panel.js
│     └─ theme_runtime_adapter.js
│  └─ vendor/color-thief/         # 固定的 MIT 色板算法
├─ examples/
│  └─ ZY_02.json
├─ docs/
└─ tests/
```

## 兼容性说明

- 需要支持自定义侧边栏标签页的现代 ComfyUI Frontend。
- `pyproject.toml` 当前声明 `comfyui-frontend-package>=1.20.5`。
- 旧版 LiteGraph Canvas 的大多数主题项可通过运行时常量即时更新。
- 新版 Vue Nodes 或第三方自绘节点可能存在字段缓存，需要逐版本验证。
- `user.css` 不属于本项目首版范围；它通常需要刷新页面。
- `NODE_ERROR_COLOUR` 是节点错误状态颜色，不应当标记为 Never/禁止节点颜色。

详细信息见 [兼容性说明](docs/COMPATIBILITY.md)。

## 开发

```bash
python tests/smoke_test.py
node --check js/theme_lab.js
node --check js/lib/*.js
```

开发说明见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## 文档

- [文档地图](docs/README.md)
- [当前 Theme 重构计划与进度](docs/THEME_EDITOR_REDESIGN_PLAN.zh-CN.md)
- [项目说明](docs/PROJECT_OVERVIEW.md)
- [思路来源](docs/IDEA_ORIGIN.md)
- [架构设计](docs/ARCHITECTURE.md)
- [后续计划](docs/ROADMAP.md)
- [开发指南](docs/DEVELOPMENT.md)
- [兼容性说明](docs/COMPATIBILITY.md)
- [测试清单](docs/TEST_CHECKLIST.md)
- [许可证与复用边界](docs/LICENSE_AND_REUSE.md)
- [参考资料](docs/REFERENCES.md)
- [第三方许可声明](docs/THIRD_PARTY_NOTICES.md)

## 许可证

本项目代码采用 [MIT License](LICENSE)。

ComfyUI 和 ComfyUI Frontend 是独立项目，并采用各自的许可证。本项目通过 ComfyUI 扩展 API 在运行时调用宿主能力，不包含其源代码。推荐色板使用本地随附的 Color Thief 3.3.0（MIT）。详见 [LICENSE_AND_REUSE.md](docs/LICENSE_AND_REUSE.md) 与 [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md)。
