import type {
  CropWindow,
  FramePreset,
  MatColor,
  OrientationSetting,
  OrientedSpec,
  Photo,
  PhotoAnalysis,
  PrintOrder,
  QualityLabel,
  Recommendation,
  Transform,
} from "./types";

export const MAT_OVERLAP_IN = 0.25; // mat opening covers ~1/8 in of the print per side

export function toInches(value: number, unit: "in" | "cm"): number {
  return unit === "cm" ? value / 2.54 : value;
}

export function analyzeImage(width: number, height: number): PhotoAnalysis {
  const aspectRatio = width / height;
  const orientation = Math.abs(aspectRatio - 1) < 0.01 ? "square" : aspectRatio > 1 ? "landscape" : "portrait";
  return { pixelWidth: width, pixelHeight: height, aspectRatio, orientation };
}

/**
 * Resolve a (portrait-normalized) preset into concrete inch dimensions for the
 * orientation that matches the photo, or the user's explicit override.
 */
export function orientPreset(
  preset: FramePreset,
  photo: PhotoAnalysis,
  setting: OrientationSetting,
): OrientedSpec {
  const target =
    setting !== "auto" ? setting : photo.orientation === "landscape" ? "landscape" : "portrait";
  const flip = target === "landscape";
  const dims = {
    frameW: toInches(flip ? preset.frameHeight : preset.frameWidth, preset.unit),
    frameH: toInches(flip ? preset.frameWidth : preset.frameHeight, preset.unit),
    openW: toInches(flip ? preset.matOpeningHeight : preset.matOpeningWidth, preset.unit),
    openH: toInches(flip ? preset.matOpeningWidth : preset.matOpeningHeight, preset.unit),
    printW: toInches(flip ? preset.printHeight : preset.printWidth, preset.unit),
    printH: toInches(flip ? preset.printWidth : preset.printHeight, preset.unit),
  };
  return { preset, orientation: target, ...dims };
}

/**
 * Crop window in source pixels for a given print aspect ratio and user
 * transform. zoom >= 1 shrinks the window (zooms into the photo); offsets move
 * it and are clamped so the window always stays inside the source.
 */
