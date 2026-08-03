var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/color-space.ts
function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  const s = c <= 31308e-7 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}
function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l3 = Math.cbrt(l_);
  const m3 = Math.cbrt(m_);
  const s3 = Math.cbrt(s_);
  const L = 0.2104542553 * l3 + 0.793617785 * m3 - 0.0040720468 * s3;
  const a = 1.9779984951 * l3 - 2.428592205 * m3 + 0.4505937099 * s3;
  const bLab = 0.0259040371 * l3 + 0.7827717662 * m3 - 0.808675766 * s3;
  const C = Math.sqrt(a * a + bLab * bLab);
  let H = Math.atan2(bLab, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}
function oklchToRgb(l, c, h) {
  const hRad = h * (Math.PI / 180);
  const a = c * Math.cos(hRad);
  const bLab = c * Math.sin(hRad);
  const l3 = l + 0.3963377774 * a + 0.2158037573 * bLab;
  const m3 = l - 0.1055613458 * a - 0.0638541728 * bLab;
  const s3 = l - 0.0894841775 * a - 1.291485548 * bLab;
  const l_ = l3 * l3 * l3;
  const m_ = m3 * m3 * m3;
  const s_ = s3 * s3 * s3;
  const lr = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const lg = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const lb = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}
function pixelsRgbToOklchScaled(pixels) {
  const out = new Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b] = pixels[i];
    const { l, c, h } = rgbToOklch(r, g, b);
    out[i] = [
      Math.round(l * 255),
      Math.round(c / 0.4 * 255),
      Math.round(h / 360 * 255)
    ];
  }
  return out;
}
function paletteOklchScaledToRgb(colors) {
  return colors.map(({ color: [ls, cs, hs], population }) => {
    const l = ls / 255;
    const c = cs / 255 * 0.4;
    const h = hs / 255 * 360;
    return { color: oklchToRgb(l, c, h), population };
  });
}
var init_color_space = __esm({
  "src/color-space.ts"() {
    "use strict";
  }
});

// src/color.ts
function rgbToHsl(r, g, b) {
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  const max = Math.max(r1, g1, b1);
  const min = Math.min(r1, g1, b1);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r1) {
      h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6;
    } else if (max === g1) {
      h = ((b1 - r1) / d + 2) / 6;
    } else {
      h = ((r1 - g1) / d + 4) / 6;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}
