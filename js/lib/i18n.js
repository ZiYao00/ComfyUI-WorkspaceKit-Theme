// ComfyUI locale resolution + label layer for the Theme Lab family.
//
// i18n scope: shared labels plus all Theme Lab chrome, status, and actionable
// messages. Field/group metadata has its own staged bilingual migration so
// translations cannot accidentally change the editor's data classification.
//
// The ComfyUI v0.3+ (Vue ESM) locale is exposed through the legacy settings
// surface. See [[comfyui-locale-api]] for the empirical confirmation: only
// `app.ui.settings.getSettingValue("Comfy.Locale")` works; `localStorage`,
// `app.ui.settings.store`, and `extensionManager.setting` all return
// nothing in the current build.

const SUPPORTED = new Set(["zh", "en"]);

function pickLanguage(raw) {
  if (!raw) return null;
  const tag = String(raw).toLowerCase();
  if (tag.startsWith("zh-tw")) return "zh-TW";
  if (tag.startsWith("zh")) return "zh";
  if (tag.startsWith("en")) return "en";
  return null;
}

// Compress everything to one of two families for label rendering. Anything
// not `zh*` falls into the `en` bucket; Comfy ships 13 locales but Theme
// only ships two label families.
export function resolveLocale({ app, navigator } = {}) {
  // 1. ComfyUI user setting (authoritative once the user has changed it).
  try {
    const setting = app?.ui?.settings?.getSettingValue?.("Comfy.Locale");
    const fromSetting = pickLanguage(setting);
    if (fromSetting) return fromSetting === "zh-TW" ? "zh" : fromSetting;
  } catch {
    // Settings may be unavailable during early bootstrap; fall through.
  }
  // 2. Browser fallback (covers a user who has never opened ComfyUI Settings).
  const nav = typeof navigator !== "undefined" ? navigator : globalThis.navigator;
  const fromNav = pickLanguage(nav?.language) ?? pickLanguage((nav?.languages || [])[0]);
  if (fromNav) return fromNav === "zh-TW" ? "zh" : fromNav;
  return "en";
}

