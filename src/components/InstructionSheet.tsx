import { useMemo, useState } from "react";
import type { OrientedSpec, Photo, PrintOrder } from "../types";
import { printOrderText } from "../logic";
import { renderCropDataUrl, renderFramedDataUrl, renderThumbDataUrl } from "../render";

type Props = {
  order: PrintOrder;
  photo: Photo;
  spec: OrientedSpec;
  onClose: () => void;
};

export function InstructionSheet({ order, photo, spec, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => printOrderText(order, photo), [order, photo]);

  const images = useMemo(
    () => ({
      thumb: renderThumbDataUrl(photo.image),
      framed: renderFramedDataUrl({
        spec,
        matColor: order.matColor,
        image: photo.image,
        crop: order.cropWindow,
      }),
      crop: renderCropDataUrl(photo.image, order.cropWindow),
    }),
    [photo, spec, order],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can be unavailable outside secure contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="sheet-overlay">
      <div className="sheet-page">
        <div className="sheet-toolbar no-print">
          <button className="btn" onClick={onClose}>
            ← Back
          </button>
          <div className="sheet-toolbar-right">
            <button className="btn" onClick={copy}>
              {copied ? "Copied ✓" : "Copy as text"}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              Print sheet
            </button>
          </div>
        </div>

        <pre className="sheet-text">{text}</pre>

        <div className="sheet-attachments">
          <figure>
            <img src={images.thumb} alt="Original photo" />
            <figcaption>Original photo</figcaption>
          </figure>
          <figure>
            <img src={images.framed} alt="Framed preview" />
            <figcaption>Framed preview</figcaption>
          </figure>
          <figure>
            <img src={images.crop} alt="Crop window on original" />
            <figcaption>Exact print window on the original</figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