function relativeLuminance(r, g, b) {
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
function createColor(r, g, b, population, proportion = 0) {
  return new ColorImpl(r, g, b, population, proportion);
}
var ColorImpl;
var init_color = __esm({
  "src/color.ts"() {
    "use strict";
    init_color_space();
    ColorImpl = class {
      constructor(r, g, b, population, proportion) {
        this._r = r;
        this._g = g;
        this._b = b;
        this.population = population;
        this.proportion = proportion;
      }
      rgb() {
        return { r: this._r, g: this._g, b: this._b };
      }
      hex() {
        const toHex = (n) => n.toString(16).padStart(2, "0");
        return `#${toHex(this._r)}${toHex(this._g)}${toHex(this._b)}`;
      }
      hsl() {
        if (!this._hsl) {
          this._hsl = rgbToHsl(this._r, this._g, this._b);
        }
        return this._hsl;
      }
      oklch() {
        if (!this._oklch) {
          this._oklch = rgbToOklch(this._r, this._g, this._b);
        }
        return this._oklch;
      }
      css(format = "rgb") {
        switch (format) {
          case "hsl": {
            const { h, s, l } = this.hsl();
            return `hsl(${h}, ${s}%, ${l}%)`;
          }
          case "oklch": {
            const { l, c, h } = this.oklch();
            return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
          }
          case "rgb":
          default:
            return `rgb(${this._r}, ${this._g}, ${this._b})`;
        }
      }
      array() {
        return [this._r, this._g, this._b];
      }
      toString() {
        return this.hex();
      }
      get textColor() {
        return this.isDark ? "#ffffff" : "#000000";
      }
      get luminance() {
        if (this._luminance === void 0) {
          this._luminance = relativeLuminance(this._r, this._g, this._b);
        }
        return this._luminance;
      }
      get isDark() {
        return this.luminance <= 0.179;
      }
      get isLight() {
        return !this.isDark;
      }
      get contrast() {
        if (!this._contrast) {
          const lum = this.luminance;
          const white = contrastRatio(lum, 1);
          const black = contrastRatio(lum, 0);
          const foreground = this.isDark ? createColor(255, 255, 255, 0, 0) : createColor(0, 0, 0, 0, 0);
          this._contrast = {
            white: Math.round(white * 100) / 100,
            black: Math.round(black * 100) / 100,
            foreground
          };
        }
        return this._contrast;
      }
    };
  }
});

// src/pipeline.ts
var pipeline_exports = {};
__export(pipeline_exports, {
  computeFallbackColor: () => computeFallbackColor,
  createPixelArray: () => createPixelArray,
  extractPalette: () => extractPalette,
  validateOptions: () => validateOptions
});
function validateOptions(options) {
  let { colorCount, quality } = options;
  if (typeof colorCount === "undefined" || !Number.isInteger(colorCount)) {
    colorCount = 10;
  } else if (colorCount === 1) {
    throw new Error(
      "colorCount should be between 2 and 20. To get one color, call getColor() instead of getPalette()"
    );
  } else {
    colorCount = Math.max(colorCount, 2);
    colorCount = Math.min(colorCount, 20);
  }
  if (typeof quality === "undefined" || !Number.isInteger(quality) || quality < 1) {
    quality = 10;
  }
  const ignoreWhite = options.ignoreWhite !== void 0 ? !!options.ignoreWhite : true;
  const whiteThreshold = typeof options.whiteThreshold === "number" ? options.whiteThreshold : 250;
  const alphaThreshold = typeof options.alphaThreshold === "number" ? options.alphaThreshold : 125;
  const minSaturation = typeof options.minSaturation === "number" ? Math.max(0, Math.min(1, options.minSaturation)) : 0;
  const colorSpace = options.colorSpace ?? "oklch";
  return {
    colorCount,
    quality,
    ignoreWhite,
    whiteThreshold,
    alphaThreshold,
    minSaturation,
    colorSpace
  };
}
function createPixelArray(data, pixelCount, quality, filterOptions) {
  const {
    ignoreWhite = true,
    whiteThreshold = 250,
    alphaThreshold = 125,
    minSaturation = 0
  } = filterOptions;
  const pixelArray = [];
  for (let i = 0; i < pixelCount; i += quality) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    if (a !== void 0 && a < alphaThreshold) continue;
    if (ignoreWhite && r > whiteThreshold && g > whiteThreshold && b > whiteThreshold)
      continue;
    if (minSaturation > 0) {
      const max = Math.max(r, g, b);
      if (max === 0 || (max - Math.min(r, g, b)) / max < minSaturation)
        continue;
    }
    pixelArray.push([r, g, b]);
  }
  return pixelArray;
}
function computeFallbackColor(data, pixelCount, quality) {
  let rTotal = 0;
  let gTotal = 0;
  let bTotal = 0;
  let count = 0;
  for (let i = 0; i < pixelCount; i += quality) {
    const offset = i * 4;
    rTotal += data[offset];
    gTotal += data[offset + 1];
    bTotal += data[offset + 2];
    count++;
  }
  if (count === 0) return null;
  return [
    Math.round(rTotal / count),
    Math.round(gTotal / count),
    Math.round(bTotal / count)
  ];
}
function extractPalette(data, width, height, opts, quantizer) {
  const pixelCount = width * height;
  const filterOptions = {
    ignoreWhite: opts.ignoreWhite,
    whiteThreshold: opts.whiteThreshold,
    alphaThreshold: opts.alphaThreshold,
    minSaturation: opts.minSaturation
  };
  let pixelArray = createPixelArray(data, pixelCount, opts.quality, filterOptions);
  if (pixelArray.length === 0) {
    pixelArray = createPixelArray(data, pixelCount, opts.quality, {
      ...filterOptions,
      ignoreWhite: false
    });
  }
  if (pixelArray.length === 0) {
    pixelArray = createPixelArray(data, pixelCount, opts.quality, {
      ...filterOptions,
      ignoreWhite: false,
      alphaThreshold: 0
    });
  }
  let quantized;
  if (opts.colorSpace === "oklch") {
    const scaled = pixelsRgbToOklchScaled(pixelArray);
    quantized = paletteOklchScaledToRgb(
      quantizer.quantize(scaled, opts.colorCount)
    );
  } else {
    quantized = quantizer.quantize(pixelArray, opts.colorCount);
  }
  if (quantized.length > 0) {
    const totalPopulation = quantized.reduce((sum, q) => sum + q.population, 0);
    return quantized.map(
      ({ color: [r, g, b], population }) => createColor(r, g, b, population, totalPopulation > 0 ? population / totalPopulation : 0)
    );
  }
  const fallback = computeFallbackColor(data, pixelCount, opts.quality);
  return fallback ? [createColor(fallback[0], fallback[1], fallback[2], 1, 1)] : null;
}
var init_pipeline = __esm({
  "src/pipeline.ts"() {
    "use strict";
    init_color();
    init_color_space();
  }
});

// src/loaders/browser.ts
var browser_exports = {};
__export(browser_exports, {
  BrowserPixelLoader: () => BrowserPixelLoader
});
var BrowserPixelLoader;
var init_browser = __esm({
  "src/loaders/browser.ts"() {
    "use strict";
    BrowserPixelLoader = class {
      async load(source) {
        if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
          return this.loadFromImage(source);
        }
        if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
          return this.loadFromCanvas(source);
        }
        if (typeof ImageData !== "undefined" && source instanceof ImageData) {
          return {
            data: source.data,
            width: source.width,
            height: source.height
          };
        }
        if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
          return this.loadFromVideo(source);
        }
        if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
          return this.loadFromImageBitmap(source);
        }
        if (typeof OffscreenCanvas !== "undefined" && source instanceof OffscreenCanvas) {
          return this.loadFromOffscreenCanvas(source);
        }
        throw new Error(
          "Unsupported source type. Expected HTMLImageElement, HTMLCanvasElement, HTMLVideoElement, ImageData, ImageBitmap, or OffscreenCanvas."
        );
      }
      loadFromImage(img) {
        if (!img.complete) {
          throw new Error(
            'Image has not finished loading. Wait for the "load" event before calling getColor/getPalette.'
          );
        }
        if (!img.naturalWidth) {
          throw new Error(
            "Image has no dimensions. It may not have loaded successfully."
          );
        }
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const width = canvas.width = img.naturalWidth;
        const height = canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          return { data: imageData.data, width, height };
        } catch (e) {
          if (e instanceof DOMException && e.name === "SecurityError") {
            const err = new Error(
              'Image is tainted by cross-origin data. Add crossorigin="anonymous" to the <img> tag and ensure the server sends appropriate CORS headers.'
            );
            err.cause = e;
            throw err;
          }
          throw e;
        }
      }
      loadFromCanvas(canvas) {
        const ctx = canvas.getContext("2d");
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        return { data: imageData.data, width, height };
      }
      loadFromVideo(video) {
        if (video.readyState < 2) {
          throw new Error(
            'Video is not ready. Wait for the "loadeddata" or "canplay" event before calling getColor/getPalette.'
          );
        }
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) {
          throw new Error(
            "Video has no dimensions. It may not have loaded successfully."
          );
        }
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        return { data: imageData.data, width, height };
      }
      loadFromOffscreenCanvas(canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error(
            "Could not get 2D context from OffscreenCanvas."
          );
        }
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        return { data: imageData.data, width, height };
      }
      loadFromImageBitmap(bitmap) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        return { data: imageData.data, width: bitmap.width, height: bitmap.height };
      }
    };
  }
});

