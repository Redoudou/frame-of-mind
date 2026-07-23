import { photoFromBlob } from "./loadPhoto";
import type { Photo } from "./types";

/**
 * Generates the demo photo entirely in the browser: a 4032 × 3024 dusk
 * lake scene (typical iPhone resolution, so DPI and crop numbers look real).
 * No image asset is shipped and nothing is downloaded.
 */
export async function generateDemoPhoto(): Promise<Photo> {
  const W = 4032;
  const H = 3024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const horizon = H * 0.62;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#1f2a52");
  sky.addColorStop(0.45, "#7a5a8c");
  sky.addColorStop(0.78, "#e8926b");
  sky.addColorStop(1, "#f6c17c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);

  // Sun and glow
  const sunX = W * 0.63;
  const sunY = horizon * 0.82;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, W * 0.28);
  glow.addColorStop(0, "rgba(255,236,190,0.9)");
  glow.addColorStop(0.25, "rgba(255,200,140,0.35)");
  glow.addColorStop(1, "rgba(255,200,140,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, horizon);
  ctx.fillStyle = "#fff3d0";
  ctx.beginPath();
  ctx.arc(sunX, sunY, W * 0.035, 0, Math.PI * 2);
  ctx.fill();

  // Mountain layers (deterministic sine ridges)
  const layers = [
    { base: horizon * 0.72, amp: H * 0.1, freq: 1.7, phase: 0.8, color: "#4a3f66" },
    { base: horizon * 0.85, amp: H * 0.08, freq: 2.6, phase: 2.4, color: "#37304f" },
    { base: horizon * 0.97, amp: H * 0.055, freq: 3.9, phase: 4.9, color: "#241f38" },
  ];
  for (const m of layers) {
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let x = 0; x <= W; x += 8) {
      const t = (x / W) * Math.PI * 2;
      const y =
        m.base -
        m.amp * (0.6 * Math.sin(t * m.freq + m.phase) + 0.4 * Math.sin(t * m.freq * 2.3 + m.phase * 1.7));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, horizon);
    ctx.closePath();
    ctx.fill();
  }

  // Water
  const water = ctx.createLinearGradient(0, horizon, 0, H);
  water.addColorStop(0, "#d89a6e");
  water.addColorStop(0.35, "#6b5378");
  water.addColorStop(1, "#1c2340");
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, W, H - horizon);

  // Sun reflection: broken horizontal streaks narrowing toward the viewer
  ctx.fillStyle = "rgba(255,226,170,0.55)";
  for (let i = 0; i < 42; i++) {
    const p = i / 42;
    const y = horizon + p * (H - horizon) * 0.85;
    const width = W * 0.02 + p * W * 0.1;
    const wobble = Math.sin(i * 2.7) * W * 0.012;
    const h = H * 0.004 + p * H * 0.006;
    ctx.globalAlpha = 0.55 * (1 - p * 0.6);
    ctx.fillRect(sunX - width / 2 + wobble, y, width, h);
  }
  ctx.globalAlpha = 1;

  // Gentle ripple bands across the whole water
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 26; i++) {
    const y = horizon + ((i + 0.5) / 26) * (H - horizon);
    ctx.fillRect(0, y, W, H * 0.0025);
  }

  // Vignette for a photographic feel
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(10,8,20,0.32)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create demo photo"))), "image/jpeg", 0.92),
  );
  return photoFromBlob(blob, "demo-photo.jpg");
}
