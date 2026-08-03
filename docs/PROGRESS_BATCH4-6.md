# Theme Lab batch4-batch6 进度跟踪

> **历史归档：** 本文保留 2026-08-01 的批次决策与已废弃方案，不能作为当前实现依据。当前四分区架构、后续工作与验证证据请以 `THEME_EDITOR_REDESIGN_PLAN.zh-CN.md`、`TEST_CHECKLIST.md` 和根目录 `CHANGELOG.md` 为准。

> **架构更正（2026-08-01，第 2 批）：** 本文下方记录的 Theme 专属
> “5-slot / referenceHost”方案已停止使用。它曾通过向共享 Blueprint
> 动态插入额外 DOM 节点实现，容易让独立模式与合并模式的结构分叉。
> 当前统一为 WorkspaceKit UI Template 的四个标准分区：Header、Toolbar、
> Controls、Content；参考图取色器归入 Content。后续实现与验收以四分区
> 契约为准，旧段落保留仅用于追溯此前的决策。
>
> **第 3 批（2026-08-01）：** Theme 的标题状态、控制条和高频图标按钮已改为优先调用共享 UI Template；旧 Vendor 不具备该能力时才使用原有回退按钮。
>
> **第 4 批（2026-08-01）：** 内容区分组、说明、参考图取色区和字段“恢复”操作已接入共享 Section / Button 类；保留 `details` 折叠、字段数据、实时预览与取色行为不变。
>
> **第 5 批（2026-08-01）：** 字段卡片和输入控件统一使用共享圆角、边框、阴影、控制高度、焦点和滑块类；不改变值范围、输入事件或提交时机。
>
> **第 6 批（2026-08-01，测试包 8190）：** 已在真实 ComfyUI 页面验证合并模式。Theme 正常进入 WK 面板；共享 Header、Control Row、图标按钮、Section 和 68 个字段卡片均已实际渲染。宿主区域为 Header / Context（隐藏）/ Controls / Body 四项，未发现旧 `referenceHost` 插槽。独立模式的真实视觉验收仍待单独切换合并开关后执行，避免本批擅自改变用户的长期设置。

> **范围**:本批(含 batch4/5/6)总览;每次只推进一个 batch,用户测试通过后才能进下一批。
> **备份位置**:`.codex-backups/74-pre-batch4-*.tar.gz`(batch4 起点)
> **写于**:2026-07-31 第 17 轮讨论

## 用户决定清单(本批不变)

| # | 决定 | 来源 |
|---|---|---|
| 1 | i18n 只做标签层(tabLabel/title/tooltip),panel 内 30+ 处中文硬编码留 batch7+ | 第 15 轮 |
| 2 | standalone 走 createContentSlots + **自补 controls slot + reference slot** | 第 16/18 轮 |
| 3 | iconButton 用 **inline SVG** (像 layout 的 `presentation-icons.js`),**不用 emoji** 不用 PrimeIcons | 第 17 轮 |
| 4 | 本批**不动 vendor** | 第 15 轮 |
| 5 | localStorage session 范围 = **B**(theme + baselineTheme + history + scrollTop + livePreview + searchQuery) | 第 18 轮 |
| 6 | 标题颜色 fallback = prototype + CSS 变量双写 | 第 16 轮 |
| 7 | 透明度控件去 "透明度" 文字 | 第 16 轮 |
| 8 | "应用主题" 按钮 = 无论实时预览开关,强制 apply 一次 | 第 19 轮 |
| 9 | 5-slot 结构(Theme 专属):row1=standalone-shell / row2=header / row3=controls / row4=reference(Theme 专属) / row5=content | 第 19 轮 |
| 10 | 第 3 行下拉 3 分组:视图控制 / 历史 / 恢复 | 第 19 轮 |
| 11 | 取色推荐色板(反馈 6)拆到 batch6 | 第 18 轮 |

## 5-slot 设计