// src/worker/worker-script.ts
var WORKER_SOURCE;
var init_worker_script = __esm({
  "src/worker/worker-script.ts"() {
    "use strict";
    WORKER_SOURCE = /* js */
    `
'use strict';

// -------------------------------------------------------------------------
// Inlined MMCQ (Modified Median Cut Quantization)
// -------------------------------------------------------------------------

var SIGBITS = 5;
var RSHIFT = 3;
var MAX_ITER = 1000;
var FRACT_POP = 0.75;
var HISTO_SIZE = 32768;

function colorIndex(r, g, b) {
    return (r << 10) + (g << 5) + b;
}

function getHisto(pixels) {
    var h = new Uint32Array(HISTO_SIZE);
    for (var i = 0; i < pixels.length; i++) {
        var p = pixels[i];
        h[colorIndex(p[0] >> RSHIFT, p[1] >> RSHIFT, p[2] >> RSHIFT)]++;
    }
    return h;
}

function VBox(r1, r2, g1, g2, b1, b2, histo) {
    this.r1 = r1; this.r2 = r2;
    this.g1 = g1; this.g2 = g2;
    this.b1 = b1; this.b2 = b2;
    this.histo = histo;
    this._count = -1;
    this._volume = -1;
    this._avg = null;
}

VBox.prototype.volume = function(force) {
    if (this._volume < 0 || force) {
        this._volume = (this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1);
    }
    return this._volume;
};

VBox.prototype.count = function(force) {
    if (this._count < 0 || force) {
        var n = 0;
        for (var i = this.r1; i <= this.r2; i++)
            for (var j = this.g1; j <= this.g2; j++)
                for (var k = this.b1; k <= this.b2; k++)
                    n += this.histo[colorIndex(i, j, k)] || 0;
        this._count = n;
    }
    return this._count;
};

VBox.prototype.copy = function() {
    return new VBox(this.r1, this.r2, this.g1, this.g2, this.b1, this.b2, this.histo);
};

VBox.prototype.avg = function(force) {
    if (!this._avg || force) {
        var mult = 1 << RSHIFT;
        if (this.r1 === this.r2 && this.g1 === this.g2 && this.b1 === this.b2) {
            this._avg = [this.r1 << RSHIFT, this.g1 << RSHIFT, this.b1 << RSHIFT];
        } else {
            var ntot = 0, rsum = 0, gsum = 0, bsum = 0;
            for (var i = this.r1; i <= this.r2; i++)
                for (var j = this.g1; j <= this.g2; j++)
                    for (var k = this.b1; k <= this.b2; k++) {
                        var hval = this.histo[colorIndex(i, j, k)] || 0;
                        ntot += hval;
                        rsum += hval * (i + 0.5) * mult;
                        gsum += hval * (j + 0.5) * mult;
                        bsum += hval * (k + 0.5) * mult;
                    }
            this._avg = ntot
                ? [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)]
                : [~~(mult * (this.r1 + this.r2 + 1) / 2), ~~(mult * (this.g1 + this.g2 + 1) / 2), ~~(mult * (this.b1 + this.b2 + 1) / 2)];
        }
    }
    return this._avg;
};

function PQueue(comparator) {
    this.contents = [];
    this.sorted = false;
    this.comparator = comparator;
}

PQueue.prototype.push = function(item) { this.contents.push(item); this.sorted = false; };
PQueue.prototype.pop = function() {
    if (!this.sorted) { this.contents.sort(this.comparator); this.sorted = true; }
    return this.contents.pop();
};
PQueue.prototype.size = function() { return this.contents.length; };

function vboxFromPixels(pixels, histo) {
    var rmin = 1e6, rmax = 0, gmin = 1e6, gmax = 0, bmin = 1e6, bmax = 0;
    for (var i = 0; i < pixels.length; i++) {
        var p = pixels[i];
        var rv = p[0] >> RSHIFT, gv = p[1] >> RSHIFT, bv = p[2] >> RSHIFT;
        if (rv < rmin) rmin = rv; if (rv > rmax) rmax = rv;
        if (gv < gmin) gmin = gv; if (gv > gmax) gmax = gv;
        if (bv < bmin) bmin = bv; if (bv > bmax) bmax = bv;
    }
    return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
}

function medianCutApply(histo, vbox) {
    if (!vbox.count()) return undefined;
    if (vbox.count() === 1) return [vbox.copy(), null];

    var rw = vbox.r2 - vbox.r1 + 1;
    var gw = vbox.g2 - vbox.g1 + 1;
    var bw = vbox.b2 - vbox.b1 + 1;
    var maxw = Math.max(rw, gw, bw);
    var total = 0;
    var partialsum = [];
    var lookaheadsum = [];
    var i, j, k, sum;

    if (maxw === rw) {
        for (i = vbox.r1; i <= vbox.r2; i++) {
            sum = 0;
            for (j = vbox.g1; j <= vbox.g2; j++)
                for (k = vbox.b1; k <= vbox.b2; k++)
                    sum += histo[colorIndex(i, j, k)] || 0;
            total += sum; partialsum[i] = total;
        }
    } else if (maxw === gw) {
        for (i = vbox.g1; i <= vbox.g2; i++) {
            sum = 0;
            for (j = vbox.r1; j <= vbox.r2; j++)
                for (k = vbox.b1; k <= vbox.b2; k++)
                    sum += histo[colorIndex(j, i, k)] || 0;
            total += sum; partialsum[i] = total;
        }
    } else {
        for (i = vbox.b1; i <= vbox.b2; i++) {
            sum = 0;
            for (j = vbox.r1; j <= vbox.r2; j++)
                for (k = vbox.g1; k <= vbox.g2; k++)
                    sum += histo[colorIndex(j, k, i)] || 0;
            total += sum; partialsum[i] = total;
        }
    }

    partialsum.forEach(function(d, idx) { lookaheadsum[idx] = total - d; });

    function doCut(color) {
        var dim1 = color + '1', dim2 = color + '2';
        for (var i = vbox[dim1]; i <= vbox[dim2]; i++) {
            if (partialsum[i] > total / 2) {
                var vbox1 = vbox.copy(), vbox2 = vbox.copy();
                var left = i - vbox[dim1], right = vbox[dim2] - i;
                var d2 = left <= right
                    ? Math.min(vbox[dim2] - 1, ~~(i + right / 2))
                    : Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                while (!partialsum[d2]) d2++;
                var count2 = lookaheadsum[d2];
                while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2];
                vbox1[dim2] = d2;
                vbox2[dim1] = d2 + 1;
                return [vbox1, vbox2];
            }
        }
    }

    if (maxw === rw) return doCut('r');
    if (maxw === gw) return doCut('g');
    return doCut('b');
}

function iterate(pq, target, histo) {
    var ncolors = pq.size(), niters = 0;
    while (niters < MAX_ITER) {
        if (ncolors >= target) return;
        niters++;
        var vbox = pq.pop();
        if (!vbox.count()) { pq.push(vbox); continue; }
        var result = medianCutApply(histo, vbox);
        if (!result || !result[0]) return;
        pq.push(result[0]);
        if (result[1]) { pq.push(result[1]); ncolors++; }
    }
}

function quantize(pixels, maxColors) {
    if (!pixels.length || maxColors < 2 || maxColors > 256) return [];

    var histo = getHisto(pixels);
    var vbox = vboxFromPixels(pixels, histo);
    var pq = new PQueue(function(a, b) { return a.count() - b.count(); });
    pq.push(vbox);
    iterate(pq, FRACT_POP * maxColors, histo);

    var pq2 = new PQueue(function(a, b) { return a.count() * a.volume() - b.count() * b.volume(); });
    while (pq.size()) pq2.push(pq.pop());
    iterate(pq2, maxColors, histo);

    var results = [];
    while (pq2.size()) {
        var box = pq2.pop();
        results.push({ color: box.avg(), population: box.count() });
    }
    return results;
}

// -------------------------------------------------------------------------
// Worker message handler
// -------------------------------------------------------------------------

self.onmessage = function (e) {
    var data = e.data;
    var id = data.id;
    try {
        var palette = quantize(data.pixels, data.maxColors);
        self.postMessage({ id: id, palette: palette });
    } catch (err) {
        self.postMessage({ id: id, error: err.message || 'Unknown worker error' });
    }
};
`;
  }
});

