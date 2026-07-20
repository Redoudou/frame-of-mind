import { useEffect, useRef } from "react";
import type { CropWindow, MatColor, OrientedSpec, Photo } from "../types";
import { drawCropPreview, drawFramed } from "../render";

export function FramePreview({
  photo,
  spec,
  matColor,
  crop,
}: {
  photo: Photo;
  spec: OrientedSpec;
  matColor: MatColor;
  crop: CropWindow;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () =>
      drawFramed(canvas, { spec, matColor, image: photo.image, crop, mode: "preview", background: "#dcd7cf" });
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [photo, spec, matColor, crop]);
  return <canvas ref={ref} className="frame-preview-canvas" />;
}

export function CropPreview({ photo, crop }: { photo: Photo; crop: CropWindow }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => drawCropPreview(canvas, photo.image, crop);
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [photo, crop]);
  return <canvas ref={ref} className="crop-preview-canvas" />;
}