export function computeCropWindow(
  srcW: number,
  srcH: number,
  printW: number,
  printH: number,
  t: Transform = { zoom: 1, offsetX: 0, offsetY: 0 },
): CropWindow {
  const aspect = printW / printH;
  let cw = srcW;
  let ch = srcW / aspect;
  if (ch > srcH) {
    ch = srcH;
    cw = srcH * aspect;
  }
  cw /= t.zoom;
  ch /= t.zoom;
  const cx = clamp(srcW / 2 + t.offsetX, cw / 2, srcW - cw / 2);
  const cy = clamp(srcH / 2 + t.offsetY, ch / 2, srcH - ch / 2);
  const xStart = Math.max(0, Math.round(cx - cw / 2));
  const yStart = Math.max(0, Math.round(cy - ch / 2));
  return {
    xStart,
    yStart,
    xEnd: Math.min(srcW, xStart + Math.round(cw)),
    yEnd: Math.min(srcH, yStart + Math.round(ch)),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export function cropPercentOf(crop: CropWindow, srcW: number, srcH: number): number {
  const area = (crop.xEnd - crop.xStart) * (crop.yEnd - crop.yStart);
  return (1 - area / (srcW * srcH)) * 100;
}

export function effectiveDpi(crop: CropWindow, printWIn: number): number {
  return Math.round((crop.xEnd - crop.xStart) / printWIn);
}

export function qualityLabel(dpi: number): QualityLabel {
  if (dpi >= 300) return "excellent";
  if (dpi >= 240) return "very-good";
  if (dpi >= 180) return "good";
  return "low";
}

export const QUALITY_TEXT: Record<QualityLabel, string> = {
  excellent: "Excellent",
  "very-good": "Very good",
  good: "Good",
  low: "Low",
};

function dpiScore(dpi: number): number {
  return clamp(dpi / 300, 0, 1);
}

function matScore(spec: OrientedSpec): number {
  const borderW = (spec.frameW - spec.openW) / 2;
  const borderH = (spec.frameH - spec.openH) / 2;
  const border = (borderW + borderH) / 2;
  const large = Math.max(spec.printW, spec.printH) > 10;
  const [lo, hi] = large ? [2, 3] : [1, 2];
  if (border >= lo && border <= hi) return 1;
  const dist = border < lo ? lo - border : border - hi;
  return clamp(1 - dist / 1.5, 0, 1);
}

function matBorderIn(spec: OrientedSpec): number {
  return ((spec.frameW - spec.openW) / 2 + (spec.frameH - spec.openH) / 2) / 2;
}

function explanationFor(spec: OrientedSpec, cropPct: number, dpi: number): string {
  const cropText =
    cropPct < 1
      ? "keeps virtually the whole photo"
      : cropPct < 8
        ? `crops only ${cropPct.toFixed(0)}% of the photo`
        : `crops ${cropPct.toFixed(0)}% of the photo`;
  const border = matBorderIn(spec);
  const matText =
    border < 1 ? "a slim mat border" : border <= 2 ? "a balanced mat border" : "a wide gallery-style mat";
  return `This ${fmtIn(spec.frameW)} × ${fmtIn(spec.frameH)} frame ${cropText}, prints at ${dpi} DPI (${QUALITY_TEXT[qualityLabel(dpi)].toLowerCase()}), and gives ${matText} of ${fmtIn(border)} in.`;
}

export function fmtIn(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function scoreRecommendation(photo: PhotoAnalysis, spec: OrientedSpec): Recommendation {
  const crop = computeCropWindow(photo.pixelWidth, photo.pixelHeight, spec.printW, spec.printH);
  const cropPct = cropPercentOf(crop, photo.pixelWidth, photo.pixelHeight);
  const dpi = effectiveDpi(crop, spec.printW);
  const fitScore =
    0.5 * (1 - cropPct / 100) + 0.3 * dpiScore(dpi) + 0.2 * matScore(spec);
  return {
    framePresetId: spec.preset.id,
    effectiveDpi: dpi,
    cropPercent: cropPct,
    cropWindow: crop,
    fitScore,
    qualityLabel: qualityLabel(dpi),
    explanation: explanationFor(spec, cropPct, dpi),
  };
}

/**
 * One primary + two alternatives.
 * Primary: best weighted score that is not "Low" DPI (hard rule).
 * Alternatives favor diversity: the least-cropping option and the largest
 * frame (visual impact), falling back to next-best score.
 */
export function recommend(
  photo: PhotoAnalysis,
  presets: FramePreset[],
  setting: OrientationSetting,
): Recommendation[] {
  const scored = presets
    .map((p) => scoreRecommendation(photo, orientPreset(p, photo, setting)))
    .sort((a, b) => b.fitScore - a.fitScore);
  if (scored.length === 0) return [];

  const notLow = scored.filter((r) => r.qualityLabel !== "low");
  const primary = notLow[0] ?? scored[0]; // all low: still show best, UI warns

  const rest = scored.filter((r) => r !== primary);
  const picks: Recommendation[] = [primary];

  const leastCrop = [...rest].sort((a, b) => a.cropPercent - b.cropPercent)[0];
  if (leastCrop) picks.push(leastCrop);

  const frameArea = (r: Recommendation) => {
    const p = presets.find((x) => x.id === r.framePresetId)!;
    return toInches(p.frameWidth, p.unit) * toInches(p.frameHeight, p.unit);
  };
  const impact = rest
    .filter((r) => !picks.includes(r) && r.qualityLabel !== "low")
    .sort((a, b) => frameArea(b) - frameArea(a))[0];
  if (impact) picks.push(impact);

  for (const r of rest) {
    if (picks.length >= 3) break;
    if (!picks.includes(r)) picks.push(r);
  }
  return picks.slice(0, 3);
}

export function buildPrintOrder(
  photo: Photo,
  spec: OrientedSpec,
  transform: Transform,
  matColor: MatColor,
): PrintOrder {
  const crop = computeCropWindow(
    photo.analysis.pixelWidth,
    photo.analysis.pixelHeight,
    spec.printW,
    spec.printH,
    transform,
  );
  return {
    filename: photo.filename,
    printWidthIn: spec.printW,
    printHeightIn: spec.printH,
    paperWidthIn: spec.frameW,
    paperHeightIn: spec.frameH,
    orientation: spec.orientation,
    dpiAtPrintSize: effectiveDpi(crop, spec.printW),
    cropWindow: crop,
    matColor,
    visibleWidthIn: spec.openW - MAT_OVERLAP_IN,
    visibleHeightIn: spec.openH - MAT_OVERLAP_IN,
  };
}

function cmText(inches: number): string {
  return (Math.round(inches * 2.54 * 10) / 10).toFixed(1);
}

export function printOrderText(order: PrintOrder, photo: Photo): string {
  const { cropWindow: c } = order;
  const srcW = photo.analysis.pixelWidth;
  const srcH = photo.analysis.pixelHeight;
  const cropW = c.xEnd - c.xStart;
  const cropH = c.yEnd - c.yStart;
  const openingW = order.visibleWidthIn + MAT_OVERLAP_IN;
  const openingH = order.visibleHeightIn + MAT_OVERLAP_IN;
  const bleedPerSide = (order.printWidthIn - openingW) / 2;
  const lines = [
    `PRINT ORDER — ${order.filename}`,
    ``,
    `PRINT`,
    `  Image size:     ${fmtIn(order.printWidthIn)} × ${fmtIn(order.printHeightIn)} in (${cmText(order.printWidthIn)} × ${cmText(order.printHeightIn)} cm), ${order.orientation}`,
    `  Paper size:     ${fmtIn(order.paperWidthIn)} × ${fmtIn(order.paperHeightIn)} in, image centered, margins white`,
    `  Resolution:     ${order.dpiAtPrintSize} DPI at print size (${cropW} × ${cropH} px source area)`,
    ``,
    `CROP`,
    `  Source file:    ${srcW} × ${srcH} px`,
    `  Print window:   X ${c.xStart}–${c.xEnd} px, Y ${c.yStart}–${c.yEnd} px`,
    `  Do not auto-crop, auto-rotate, resize, or color-correct.`,
    `  Print exactly the pixel window above.`,
    ``,
    `FRAMING (for reference, not for the printer)`,
    `  Frame:          ${fmtIn(order.paperWidthIn)} × ${fmtIn(order.paperHeightIn)} in`,
    `  Mat opening:    ${fmtIn(openingW)} × ${fmtIn(openingH)} in, ${order.matColor}`,
    `  Visible area:   ${fmtIn(order.visibleWidthIn)} × ${fmtIn(order.visibleHeightIn)} in after mat overlap`,
  ];
  if (bleedPerSide > 0.001) {
    lines.push(
      `  Print bleed:    print is ${fmtIn(bleedPerSide)} in larger than the mat opening on each side`,
    );
  }
  return lines.join("\n");
}