// src/worker/manager.ts
var manager_exports = {};
__export(manager_exports, {
  extractInWorker: () => extractInWorker,
  isWorkerSupported: () => isWorkerSupported,
  terminateWorker: () => terminateWorker
});
function isWorkerSupported() {
  return typeof Worker !== "undefined";
}
function getOrCreateWorker() {
  if (worker) return worker;
  if (!isWorkerSupported()) {
    throw new Error("Web Workers are not supported in this environment.");
  }
  blobUrl = URL.createObjectURL(
    new Blob([WORKER_SOURCE], { type: "application/javascript" })
  );
  worker = new Worker(blobUrl);
  worker.onmessage = (e) => {
    const { id, palette, error } = e.data;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (error) {
      entry.reject(new Error(error));
    } else {
      const raw = palette;
      const totalPopulation = raw.reduce((sum, q) => sum + q.population, 0);
      const colors = raw.map(({ color: [r, g, b], population }) => createColor(r, g, b, population, totalPopulation > 0 ? population / totalPopulation : 0));
      entry.resolve(colors);
    }
  };
  worker.onerror = (e) => {
    for (const [, entry] of pending) {
      entry.reject(new Error(e.message));
    }
    pending.clear();
  };
  return worker;
}
function extractInWorker(pixels, maxColors, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = nextId++;
    pending.set(id, { resolve, reject });
    const onAbort = () => {
      pending.delete(id);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const w = getOrCreateWorker();
      w.postMessage({ id, pixels, maxColors });
    } catch (err) {
      pending.delete(id);
      signal?.removeEventListener("abort", onAbort);
      reject(err);
    }
  });
}
function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  }
  for (const [, entry] of pending) {
    entry.reject(new Error("Worker terminated"));
  }
  pending.clear();
}
var worker, blobUrl, nextId, pending;
var init_manager = __esm({
  "src/worker/manager.ts"() {
    "use strict";
    init_color();
    init_worker_script();
    worker = null;
    blobUrl = null;
    nextId = 0;
    pending = /* @__PURE__ */ new Map();
  }
});

