import { execFile } from "node:child_process";
import { promisify } from "node:util";

const SAMPLE_W = 48;
const SAMPLE_H = 27;
const HUE_BINS = 12;
/** Below this share of saturated pixels the still is effectively monochrome: no tint. */
const MIN_COLOURFUL = 0.06;

const hex2 = (n) => Math.round(n).toString(16).padStart(2, "0");

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [((h * 60) + 360) % 360, s, l];
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${hex2((r + m) * 255)}${hex2((g + m) * 255)}${hex2((b + m) * 255)}`;
}

/**
 * The still's dominant *colourful* hue as a hex that glows on black, or null for near-monochrome
 * stills. `rgb` is packed 8-bit RGB. Pixels vote for a hue bin weighted by saturation (so a big
 * grey sky loses to a small neon sign); the winning bin's mean hue is then pushed to a lightness
 * and saturation that reads as a tint rather than a smear.
 */
export function dominantTint(rgb) {
  const bins = Array.from({ length: HUE_BINS }, () => ({ w: 0, sin: 0, cos: 0 }));
  let colourful = 0;
  const n = Math.floor(rgb.length / 3);
  for (let i = 0; i < n; i++) {
    const [h, s, l] = rgbToHsl(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
    // Near-black and near-white pixels carry no usable hue.
    if (s < 0.15 || l < 0.08 || l > 0.92) continue;
    colourful++;
    const w = s * (1 - Math.abs(l - 0.5));
    const bin = bins[Math.floor(h / (360 / HUE_BINS)) % HUE_BINS];
    bin.w += w;
    const rad = (h * Math.PI) / 180;
    bin.sin += Math.sin(rad) * w;
    bin.cos += Math.cos(rad) * w;
  }
  if (n === 0 || colourful / n < MIN_COLOURFUL) return null;
  const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
  const hue = ((Math.atan2(best.sin, best.cos) * 180) / Math.PI + 360) % 360;
  return hslToHex(hue, 0.62, 0.5);
}

/** Dominant tint of an image file. Needs ImageMagick. */
export async function tintOf(file) {
  const { stdout } = await promisify(execFile)(
    "magick",
    [file, "-resize", `${SAMPLE_W}x${SAMPLE_H}!`, "-depth", "8", "rgb:-"],
    { encoding: "buffer", maxBuffer: 1 << 20 },
  );
  return dominantTint(stdout);
}
