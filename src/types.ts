export type Unit = "in" | "cm";

export type FramePreset = {
  id: string;
  name: string;
  frameWidth: number;
  frameHeight: number;
  matOpeningWidth: number;
  matOpeningHeight: number;
  printWidth: number;
  printHeight: number;
  unit: Unit;
  custom?: boolean;
};

export type PhotoAnalysis = {
  pixelWidth: number;
  pixelHeight: number;
  aspectRatio: number;
  orientation: "portrait" | "landscape" | "square";
};

export type Photo = {
  filename: string;
  image: HTMLImageElement;
  analysis: PhotoAnalysis;
  blob: Blob; // decoded image data (JPEG for converted HEIC), kept for recents
};

export type CropWindow = {
  xStart: number; // px in source image
  xEnd: number;
  yStart: number;
  yEnd: number;
};

export type QualityLabel = "excellent" | "very-good" | "good" | "low";

export type Recommendation = {
  framePresetId: string;
  effectivePpi: number;
  cropPercent: number;
  cropWindow: CropWindow; // pixel-exact, feeds the instruction sheet
  fitScore: number;
  qualityLabel: QualityLabel;
  explanation: string;
};

export type MatColor = "white" | "cream" | "black";

export type OrientationSetting = "auto" | "portrait" | "landscape";

/** A preset resolved to a concrete orientation, all dimensions in inches. */
export type OrientedSpec = {
  preset: FramePreset;
  orientation: "portrait" | "landscape";
  frameW: number;
  frameH: number;
  openW: number;
  openH: number;
  printW: number;
  printH: number;
};

export type Transform = {
  zoom: number; // >= 1
  offsetX: number; // source px, 0 = centered
  offsetY: number;
};

export type PrintOrder = {
  filename: string;
  printWidthIn: number;
  printHeightIn: number;
  paperWidthIn: number;
  paperHeightIn: number;
  orientation: "portrait" | "landscape";
  ppiAtPrintSize: number;
  cropWindow: CropWindow;
  matColor: MatColor;
  visibleWidthIn: number; // after mat overlap
  visibleHeightIn: number;
};