// src/api.ts
init_pipeline();

// src/progressive.ts
init_pipeline();
var PASSES = [
  { divisor: 16, progress: 0.06 },
  { divisor: 4, progress: 0.25 },
  { divisor: 1, progress: 1 }
];
function yieldToMain() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
async function* extractProgressive(data, width, height, opts, quantizer, signal) {
  for (let i = 0; i < PASSES.length; i++) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    const pass = PASSES[i];
    const passOpts = {
      ...opts,
      quality: opts.quality * pass.divisor
    };
    const palette = extractPalette(data, width, height, passOpts, quantizer);
    const done = i === PASSES.length - 1;
    yield {
      palette: palette ?? [],
      progress: pass.progress,
      done
    };
    if (!done) {
      await yieldToMain();
    }
  }
}

// src/swatches.ts
init_color();
var TARGETS = [
  { role: "Vibrant", targetL: 0.65, minL: 0.4, maxL: 0.85, targetC: 0.2, minC: 0.08 },
  { role: "Muted", targetL: 0.65, minL: 0.4, maxL: 0.85, targetC: 0.04, minC: 0 },
  { role: "DarkVibrant", targetL: 0.3, minL: 0, maxL: 0.45, targetC: 0.2, minC: 0.08 },
  { role: "DarkMuted", targetL: 0.3, minL: 0, maxL: 0.45, targetC: 0.04, minC: 0 },
  { role: "LightVibrant", targetL: 0.85, minL: 0.7, maxL: 1, targetC: 0.2, minC: 0.08 },
  { role: "LightMuted", targetL: 0.85, minL: 0.7, maxL: 1, targetC: 0.04, minC: 0 }
];
var WEIGHT_L = 6;
var WEIGHT_C = 3;
var WEIGHT_POP = 1;
function score(color, target, maxPopulation) {
  const { l, c } = color.oklch();
  if (l < target.minL || l > target.maxL) return -Infinity;
  if (c < target.minC) return -Infinity;
  const lDist = 1 - Math.abs(l - target.targetL);
  const cDist = 1 - Math.min(Math.abs(c - target.targetC) / 0.2, 1);
  const pop = maxPopulation > 0 ? color.population / maxPopulation : 0;
  return lDist * WEIGHT_L + cDist * WEIGHT_C + pop * WEIGHT_POP;
}
var WHITE = createColor(255, 255, 255, 0);
var BLACK = createColor(0, 0, 0, 0);
function textColors(color) {
  return {
    title: color.isDark ? WHITE : BLACK,
    body: color.isDark ? WHITE : BLACK
  };
}
function classifySwatches(palette) {
  const maxPopulation = Math.max(...palette.map((c) => c.population), 1);
  const assignments = [];
  for (const target of TARGETS) {
    let bestColor = null;
    let bestScore = -Infinity;
    for (const color of palette) {
      const s = score(color, target, maxPopulation);
      if (s > bestScore) {
        bestScore = s;
        bestColor = color;
      }
    }
    if (bestColor && bestScore > -Infinity) {
      assignments.push({ role: target.role, color: bestColor, score: bestScore });
    }
  }
  const used = /* @__PURE__ */ new Set();
  const result = {};
  assignments.sort((a, b) => b.score - a.score);
  for (const assignment of assignments) {
    if (used.has(assignment.color)) {
      const target = TARGETS.find((t) => t.role === assignment.role);
      let fallback = null;
      let fallbackScore = -Infinity;
      for (const color of palette) {
        if (used.has(color)) continue;
        const s = score(color, target, maxPopulation);
        if (s > fallbackScore) {
          fallbackScore = s;
          fallback = color;
        }
      }
      if (fallback && fallbackScore > -Infinity) {
        used.add(fallback);
        const { title, body } = textColors(fallback);
        result[assignment.role] = {
          color: fallback,
          role: assignment.role,
          titleTextColor: title,
          bodyTextColor: body
        };
      } else {
        result[assignment.role] = null;
      }
    } else {
      used.add(assignment.color);
      const { title, body } = textColors(assignment.color);
      result[assignment.role] = {
        color: assignment.color,
        role: assignment.role,
        titleTextColor: title,
        bodyTextColor: body
      };
    }
  }
  for (const target of TARGETS) {
    if (!(target.role in result)) {
      result[target.role] = null;
    }
  }
  return result;
}