// Labels for the label layer. Only what tab/title/tooltip render. Internal
// panel copy remains Chinese for now (TODO batch7).
const LABELS = {
  en: {
    tabLabel: "Theme",
    tabTooltip: "WK Theme",
    standaloneTitle: "WK Theme",
    standaloneTooltip: "WK Theme",
    providerTitle: "WK Theme",
    headerTitle: "Theme",
    apply: "Apply Theme",
    groupView: "View",
    groupHistory: "History",
    groupRestore: "Restore",
    actionImport: "Import theme",
    actionCapture: "Capture current",
    actionRefresh: "Refresh theme list",
    themeSelectPlaceholder: "Select theme…",
    metadataFileName: "File name",
    metadataThemeName: "Theme name",
    metadataId: "ID",
    actionExport: "Export JSON",
    groupFile: "File",
    groupSession: "Session",
    actionSave: "Save",
    actionSaveCopy: "Save copy",
    actionExit: "Exit editing",
    actionSaveExit: "Save and exit",
    confirmOverwriteTitle: "Overwrite WK theme?",
    confirmOverwriteMessage: "This will replace the existing WK theme. A private backup will be created first.",
    confirmExitTitle: "Discard unsaved changes?",
    confirmExitMessage: "The preview will return to the appearance from before Theme Lab was opened.",
    confirmSaveExitTitle: "Save and exit?",
    confirmSaveExitMessage: "The saved appearance will remain active after the editor closes.",
    actionCancel: "Cancel",
    actionApply: "Apply Theme",
    actionUndo: "Undo",
    actionRedo: "Redo",
    actionReset: "Reset to loaded",
    actionRestore: "Restore before open",
    actionLive: "Live preview",
    actionMore: "More actions",
    actionSettings: "Settings",
    alphaTitle: "Opacity",
    searchPlaceholder: "Search label or JSON field…",
    emptyTitle: "No theme is being edited",
    emptyDescription: "Import a JSON theme or capture a snapshot of the current interface.",
    actionResetField: "Reset",
    colorPickerTitle: "Choose color",
    referenceTitle: "Reference colors",
    actionImportReference: "Import reference image",
    actionClearReference: "Remove reference image",
    actionApplyPaletteColor: "Use suggested color {color}",
    referenceDropTitle: "Import a reference image",
    referenceDropDescription: "Click or drop a JPG, PNG, or WebP image here.",
    actionScreenPicker: "Screen color picker",
    sampleLabel: "Sample",
    currentTargetNone: "Current target: no color field selected",
    currentTargetValue: "Current target: {label} · {key}",
    statusInitial: "Import a theme JSON or capture recognizable values from the current interface.",
    statusImported: "Imported {name}",
    statusExported: "Theme JSON exported.",
    statusThemeListRefreshed: "Refreshed {count} built-in themes.",
    statusThemeLoaded: "Loaded {name}",
    statusRuntimeCaptured: "Captured recognizable colors from the current interface.",
    statusPreview: "Preview: {key} = {value}",
    statusUndo: "Undone.",
    statusRedo: "Redone.",
    statusResetLoaded: "Restored the values from when the theme was loaded.",
    statusRestoredBeforeOpen: "Restored the interface colors captured before Theme Lab opened.",
    statusExitRestored: "Exited editing and restored the interface from before opening.",
    statusSavedAndExit: "Theme saved and editing closed.",
    statusSaved: "Saved: {name}",
    statusCopySaved: "Created copy: {name}",
    statusReferenceLoaded: "Loaded reference image: {name}",
    notifyNoThemeSummary: "No theme loaded",
    notifyNoThemeDetail: "Import a theme or capture the current interface first.",
    notifyThemeImportFailed: "Theme import failed",
    notifyThemeListFailed: "Theme list failed to load",
    notifyThemeLoadFailed: "Theme failed to load",
    notifyCaptureFailed: "Capture failed",
    notifyCopySaveFailed: "Unable to save copy",
    notifyCopySaveFailedDetail: "Too many copies exist. Change the file name and try again.",
    notifyThemeSaveFailed: "Theme save failed",
    notifyThemeSaved: "Theme saved",
    notifyUnsupportedPickerSummary: "Screen color picker unavailable",
    notifyUnsupportedPickerDetail: "Import a reference image and click it to sample a color instead.",
    notifySelectColorSummary: "Select a color field first",
    notifySelectColorForScreen: "Click any color control, then use the screen color picker.",
    notifySelectColorForReference: "Click any color control above, then sample from the reference image.",
    notifyEyedropperFailed: "Color picker failed",
    notifyImageSampleFailed: "Image color sampling failed",
    notifyReferenceLoadFailed: "Reference image failed to load",
  },
  zh: {
    tabLabel: "主题",
    tabTooltip: "WK 主题",
    standaloneTitle: "WK 主题",
    standaloneTooltip: "WK 主题",
    providerTitle: "WK 主题",
    headerTitle: "主题",
    apply: "应用主题",
    groupView: "视图控制",
    groupHistory: "历史",
    groupRestore: "恢复",
    actionImport: "导入主题",
    actionCapture: "读取当前界面",
    actionRefresh: "刷新主题列表",
    themeSelectPlaceholder: "选择主题…",
    metadataFileName: "文件名",
    metadataThemeName: "主题名",
    metadataId: "ID",
    actionExport: "导出 JSON",
    groupFile: "文件",
    groupSession: "编辑会话",
    actionSave: "保存",
    actionSaveCopy: "保存副本",
    actionExit: "退出编辑",
    actionSaveExit: "保存并退出",
    confirmOverwriteTitle: "覆盖 WK 主题？",
    confirmOverwriteMessage: "将覆盖当前 WK 主题；保存前会先创建私有备份。",
    confirmExitTitle: "放弃未保存更改？",
    confirmExitMessage: "预览会恢复为打开主题编辑器前的界面外观。",
    confirmSaveExitTitle: "保存并退出？",
    confirmSaveExitMessage: "保存后的主题外观会继续保留，编辑器将关闭。",
    actionCancel: "取消",
    actionApply: "应用主题",
    actionUndo: "撤销",
    actionRedo: "重做",
    actionReset: "恢复载入值",
    actionRestore: "恢复打开前界面",
    actionLive: "实时预览",
    actionMore: "更多操作",
    actionSettings: "设置",
    alphaTitle: "透明度",
    searchPlaceholder: "搜索中文名称或 JSON 字段…",
    emptyTitle: "没有正在编辑的主题",
    emptyDescription: "使用「导入主题」载入 JSON，或使用「读取当前界面」创建一个运行时快照。",
    actionResetField: "恢复",
    colorPickerTitle: "点击选择颜色",
    referenceTitle: "参考图取色",
    actionImportReference: "导入参考图",
    actionClearReference: "移除参考图",
    actionApplyPaletteColor: "使用推荐色 {color}",
    referenceDropTitle: "导入参考图",
    referenceDropDescription: "点击或拖入 JPG、PNG 或 WebP 图片。",
    actionScreenPicker: "屏幕吸色",
    sampleLabel: "采样",
    currentTargetNone: "当前目标：未选择颜色参数",
    currentTargetValue: "当前目标：{label} · {key}",
    statusInitial: "导入主题 JSON，或从当前界面采集可识别参数。",
    statusImported: "已导入 {name}",
    statusExported: "已导出主题 JSON。",
    statusThemeListRefreshed: "已刷新 {count} 个内置主题。",
    statusThemeLoaded: "已载入 {name}",
    statusRuntimeCaptured: "已从当前运行时采集可识别颜色",
    statusPreview: "预览：{key} = {value}",
    statusUndo: "已撤销。",
    statusRedo: "已重做。",
    statusResetLoaded: "已恢复到载入主题时的状态。",
    statusRestoredBeforeOpen: "已恢复打开 Theme Lab 前采集到的界面颜色。",
    statusExitRestored: "已退出编辑并恢复打开前界面。",
    statusSavedAndExit: "已保存主题并退出编辑。",
    statusSaved: "已保存：{name}",
    statusCopySaved: "已创建副本：{name}",
    statusReferenceLoaded: "已载入参考图：{name}",
    notifyNoThemeSummary: "尚未加载主题",
    notifyNoThemeDetail: "请先导入主题或读取当前界面。",
    notifyThemeImportFailed: "主题导入失败",
    notifyThemeListFailed: "主题列表读取失败",
    notifyThemeLoadFailed: "主题读取失败",
    notifyCaptureFailed: "采集失败",
    notifyCopySaveFailed: "无法保存副本",
    notifyCopySaveFailedDetail: "当前主题副本数量过多，请修改文件名后再试。",
    notifyThemeSaveFailed: "主题保存失败",
    notifyThemeSaved: "主题已保存",
    notifyUnsupportedPickerSummary: "当前环境不支持屏幕吸色",
    notifyUnsupportedPickerDetail: "仍可导入参考图后点击图片取色。",
    notifySelectColorSummary: "请先选择颜色参数",
    notifySelectColorForScreen: "先点击任意颜色控件，再使用屏幕吸色。",
    notifySelectColorForReference: "点击上方任意颜色输入，再到参考图取色。",
    notifyEyedropperFailed: "吸色失败",
    notifyImageSampleFailed: "图片取色失败",
    notifyReferenceLoadFailed: "参考图载入失败",
  },
};

export function labelsFor(locale) {
  return LABELS[locale] ?? LABELS.en;
}

// Convenience: resolve a single label by key for a given locale.
export function t(locale, key, values = {}) {
  const template = labelsFor(locale)[key] ?? labelsFor.en[key] ?? key;
  return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => (
    values[name] === undefined || values[name] === null ? match : String(values[name])
  ));
}
