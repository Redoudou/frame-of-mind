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
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistRef = useRef<number | null>(null);
  cropRef.current = crop;
  transformRef.current = transform;

  const pinchDistance = () => {
    const pts = [...pointersRef.current.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

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
        try {
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        } catch {
          /* capture is best-effort; drag still works without it */
        }
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointersRef.current.size === 2) {
          // Second finger down: switch from drag to pinch.
          dragRef.current = null;
          pinchDistRef.current = pinchDistance();
        } else {
          dragRef.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onPointerMove={(e) => {
        if (pointersRef.current.has(e.pointerId)) {
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        const t = transformRef.current;
        if (pointersRef.current.size === 2 && pinchDistRef.current) {
          const dist = pinchDistance();
          const zoom = Math.min(4, Math.max(1, t.zoom * (dist / pinchDistRef.current)));
          pinchDistRef.current = dist;
          onTransform({ ...t, zoom });
          return;
        }
        if (!dragRef.current) return;
        const k = srcPerCss();
        const dx = (e.clientX - dragRef.current.x) * k;
        const dy = (e.clientY - dragRef.current.y) * k;
        dragRef.current = { x: e.clientX, y: e.clientY };
        // Dragging the photo right moves the crop window left.
        onTransform({ ...t, offsetX: t.offsetX - dx, offsetY: t.offsetY - dy });
      }}
      onPointerUp={(e) => {
        pointersRef.current.delete(e.pointerId);
        pinchDistRef.current = null;
        // If one finger remains, resume dragging from its position.
        const rest = [...pointersRef.current.values()];
        dragRef.current = rest.length === 1 ? { x: rest[0].x, y: rest[0].y } : null;
        try {
          (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
        } catch {
          /* not captured */
        }
      }}
      onPointerCancel={(e) => {
        pointersRef.current.delete(e.pointerId);
        pinchDistRef.current = null;
        dragRef.current = null;
      }}
    />
  );
}