// src/quantizers/mmcq.ts
var SIGBITS = 5;
var RSHIFT = 8 - SIGBITS;
var MAX_ITERATIONS = 1e3;
var FRACT_BY_POPULATIONS = 0.75;
var HISTO_SIZE = 1 << 3 * SIGBITS;
function getColorIndex(r, g, b) {
  return (r << 2 * SIGBITS) + (g << SIGBITS) + b;
}
var VBox = class _VBox {
  constructor(r1, r2, g1, g2, b1, b2, histo) {
    this.r1 = r1;
    this.r2 = r2;
    this.g1 = g1;
    this.g2 = g2;
    this.b1 = b1;
    this.b2 = b2;
    this.histo = histo;
  }
  volume(force = false) {
    if (this._volume === void 0 || force) {
      this._volume = (this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1);
    }
    return this._volume;
  }
  count(force = false) {
    if (this._count === void 0 || force) {
      let npix = 0;
      for (let i = this.r1; i <= this.r2; i++) {
        for (let j = this.g1; j <= this.g2; j++) {
          for (let k = this.b1; k <= this.b2; k++) {
            npix += this.histo[getColorIndex(i, j, k)] || 0;
          }
        }
      }
      this._count = npix;
    }
    return this._count;
  }
  copy() {
    return new _VBox(this.r1, this.r2, this.g1, this.g2, this.b1, this.b2, this.histo);
  }
  avg(force = false) {
    if (this._avg === void 0 || force) {
      const mult = 1 << RSHIFT;
      if (this.r1 === this.r2 && this.g1 === this.g2 && this.b1 === this.b2) {
        this._avg = [
          this.r1 << RSHIFT,
          this.g1 << RSHIFT,
          this.b1 << RSHIFT
        ];
      } else {
        let ntot = 0;
        let rsum = 0;
        let gsum = 0;
        let bsum = 0;
        for (let i = this.r1; i <= this.r2; i++) {
          for (let j = this.g1; j <= this.g2; j++) {
            for (let k = this.b1; k <= this.b2; k++) {
              const hval = this.histo[getColorIndex(i, j, k)] || 0;
              ntot += hval;
              rsum += hval * (i + 0.5) * mult;
              gsum += hval * (j + 0.5) * mult;
              bsum += hval * (k + 0.5) * mult;
            }
          }
        }
        if (ntot) {
          this._avg = [
            ~~(rsum / ntot),
            ~~(gsum / ntot),
            ~~(bsum / ntot)
          ];
        } else {
          this._avg = [
            ~~(mult * (this.r1 + this.r2 + 1) / 2),
            ~~(mult * (this.g1 + this.g2 + 1) / 2),
            ~~(mult * (this.b1 + this.b2 + 1) / 2)
          ];
        }
      }
    }
    return this._avg;
  }
};
var PQueue = class {
  constructor(comparator) {
    this.comparator = comparator;
    this.contents = [];
    this.sorted = false;
  }
  sort() {
    this.contents.sort(this.comparator);
    this.sorted = true;
  }
  push(item) {
    this.contents.push(item);
    this.sorted = false;
  }
  peek(index) {
    if (!this.sorted) this.sort();
    return this.contents[index ?? this.contents.length - 1];
  }
  pop() {
    if (!this.sorted) this.sort();
    return this.contents.pop();
  }
  size() {
    return this.contents.length;
  }
  map(fn) {
    return this.contents.map(fn);
  }
};
function getHisto(pixels) {
  const histo = new Uint32Array(HISTO_SIZE);
  for (const pixel of pixels) {
    const rval = pixel[0] >> RSHIFT;
    const gval = pixel[1] >> RSHIFT;
    const bval = pixel[2] >> RSHIFT;
    histo[getColorIndex(rval, gval, bval)]++;
  }
  return histo;
}
function vboxFromPixels(pixels, histo) {
  let rmin = 1e6;
  let rmax = 0;
  let gmin = 1e6;
  let gmax = 0;
  let bmin = 1e6;
  let bmax = 0;
  for (const pixel of pixels) {
    const rval = pixel[0] >> RSHIFT;
    const gval = pixel[1] >> RSHIFT;
    const bval = pixel[2] >> RSHIFT;
    if (rval < rmin) rmin = rval;
    else if (rval > rmax) rmax = rval;
    if (gval < gmin) gmin = gval;
    else if (gval > gmax) gmax = gval;
    if (bval < bmin) bmin = bval;
    else if (bval > bmax) bmax = bval;
  }
  return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
}
function medianCutApply(histo, vbox) {
  if (!vbox.count()) return void 0;
  if (vbox.count() === 1) return [vbox.copy(), null];
  const rw = vbox.r2 - vbox.r1 + 1;
  const gw = vbox.g2 - vbox.g1 + 1;
  const bw = vbox.b2 - vbox.b1 + 1;
  const maxw = Math.max(rw, gw, bw);
  let total = 0;
  const partialsum = [];
  const lookaheadsum = [];
  if (maxw === rw) {
    for (let i = vbox.r1; i <= vbox.r2; i++) {
      let sum = 0;
      for (let j = vbox.g1; j <= vbox.g2; j++) {
        for (let k = vbox.b1; k <= vbox.b2; k++) {
          sum += histo[getColorIndex(i, j, k)] || 0;
        }
      }
      total += sum;
      partialsum[i] = total;
    }
  } else if (maxw === gw) {
    for (let i = vbox.g1; i <= vbox.g2; i++) {
      let sum = 0;
      for (let j = vbox.r1; j <= vbox.r2; j++) {
        for (let k = vbox.b1; k <= vbox.b2; k++) {
          sum += histo[getColorIndex(j, i, k)] || 0;
        }
      }
      total += sum;
      partialsum[i] = total;
    }
  } else {
    for (let i = vbox.b1; i <= vbox.b2; i++) {
      let sum = 0;
      for (let j = vbox.r1; j <= vbox.r2; j++) {
        for (let k = vbox.g1; k <= vbox.g2; k++) {
          sum += histo[getColorIndex(j, k, i)] || 0;
        }
      }
      total += sum;
      partialsum[i] = total;
    }
  }
  partialsum.forEach((d, i) => {
    lookaheadsum[i] = total - d;
  });
  function doCut(color) {
    const dim1 = color + "1";
    const dim2 = color + "2";
    for (let i = vbox[dim1]; i <= vbox[dim2]; i++) {
      if (partialsum[i] > total / 2) {
        const vbox1 = vbox.copy();
        const vbox2 = vbox.copy();
        const left = i - vbox[dim1];
        const right = vbox[dim2] - i;
        let d2;
        if (left <= right) {
          d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
        } else {
          d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
        }
        while (!partialsum[d2]) d2++;
        let count2 = lookaheadsum[d2];
        while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2];
        vbox1[dim2] = d2;
        vbox2[dim1] = vbox1[dim2] + 1;
        return [vbox1, vbox2];
      }
    }
    return void 0;
  }
  if (maxw === rw) return doCut("r");
  if (maxw === gw) return doCut("g");
  return doCut("b");
}
function iterate(pq, target, histo) {
  let ncolors = pq.size();
  let niters = 0;
  while (niters < MAX_ITERATIONS) {
    if (ncolors >= target) return;
    niters++;
    const vbox = pq.pop();
    if (!vbox.count()) {
      pq.push(vbox);
      continue;
    }
    const result = medianCutApply(histo, vbox);
    if (!result || !result[0]) return;
    pq.push(result[0]);
    if (result[1]) {
      pq.push(result[1]);
      ncolors++;
    }
  }
}
function quantize(pixels, maxColors) {
  if (!pixels.length || maxColors < 2 || maxColors > 256) return [];
  const seenColors = /* @__PURE__ */ new Set();
  const uniqueColors = [];
  for (const color of pixels) {
    const key = color.join(",");
    if (!seenColors.has(key)) {
      seenColors.add(key);
      uniqueColors.push(color);
    }
  }
  if (uniqueColors.length <= maxColors) {
    const countMap = /* @__PURE__ */ new Map();
    for (const color of pixels) {
      const key = color.join(",");
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }
    return uniqueColors.map((color) => ({
      color,
      population: countMap.get(color.join(","))
    }));
  }
  const histo = getHisto(pixels);
  const vbox = vboxFromPixels(pixels, histo);
  const pq = new PQueue((a, b) => a.count() - b.count());
  pq.push(vbox);
  iterate(pq, FRACT_BY_POPULATIONS * maxColors, histo);
  const pq2 = new PQueue((a, b) => a.count() * a.volume() - b.count() * b.volume());
  while (pq.size()) {
    pq2.push(pq.pop());
  }
  iterate(pq2, maxColors, histo);
  const results = [];
  while (pq2.size()) {
    const box = pq2.pop();
    results.push({
      color: box.avg(),
      population: box.count()
    });
  }
  return results;
}
var MmcqQuantizer = class {
  async init() {
  }
  quantize(pixels, maxColors) {
    return quantize(pixels, maxColors);
  }
};

