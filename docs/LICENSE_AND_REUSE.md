# 许可证与复用边界

## 本项目许可证

WorkspaceKit Theme Lab 采用 MIT License。

## 为什么可以使用 MIT

当前框架：

- 只通过文档化的 ComfyUI JavaScript 扩展入口加载。
- 在运行时导入宿主提供的 `app` 对象。
- 不复制 ComfyUI Frontend 或 LiteGraph 源文件。
- 不打包官方前端构建产物。
- 不修改或重新分发 ComfyUI 本体。

因此仓库中的原创插件代码选择 MIT，以便 WorkspaceKit 系列复用和社区贡献。

## 外部项目

- ComfyUI：GPL-3.0。
- ComfyUI Frontend：GPL-3.0。
- ComfyUI Frontend Types 包：GPL-3.0-only。

这些项目的商标、代码和许可证不因本项目采用 MIT 而改变。

## 需要重新评估许可证的情况

出现以下行为时，应在合并代码前进行许可证审查：

- 复制官方 Frontend 或 LiteGraph 的实现代码。
- 将官方 Vue 组件源码加入本仓库。
- 打包、修改和分发官方前端构建产物。
- 引入 GPL 库并将其编译进本项目分发包。

## 第三方库策略

当前随插件携带一份本地浏览器端算法：

- Color Thief 3.3.0，MIT；仅用于从用户临时载入的参考图提取推荐色。
- 源文件与完整 MIT 文本位于 `js/vendor/color-thief/`；来源和用途见 `THIRD_PARTY_NOTICES.md`。
- 不使用 CDN、不安装 npm 运行依赖、不复制其界面代码。

未来加入其他第三方库时，应：

1. 检查许可证。
2. 固定版本。
3. 增加 `THIRD_PARTY_NOTICES.md`。
4. 不通过远程 CDN 在本地 ComfyUI 中静默加载代码。
