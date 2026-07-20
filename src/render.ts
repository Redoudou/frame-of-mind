import type { CropWindow, MatColor, OrientedSpec } from "./types";
import { MAT_OVERLAP_IN } from "./logic";

export const MAT_COLORS: Record<MatColor, string> = {
  white: "#f7f5f0",
  cream: "#f3ecd9",
  black: "#20201e",
};

const MOLDING_IN = 0.75;

export type FrameLayout = {
  scale: number; // canvas px per inch
  frame: Rect; // paper/mat area (frame interior)
  opening: Rect; // mat opening
  visible: Rect; // opening minus mat overlap
  outer: Rect; // including molding
};

type Rect = { x: number; y: number; w: number; h: number };

export function layoutFrame(
  canvasW: number,
  canvasH: number,
  spec: OrientedSpec,
  pad = 24,
): FrameLayout {
  const totalW = spec.frameW + 2 * MOLDING_IN;
  const totalH = spec.frameH + 2 * MOLDING_IN;
  const scale = Math.min((canvasW - pad * 2) / totalW, (canvasH - pad * 2) / totalH);
  const outer: Rect = {
    x: (canvasW - totalW * scale) / 2,
    y: (canvasH - totalH * scale) / 2,
    w: totalW * scale,
    h: totalH * scale,
  };
  const m = MOLDING_IN * scale;
  const frame: Rect = { x: outer.x + m, y: outer.y + m, w: spec.frameW * scale, h: spec.frameH * scale };
  const opening: Rect = {
    x: frame.x + ((spec.frameW - spec.openW) / 2) * scale,
    y: frame.y + ((spec.frameH - spec.openH) / 2) * scale,
    w: spec.openW * scale,
    h: spec.openH * scale,
  };
  const ov = (MAT_OVERLAP_IN / 2) * scale;
  const visible: Rect = {
    x: opening.x + ov,
    y: opening.y + ov,
    w: opening.w - 2 * ov,
    h: opening.h - 2 * ov,
  };
  return { scale, frame, opening, visible, outer };
}

export type DrawFramedOptions = {
  spec: OrientedSpec;
  matColor: MatColor;
  image: HTMLImageElement;
  crop: CropWindow;
  /** editor: translucent mat so hidden photo areas show shaded; preview: opaque realistic render */
  mode: "editor" | "preview";
  background?: string;
};

/** Draws the framed photo. Returns the layout so callers can hit-test the opening. */
export function drawFramed(canvas: HTMLCanvasElement, opts: DrawFramedOptions): FrameLayout {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { spec, matColor, image, crop, mode } = opts;
  const L = layoutFrame(cssW, cssH, spec);
  const { frame, opening, outer } = L;

  ctx.clearRect(0, 0, cssW, cssH);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  if (mode === "preview") {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#3a352f";
    ctx.fillRect(outer.x, outer.y, outer.w, outer.h);
    ctx.restore();
  }

  // Photo mapped so the crop window exactly fills the printed area, which is
  // centered on the mat opening and may bleed behind the mat (print > opening).
  const cropW = crop.xEnd - crop.xStart;
  const printRect = {
    x: opening.x + opening.w / 2 - (spec.printW * L.scale) / 2,
    y: opening.y + opening.h / 2 - (spec.printH * L.scale) / 2,
    w: spec.printW * L.scale,
    h: spec.printH * L.scale,
  };
  const s = printRect.w / cropW; // uniform: crop aspect == print aspect
  const imgX = printRect.x - crop.xStart * s;
  const imgY = printRect.y - crop.yStart * s;
  const imgW = image.naturalWidth * s;
  const imgH = image.naturalHeight * s;

  ctx.save();
  // The print sheet is paper-sized; nothing shows outside the frame interior.
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
  ctx.drawImage(image, imgX, imgY, imgW, imgH);

  // Mat with the opening punched out.
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.rect(opening.x, opening.y, opening.w, opening.h);
  ctx.globalAlpha = mode === "editor" ? 0.82 : 1;
  ctx.fillStyle = MAT_COLORS[matColor];
  ctx.fill("evenodd");
  ctx.globalAlpha = 1;

  // Mat bevel around the opening.
  ctx.strokeStyle = matColor === "black" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(opening.x, opening.y, opening.w, opening.h);
  ctx.restore();

  // Molding.
  const grad = ctx.createLinearGradient(outer.x, outer.y, outer.x + outer.w, outer.y + outer.h);
  grad.addColorStop(0, "#4a423a");
  grad.addColorStop(0.5, "#2e2924");
  grad.addColorStop(1, "#443c34");
  ctx.beginPath();
  ctx.rect(outer.x, outer.y, outer.w, outer.h);
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.fillStyle = grad;
  ctx.fill("evenodd");
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(frame.x - 0.5, frame.y - 0.5, frame.w + 1, frame.h + 1);

  return L;
}

/** Original photo with the crop window highlighted; everything outside dimmed. */
export function drawCropPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  crop: CropWindow,
): void {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const s = Math.min(cssW / iw, cssH / ih);
  const x = (cssW - iw * s) / 2;
  const y = (cssH - ih * s) / 2;

  ctx.clearRect(0, 0, cssW, cssH);
  ctx.drawImage(image, x, y, iw * s, ih * s);
  ctx.fillStyle = "rgba(10,10,12,0.62)";
  ctx.beginPath();
  ctx.rect(x, y, iw * s, ih * s);
  ctx.rect(x + crop.xStart * s, y + crop.yStart * s, (crop.xEnd - crop.xStart) * s, (crop.yEnd - crop.yStart) * s);
  ctx.fill("evenodd");
  ctx.strokeStyle = "#ff5c39";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    x + crop.xStart * s,
    y + crop.yStart * s,
    (crop.xEnd - crop.xStart) * s,
    (crop.yEnd - crop.yStart) * s,
  );
}

/** Render helpers for the instruction sheet attachments (offscreen, fixed size). */
export function renderFramedDataUrl(opts: Omit<DrawFramedOptions, "mode">): string {
  const canvas = document.createElement("canvas");
  const aspect = (opts.spec.frameH + 2 * MOLDING_IN) / (opts.spec.frameW + 2 * MOLDING_IN);
  const w = 640;
  const h = Math.round(w * Math.max(0.6, Math.min(1.8, aspect)));
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  drawFramed(canvas, { ...opts, mode: "preview", background: "#e8e4de" });
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function renderCropDataUrl(image: HTMLImageElement, crop: CropWindow): string {
  const canvas = document.createElement("canvas");
  const s = Math.min(640 / image.naturalWidth, 640 / image.naturalHeight);
  canvas.width = Math.round(image.naturalWidth * s);
  canvas.height = Math.round(image.naturalHeight * s);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  drawCropPreview(canvas, image, crop);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function renderThumbDataUrl(image: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  const s = Math.min(480 / image.naturalWidth, 480 / image.naturalHeight, 1);
  canvas.width = Math.round(image.naturalWidth * s);
  canvas.height = Math.round(image.naturalHeight * s);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}