// src/resolve-loader.browser.ts
async function resolveDefaultLoader() {
  const { BrowserPixelLoader: BrowserPixelLoader2 } = await Promise.resolve().then(() => (init_browser(), browser_exports));
  return new BrowserPixelLoader2();
}

// src/api.ts
var globalLoader = null;
var globalQuantizer = null;
function configure(opts) {
  if (opts.loader) globalLoader = opts.loader;
  if (opts.quantizer) globalQuantizer = opts.quantizer;
}
async function getLoader(perCall) {
  if (perCall) return perCall;
  if (globalLoader) return globalLoader;
  globalLoader = await resolveDefaultLoader();
  return globalLoader;
}
async function getQuantizer(perCall) {
  if (perCall) {
    await perCall.init();
    return perCall;
  }
  if (globalQuantizer) return globalQuantizer;
  const q = new MmcqQuantizer();
  await q.init();
  globalQuantizer = q;
  return q;
}
function checkAborted(signal) {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }
}
async function loadPixels(source, options) {
  checkAborted(options?.signal);
  const loader2 = await getLoader(options?.loader);
  return loader2.load(source, options?.signal);
}
async function getColor(source, options) {
  const palette = await getPalette(source, {
    colorCount: 5,
    ...options
  });
  return palette ? palette[0] : null;
}
async function getPalette(source, options) {
  const opts = validateOptions(options ?? {});
  checkAborted(options?.signal);
  if (options?.worker) {
    const { isWorkerSupported: isWorkerSupported2, extractInWorker: extractInWorker2 } = await Promise.resolve().then(() => (init_manager(), manager_exports));
    if (isWorkerSupported2()) {
      const { data, width, height } = await loadPixels(source, options);
      const { createPixelArray: createPixelArray2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
      const pixelArray = createPixelArray2(data, width * height, opts.quality, {
        ignoreWhite: opts.ignoreWhite,
        whiteThreshold: opts.whiteThreshold,
        alphaThreshold: opts.alphaThreshold,
        minSaturation: opts.minSaturation
      });
      return extractInWorker2(pixelArray, opts.colorCount, options?.signal);
    }
  }
  const [pixels, quantizer] = await Promise.all([
    loadPixels(source, options),
    getQuantizer(options?.quantizer)
  ]);
  checkAborted(options?.signal);
  return extractPalette(
    pixels.data,
    pixels.width,
    pixels.height,
    opts,
    quantizer
  );
}
async function getSwatches(source, options) {
  const palette = await getPalette(source, {
    colorCount: 16,
    ...options
  });
  return classifySwatches(palette ?? []);
}
async function* getPaletteProgressive(source, options) {
  const opts = validateOptions(options ?? {});
  const [pixels, quantizer] = await Promise.all([
    loadPixels(source, options),
    getQuantizer(options?.quantizer)
  ]);
  yield* extractProgressive(
    pixels.data,
    pixels.width,
    pixels.height,
    opts,
    quantizer,
    options?.signal
  );
}

// src/sync.ts
init_browser();
init_pipeline();
var loader = new BrowserPixelLoader();
var defaultQuantizer = new MmcqQuantizer();
function getColorSync(source, options) {
  const palette = getPaletteSync(source, { colorCount: 5, ...options });
  return palette ? palette[0] : null;
}
function getPaletteSync(source, options) {
  const opts = validateOptions(options ?? {});
  const quantizer = options?.quantizer ?? defaultQuantizer;
  const pixels = loadPixelsSync(source);
  return extractPalette(
    pixels.data,
    pixels.width,
    pixels.height,
    opts,
    quantizer
  );
}
function getSwatchesSync(source, options) {
  const palette = getPaletteSync(source, { colorCount: 16, ...options });
  return classifySwatches(palette ?? []);
}
function loadPixelsSync(source) {
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    return loadFromImage(source);
  }
  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    return loadFromCanvas(source);
  }
  if (typeof ImageData !== "undefined" && source instanceof ImageData) {
    return { data: source.data, width: source.width, height: source.height };
  }
  if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
    return loadFromVideo(source);
  }
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return loadFromImageBitmap(source);
  }
  if (typeof OffscreenCanvas !== "undefined" && source instanceof OffscreenCanvas) {
    return loadFromOffscreenCanvas(source);
  }
  throw new Error(
    "Unsupported source type. Expected HTMLImageElement, HTMLCanvasElement, HTMLVideoElement, ImageData, ImageBitmap, or OffscreenCanvas."
  );
}
function loadFromImage(img) {
  if (!img.complete) {
    throw new Error(
      'Image has not finished loading. Wait for the "load" event before calling getColorSync/getPaletteSync.'
    );
  }
  if (!img.naturalWidth) {
    throw new Error(
      "Image has no dimensions. It may not have loaded successfully."
    );
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width = img.naturalWidth;
  const height = canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0, width, height);
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    return { data: imageData.data, width, height };
  } catch (e) {
    if (e instanceof DOMException && e.name === "SecurityError") {
      const err = new Error(
        'Image is tainted by cross-origin data. Add crossorigin="anonymous" to the <img> tag and ensure the server sends appropriate CORS headers.'
      );
      err.cause = e;
      throw err;
    }
    throw e;
  }
}
function loadFromCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}
function loadFromVideo(video) {
  if (video.readyState < 2) {
    throw new Error(
      'Video is not ready. Wait for the "loadeddata" or "canplay" event before calling getColorSync/getPaletteSync.'
    );
  }
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error(
      "Video has no dimensions. It may not have loaded successfully."
    );
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}
function loadFromOffscreenCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "Could not get 2D context from OffscreenCanvas."
    );
  }
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}
function loadFromImageBitmap(bitmap) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { data: imageData.data, width: bitmap.width, height: bitmap.height };
}

