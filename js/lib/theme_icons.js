// Theme Lab icon set, inline SVG matching the layout `presentation-icons.js`
// style: 24x24 viewBox, `currentColor` so the parent button decides the color.
//
// These are deliberately minimal — single-path, no fills (just stroke), so
// they scale cleanly at 14-16px and inherit the surrounding
// `--workspacekit-ui-text` token in light / dark / frosted WorkspaceKit
// themes. No external icon font (no PrimeIcons, no emoji).

const sw = 2;
const cap = "round";
const join = "round";

export const THEME_ICONS = Object.freeze({
  // 导入主题:箭头向下进入托盘
  import: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M12 3v12"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/></svg>`,
  // 读取当前界面:相机
  capture: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M3 8h3l2-3h8l2 3h3v12H3z"/><circle cx="12" cy="13" r="4"/></svg>`,
  // 导出 JSON:箭头向上离开托盘
  export: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M12 21V9"/><path d="m6 13 6-6 6 6"/><path d="M5 3h14"/></svg>`,
  // 撤销:左回旋箭头
  undo: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/></svg>`,
  // 重做:右回旋箭头
  redo: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h4"/></svg>`,
  // 恢复:顺时针环
  reset: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>`,
  // 还原:逆时针环 + 三角
  restore: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>`,
  // 应用主题:涂刷
  apply: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M14 4 4 14l4 4L18 8z"/><path d="m13 5 4 4"/><path d="M5 19c1-2 3-2 4 0s3 2 4 0 3-2 4 0"/></svg>`,
  // 保存主题:软盘
  save: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3"/><path d="M8 21v-7h8v7"/></svg>`,
  // 退出编辑:向左离开方框
  exit: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><path d="M13 5H5v14h8"/><path d="m11 12 8 0"/><path d="m16 9 3 3-3 3"/></svg>`,
  // 更多:三个点
  more: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`,
  // 设置:齿轮(简版,8 角)
  settings: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  // 关闭 / 移除参考图
  close: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
});

// Build an icon-only button styled like the layout/workspacekit ui kit
// (`createIconButton` flavour), but pure DOM so the panel can be tested
// without a Vendor Template.
export function iconButton(name, title, handler, { primary = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `wkt-button wkt-button-icon${primary ? " wkt-button-primary" : ""}`.trim();
  button.innerHTML = THEME_ICONS[name] ?? "";
  button.title = title;
  button.setAttribute("aria-label", title);
  button.addEventListener("click", handler);
  return button;
}
