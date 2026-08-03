# 思路来源

## 背景

该项目起源于一次 ComfyUI 主题文件调色需求。手工把 `NODE_BYPASS_BGCOLOR` 和 `NODE_ERROR_COLOUR` 替换为新颜色虽然简单，但结果不直观，并暴露了更根本的问题：仅凭 JSON 键名，用户难以确认颜色实际对应哪个界面状态。

## 需求演化

最初构思是一个独立网页：导入主题 JSON，在网页中模拟 ComfyUI 画布，并通过侧边栏调整颜色和透明度。

讨论后形成了更低成本、更真实的方向：

1. 不自行模拟 ComfyUI 画布。
2. 不从零编写节点外观。
3. 直接复用当前运行中的 ComfyUI Frontend / LiteGraph。
4. 把工具做成 WorkspaceKit 系列的 ComfyUI 前端插件。
5. 修改参数时立即反映到真实画布，不保存、不刷新网页。
6. 最终确认后再导出 JSON。

## 关键产品判断

- “真实预览”比“像 ComfyUI 的预览”更重要。
- 调色属于高频试错操作，必须支持连续实时反馈。
- 插件首先应该成为主题实验室，而不是主题文件管理器。
- 主题字段名称必须同时显示中文解释和原始 JSON 键名。
- 对字段作用不确定时必须明确标为未验证，不能根据名称猜测。

## WorkspaceKit 系列关系

该项目计划作为 WorkspaceKit 系列的一部分，与以下项目保持一致的命名和交互风格：

- `ComfyUI-WorkspaceKit`
- `ComfyUI-WorkspaceKit-Layout`
- `ComfyUI-WorkspaceKit-Theme`

后续可由主 WorkspaceKit 提供统一入口、共享样式、共享设置和扩展间通信。