```
┌─── slot 1: standalone-shell ──── (合并模式跳过)
│  🎨 主题实验室                  [⚙ 设置]
├─── slot 2: header ──── (createModuleHeader)
│  主题实验室                          [● 就绪]
├─── slot 3: controls ──── (createControlRow: leading=search, trailing=icons+more)
│  🔍 [搜索字段名..............]  📥  📸  💾  ⋯
├─── slot 4: reference ──── (Theme 专属,跟 contentHost 平级,但不在 content 内)
│  ▼ 参考图取色    [📥 导入参考图] [📸 屏幕吸色] 采样[3×3]
│  当前目标: 节点标题 · 标题文字
│  [canvas 区域,点击取色]
├─── slot 5: content ──── (独立滚动,分组卡片)
│  ▼ 节点标题          (3)
│  ┌─────┐ ┌─────┐ ┌─────┐
│  │[色卡]│ │[色卡]│ │[色卡]│
│  ▼ 节点面板          (8)
│  ...
```

**"更多"下拉** (3 分组 + 分割线):
- **视图控制**: `[☑] 实时预览`  /  `[🔄] 应用主题`
- **历史**: `[↶] 撤销`  /  `[↷] 重做`
- **恢复**: `[⟲] 恢复载入值`  /  `[⤺] 恢复打开前界面`

## 文件改动清单(本批预估)

| 文件 | batch4 | batch5 | batch6 |
|---|---|---|---|
| `js/lib/theme_lab_panel.js` | 5-slot 重组 + SVG icon 接入 + 下拉 | localStorage session | — |
| `js/lib/standalone-panel.js` | 5-slot mount(自补 reference slot) | — | — |
| `js/lib/provider.js` | tabLabel 走 i18n(已 batch3) | — | — |
| `js/lib/i18n.js` | +"应用主题" / 下拉标签 | +"视图控制" / "历史" / "恢复" | +"推荐色板" |
| `js/lib/theme_icons.js` | 新建 7 个 inline SVG | — | +2 个(SwatchPicked 标记) |
| `js/lib/theme_session.js` | — | 新建(load/save/clear) | — |
| `js/lib/theme_runtime_adapter.js` | applyField 标题 fallback | — | — |
| `js/lib/color_utils.js` | — | — | +extractPalette(canvas, n) |
| `js/theme_lab.css` | .wkt-button-icon + 透明度精简 + 5-slot 布局 | — | +推荐色板样式 |
| `js/lib/__tests__/batch4-*.mjs` | 新建(4-slot + 5-slot 挂载 + i18n + SVG) | +session 持久化 | +palette |

---

## batch4:结构重组(SVG + 5-slot + 下拉 + 滚动 + 透明度精简 + 标题 fallback)

**目标**:让 panel 看起来对、动起来对、theme 真能改。**不**做 localStorage 持久化(下批),**不**做取色推荐(下下批)。

### 改动

1. **新建 `js/lib/theme_icons.js`** — 7 个 inline SVG(导入/读取/导出/撤销/重做/恢复/更多/设置)
2. **`theme_lab_panel.js` 大改**:
   - `#normalizeHosts` 支持 `referenceHost` slot
   - `renderShell` 渲染 5 行(row1 standalone-shell 在合并模式跳过)
   - `renderHeader` 走 i18n
   - `renderControls` 重写:leading=search,trailing=3 个 SVG icon + 更多
   - `renderMoreMenu` 新建(popover,3 分组)
   - `renderReference` 拆出独立 render,从 contentHost 移到 referenceHost
   - `renderColorControl` 透明度去 "透明度" 文字
   - `applyField` 标题颜色 fallback(prototype + CSS 变量)
3. **`standalone-panel.js`**:mountBlueprint 传 reference slot;若 host 给的 slot 包含 referenceHost 也要 wiring
4. **`i18n.js`**:加 "应用主题" label
5. **`theme_lab.css`**:
   - `.wkt-button-icon` 保留(SVG 版)
   - `.wkt-alpha` 去掉 label
   - `.wkt-theme-lab-host { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden }`
   - `.wkt-content { overflow-y: auto; flex: 1; min-height: 0 }`
   - `.wkt-reference-slot { flex: 0 0 auto; }`(不滚)
