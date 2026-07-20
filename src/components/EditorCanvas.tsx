import { useEffect, useRef } from "react";
import type { CropWindow, MatColor, OrientedSpec, Photo, Transform } from "../types";
import { drawFramed, type FrameLayout } from "../render";

type Props = {
  photo: Photo;
  spec: OrientedSpec;
  matColor: MatColor;
  crop: CropWindow;
  transform: Transform;
  onTransform: (t: Transform) => void;
};

/**
 * Interactive photo-behind-mat view. The mat is translucent so the parts of
 * the photo hidden behind it stay visible but shaded. Drag repositions,
 * wheel / pinch zooms.
 */
export function EditorCanvas({ photo, spec, matColor, crop, transform, onTransform }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<FrameLayout | null>(null);
  const cropRef = useRef(crop);
  const transformRef = useRef(transform);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  cropRef.current = crop;
  transformRef.current = transform;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      layoutRef.current = drawFramed(canvas, {
        spec,
        matColor,
        image: photo.image,
        crop,
        mode: "editor",
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [photo, spec, matColor, crop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const t = transformRef.current;
      const zoom = Math.min(4, Math.max(1, t.zoom * Math.exp(-e.deltaY * 0.0018)));
      onTransform({ ...t, zoom });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [onTransform]);

  const srcPerCss = () => {
    const L = layoutRef.current;
    const c = cropRef.current;
    if (!L) return 1;
    return (c.xEnd - c.xStart) / (spec.printW * L.scale); // source px per canvas css px
  };

  return (
    <canvas
      ref={canvasRef}
      className="editor-canvas"
      onPointerDown={(e) => {
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        dragRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        const k = srcPerCss();
        const dx = (e.clientX - dragRef.current.x) * k;
        const dy = (e.clientY - dragRef.current.y) * k;
        dragRef.current = { x: e.clientX, y: e.clientY };
        const t = transformRef.current;
        // Dragging the photo right moves the crop window left.
        onTransform({ ...t, offsetX: t.offsetX - dx, offsetY: t.offsetY - dy });
      }}
      onPointerUp={(e) => {
        dragRef.current = null;
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
    />
  );
}
