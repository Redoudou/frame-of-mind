import type { FramePreset } from "./types";

/**
 * Standard presets, stored portrait-normalized (width <= height).
 * They are flipped to landscape at scoring/render time when needed.
 */
export const DEFAULT_PRESETS: FramePreset[] = [
  {
    id: "std-8x10",
    name: '8 × 10 frame · 5 × 7 mat',
    frameWidth: 8,
    frameHeight: 10,
    matOpeningWidth: 5,
    matOpeningHeight: 7,
    printWidth: 5,
    printHeight: 7,
    unit: "in",
  },
  {
    id: "std-11x14",
    name: '11 × 14 frame · 8 × 10 mat',
    frameWidth: 11,
    frameHeight: 14,
    matOpeningWidth: 8,
    matOpeningHeight: 10,
    printWidth: 8,
    printHeight: 10,
    unit: "in",
  },
  {
    id: "std-12x16",
    name: '12 × 16 frame · 8 × 12 mat',
    frameWidth: 12,
    frameHeight: 16,
    matOpeningWidth: 8,
    matOpeningHeight: 12,
    printWidth: 8,
    printHeight: 12,
    unit: "in",
  },
  {
    id: "std-16x20",
    name: '16 × 20 frame · 11 × 14 mat',
    frameWidth: 16,
    frameHeight: 20,
    matOpeningWidth: 11,
    matOpeningHeight: 14,
    printWidth: 11,
    printHeight: 14,
    unit: "in",
  },
  {
    id: "std-20x24",
    name: '20 × 24 frame · 16 × 20 mat',
    frameWidth: 20,
    frameHeight: 24,
    matOpeningWidth: 16,
    matOpeningHeight: 20,
    printWidth: 16,
    printHeight: 20,
    unit: "in",
  },
  {
    id: "std-12x12",
    name: '12 × 12 square · 8 × 8 mat',
    frameWidth: 12,
    frameHeight: 12,
    matOpeningWidth: 8,
    matOpeningHeight: 8,
    printWidth: 8,
    printHeight: 8,
    unit: "in",
  },
  {
    id: "std-16x16",
    name: '16 × 16 square · 12 × 12 mat',
    frameWidth: 16,
    frameHeight: 16,
    matOpeningWidth: 12,
    matOpeningHeight: 12,
    printWidth: 12,
    printHeight: 12,
    unit: "in",
  },
];

const STORAGE_KEY = "photoformat.customPresets.v1";

export function loadCustomPresets(): FramePreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is FramePreset =>
        p &&
        typeof p.id === "string" &&
        [p.frameWidth, p.frameHeight, p.matOpeningWidth, p.matOpeningHeight, p.printWidth, p.printHeight].every(
          (n) => typeof n === "number" && n > 0,
        ),
    );
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: FramePreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.filter((p) => p.custom)));
}
