import { analyzeImage } from "./logic";
import type { Photo } from "./types";

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

const SUPPORTED = /\.(jpe?g|png|webp|heic|heif)$/i;

export function isSupportedFile(file: File): boolean {
  return SUPPORTED.test(file.name) || /^image\/(jpeg|png|webp|heic|heif)$/.test(file.type);
}

/**
 * Load a photo fully locally. HEIC/HEIF files are converted to JPEG with a
 * lazily-loaded WASM decoder (heic2any) at full resolution, so the crop window
 * still references the original pixel grid.
 */
export async function loadPhoto(
  file: File,
  onStatus: (msg: string) => void,
): Promise<Photo> {
  let blob: Blob = file;
  if (isHeic(file)) {
    onStatus("Converting iPhone photo…");
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
    blob = Array.isArray(converted) ? converted[0] : converted;
  }
  onStatus("Reading photo…");
  return photoFromBlob(blob, file.name);
}

/** Build a Photo from already-decoded image data (upload path and recents). */
export async function photoFromBlob(blob: Blob, filename: string): Promise<Photo> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not decode ${filename}`));
      img.src = url;
    });
    return {
      filename,
      image,
      analysis: analyzeImage(image.naturalWidth, image.naturalHeight),
      blob,
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}
