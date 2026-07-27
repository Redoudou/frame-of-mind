import type { FramePreset, OrientationSetting, Photo, Unit } from "../types";
import { MAT_OVERLAP_IN, QUALITY_TEXT, fmtIn, orientPreset, scoreRecommendation } from "../logic";

type Props = {
  photo: Photo;
  frame: FramePreset;
  orientationSetting: OrientationSetting;
  active: boolean;
  onChange: (frame: FramePreset) => void;
  onUse: () => void;
};

/** Per-side print bleed options, in the preset's unit. */
/** Standard print-shop bleed: 1/8 in per side (≈3 mm for cm presets). */
export const STANDARD_BLEED: Record<"in" | "cm", number> = { in: 0.125, cm: 0.3 };

function bleedOptions(unit: "in" | "cm"): { value: number; label: string }[] {
  // Labels show both inches and millimeters — print shops use either.
  return unit === "in"
    ? [
        { value: 0, label: "Same as opening — no bleed" },
        { value: 0.125, label: "+⅛ in (3.2 mm) per side — standard" },
        { value: 0.25, label: "+¼ in (6.4 mm) per side" },
        { value: 0.5, label: "+½ in (12.7 mm) per side" },
      ]
    : [
        { value: 0, label: "Same as opening — no bleed" },
        { value: 0.3, label: "+3 mm (≈⅛ in) per side — standard" },
        { value: 0.5, label: "+5 mm (≈0.2 in) per side" },
        { value: 1, label: "+10 mm (≈0.4 in) per side" },
      ];
}

/**
 * "I already have this frame" mode: enter frame + mat opening, get the best
 * print spec for the loaded photo. Print size is the mat opening plus an
 * optional bleed, so extra image (not white paper) hides behind the mat.
 */
export function CustomFrameCard({ photo, frame, orientationSetting, active, onChange, onUse }: Props) {
  // Bleed is derived, not stored: print = opening + 2 × bleed per side.
  const bleed = Math.max(0, (frame.printWidth - frame.matOpeningWidth) / 2);

  const set = (patch: Partial<FramePreset>, nextBleed = bleed) => {
    const next = { ...frame, ...patch };
    next.printWidth = next.matOpeningWidth + 2 * nextBleed;
    next.printHeight = next.matOpeningHeight + 2 * nextBleed;
    onChange(next);
  };

  const num = (key: "frameWidth" | "frameHeight" | "matOpeningWidth" | "matOpeningHeight") => (
    <input
      type="number"
      min={1}
      step={0.5}
      value={frame[key]}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v) && v > 0) set({ [key]: v });
      }}
    />
  );

  const invalid =
    frame.matOpeningWidth >= frame.frameWidth ||
    frame.matOpeningHeight >= frame.frameHeight ||
    frame.printWidth > frame.frameWidth ||
    frame.printHeight > frame.frameHeight;

  const spec = orientPreset(frame, photo.analysis, orientationSetting);
  const rec = invalid ? null : scoreRecommendation(photo.analysis, spec);
  const d = (vIn: number) => fmtIn(frame.unit === "cm" ? vIn * 2.54 : vIn);

  return (
    <div className={`custom-frame-card ${active ? "active" : ""}`}>
      <div className="custom-frame-inputs">
        <label className="preset-field">
          <span>Frame W × H</span>
          <div className="dim-pair">
            {num("frameWidth")}
            <span className="dim-x">×</span>
            {num("frameHeight")}
          </div>
        </label>
        <label className="preset-field">
          <span>Mat opening W × H</span>
          <div className="dim-pair">
            {num("matOpeningWidth")}
            <span className="dim-x">×</span>
            {num("matOpeningHeight")}
          </div>
        </label>
        <label className="preset-field">
          <span>Unit</span>
          <select
            value={frame.unit}
            onChange={(e) => {
              const unit = e.target.value as Unit;
              set({ unit }, STANDARD_BLEED[unit]);
            }}
          >
            <option value="in">inches</option>
            <option value="cm">cm</option>
          </select>
        </label>
        <label className="preset-field bleed-field">
          <span>Print size vs. opening (bleed hidden behind mat)</span>
          <select
            value={String(bleed)}
            onChange={(e) => set({}, parseFloat(e.target.value))}
          >
            {bleedOptions(frame.unit).map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {invalid ? (
        <div className="rec-warning">
          {frame.printWidth > frame.frameWidth || frame.printHeight > frame.frameHeight
            ? "Print (opening + bleed) must fit on the paper, which is cut to the frame size."
            : "Mat opening must be smaller than the frame."}
        </div>
      ) : (
        rec && (
          <>
            <div className="custom-frame-spec">
              <div className="rec-card-top">
                <span className="rec-rank">
                  Best spec — {d(spec.frameW)} × {d(spec.frameH)} {frame.unit}, {spec.orientation}
                </span>
                <span className={`ppi-chip ppi-${rec.qualityLabel}`}>
                  {rec.effectivePpi} PPI · {QUALITY_TEXT[rec.qualityLabel]}
                </span>
              </div>
              <div className="rec-meta">
                Print {d(spec.printW)} × {d(spec.printH)} on {d(spec.frameW)} × {d(spec.frameH)} paper ·
                crops {rec.cropPercent.toFixed(1)}% · visible {fmtIn(spec.openW - MAT_OVERLAP_IN)} ×{" "}
                {fmtIn(spec.openH - MAT_OVERLAP_IN)} in after mat overlap
              </div>
              {rec.qualityLabel === "low" && (
                <div className="rec-warning">
                  ⚠ Below 180 PPI — this photo is too small for that opening; the print may look soft.
                </div>
              )}
            </div>
            <button className={`btn ${active ? "" : "btn-primary"}`} onClick={onUse} disabled={active}>
              {active ? "In use — adjust position on the left" : "Use this frame"}
            </button>
          </>
        )
      )}
    </div>
  );
}
