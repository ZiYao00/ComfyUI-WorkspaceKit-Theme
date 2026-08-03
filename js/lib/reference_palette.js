// Local MIT vendor: Color Thief 3.3.0. The UI and field-application behavior
// remain Theme-owned; this wrapper only constrains palette extraction work.
import { getPaletteSync } from "../vendor/color-thief/color-thief-3.3.0.browser.js";

const MAX_ANALYSIS_EDGE = 360;
const PALETTE_COLOR_COUNT = 8;

/**
 * Extract a small, stable set of suggested CSS colors without inspecting every
 * pixel of a full-size uploaded image. Object URLs are same-origin here; no
 * network request or persistent image data is involved.
 */
export function extractReferencePalette(image) {
  if (!image?.naturalWidth || !image?.naturalHeight) return [];

  const scale = Math.min(1, MAX_ANALYSIS_EDGE / image.naturalWidth, MAX_ANALYSIS_EDGE / image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const colors = getPaletteSync(canvas, {
    colorCount: PALETTE_COLOR_COUNT,
    quality: 12,
    // Theme references often contain light UI surfaces. Keep white available
    // instead of silently filtering it from suggested theme colors.
    ignoreWhite: false,
    colorSpace: "oklch",
  }) ?? [];

  return [...new Set(colors.map((color) => color.hex?.()).filter(Boolean))];
}