6. **smoke `batch4-mount-icons.mjs`**:5-slot 挂载 + SVG icon 数量 + i18n + 下拉存在 + 透明度 label 消失

### 测试时验证(给用户)

- 启动 ComfyUI,标签合并 workspacekit 模式
- Theme Lab 标签页 → 应该看到 5 行布局(合并模式 row1 跳过,所以是 4 行 + 1 行 = 4 行视觉:header / controls / reference / content)
- 点 [⋯ 更多] → 3 分组下拉展开
- 点 [📥 导入主题] → 选 examples/dark.json → 卡片出现 + 实时套用
- 调节 NODE_TITLE_COLOR 颜色 → 节点标题颜色应改变(若仍无效,记录具体效果给用户)

### 风险

- 5-slot 跟 workspacekit-ui 4-slot Blueprint 不完全兼容,合并模式下 host 给的 4 slot + Theme 自补 1 个 reference 元素,要小心 DOM 顺序
- 下拉 popover 跟 layout 的 `workspace2-popover` 风格对齐,需要参照 CSS

---

## batch5:localStorage session 持久化

**目标**:重启 ComfyUI 也能恢复上次编辑状态(theme + history + 滚动位置 + livePreview + 搜索词)。

### 改动

1. **新建 `js/lib/theme_session.js`**:`loadSession() / saveSession() / clearSession()`,key = `workspacekit.theme.session`,debounce 300ms
2. **`theme_lab_panel.js`**:mountBlueprint 时尝试恢复;`loadTheme/undo/redo/applyField/commitCurrentState` 后 scheduleSave;`window.beforeunload` flush
3. **i18n.js**:+ "视图控制" / "历史" / "恢复" 三个分组标题(其实不需要 i18n,因为是 popover label 文字——但统一接口)
4. **smoke `batch5-session.mjs`**:save → load 恢复 + debounce + clear

### 测试时验证(给用户)

- 导入 dark.json → 调节几个颜色 → 刷新 ComfyUI → 应该恢复 theme + 调节过的颜色 + 滚动位置 + 搜索框文字(如果有)

### 风险

- localStorage 在 ComfyUI 私密模式可能不可用,fallback 到内存
- history 数组可能很大,debounce 防止写入抖动

---

## batch6:取色推荐色板(反馈 6)

**目标**:导入参考图后,自动生成 6-8 个推荐色,横排小圆点呈现,点击色板填入当前选中的颜色 target。

### 改动

1. **`color_utils.js` 新增 `extractPalette(canvas, count = 7)`** — 实现 median cut 或 k-means 聚类(本批先调研后实现)
2. **`reference picker` 新增 palette 容器**,import image onload 之后调 `extractPalette` 渲染圆点
3. **i18n.js** + theme_icons.js(无新增,色板是 CSS 圆点)
4. **CSS `.wkt-palette-swatch`**:小圆点 hover 放大 + 点击反馈
5. **smoke `batch6-palette.mjs`**:canvas → 7 个颜色

### 测试时验证(给用户)

- 导入示例图(或者截图一张工作流)→ 参考图下方出现 7 个推荐色圆点
- 先点一个颜色参数(激活 target)→ 点推荐色 → 该参数被填入 + 实时套用

### 风险

- 聚类算法选型需要联网调研(Eagle 实际算法未知,可能用 k-means 也可能用 Octree 量化),先做 PoC

---

## 用户测试节点

每完成一个 batch,我会**明确通知用户去 ComfyUI 验证**,列出验证清单。**不**自动连续推进下一 batch。

## 链接

- [[workspacekit-theme-refactor]] 主项目进度
- [[workspacekit-plugin-architecture]] 架构决策
- [[comfyui-locale-api]] i18n API 路径