// src/observe.ts
function observe(source, options) {
  const {
    throttle = 200,
    onChange,
    ...extractionOptions
  } = options;
  let stopped = false;
  let rafId = null;
  let mutationObserver = null;
  let lastExtractTime = 0;
  const cleanups = [];
  function extract() {
    try {
      const palette = getPaletteSync(source, extractionOptions);
      if (palette && palette.length > 0) {
        onChange(palette);
      }
    } catch {
    }
  }
  function tick() {
    if (stopped) return;
    const now = performance.now();
    if (now - lastExtractTime >= throttle) {
      if (source instanceof HTMLVideoElement) {
        if (source.readyState >= 2 && !source.paused && !source.ended) {
          extract();
          lastExtractTime = now;
        }
      } else {
        extract();
        lastExtractTime = now;
      }
    }
    rafId = requestAnimationFrame(tick);
  }
  if (source instanceof HTMLImageElement) {
    if (source.complete && source.naturalWidth) {
      extract();
    } else {
      const onLoad = () => {
        extract();
        source.removeEventListener("load", onLoad);
      };
      source.addEventListener("load", onLoad);
      cleanups.push(() => source.removeEventListener("load", onLoad));
    }
    mutationObserver = new MutationObserver(() => {
      if (source.complete && source.naturalWidth) {
        extract();
      } else {
        const onLoad = () => {
          extract();
          source.removeEventListener("load", onLoad);
        };
        source.addEventListener("load", onLoad);
      }
    });
    mutationObserver.observe(source, {
      attributes: true,
      attributeFilter: ["src", "srcset"]
    });
  } else if (source instanceof HTMLVideoElement) {
    rafId = requestAnimationFrame(tick);
    const onSeeked = () => {
      if (!stopped) extract();
    };
    source.addEventListener("seeked", onSeeked);
    cleanups.push(() => source.removeEventListener("seeked", onSeeked));
  } else {
    rafId = requestAnimationFrame(tick);
  }
  return {
    stop() {
      stopped = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      for (const fn of cleanups) fn();
      cleanups.length = 0;
    }
  };
}

// src/index.ts
init_color();
export {
  configure,
  createColor,
  getColor,
  getColorSync,
  getPalette,
  getPaletteProgressive,
  getPaletteSync,
  getSwatches,
  getSwatchesSync,
  observe
};
//# sourceMappingURL=index.browser.js.map