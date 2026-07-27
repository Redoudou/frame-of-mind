import type { FramePreset, OrientationSetting, Photo, Recommendation } from "../types";
import { QUALITY_TEXT, fmtIn, orientPreset } from "../logic";

type Props = {
  photo: Photo;
  recommendations: Recommendation[];
  presets: FramePreset[];
  orientationSetting: OrientationSetting;
  selectedId: string | null;
  onSelect: (presetId: string) => void;
};

const RANK_LABELS = ["Recommended", "Alternative", "Alternative"];

export function RecommendationPanel({
  photo,
  recommendations,
  presets,
  orientationSetting,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div className="rec-panel">
      {recommendations.map((rec, i) => {
        const preset = presets.find((p) => p.id === rec.framePresetId);
        if (!preset) return null;
        const spec = orientPreset(preset, photo.analysis, orientationSetting);
        const unitLabel = preset.unit;
        const d = (vIn: number) => fmtIn(unitLabel === "cm" ? vIn * 2.54 : vIn);
        const active = selectedId === preset.id;
        return (
          <button
            key={preset.id}
            className={`rec-card ${active ? "active" : ""}`}
            onClick={() => onSelect(preset.id)}
          >
            <div className="rec-card-top">
              <span className={`rec-rank ${i === 0 ? "primary" : ""}`}>{RANK_LABELS[i]}</span>
              <span className={`ppi-chip ppi-${rec.qualityLabel}`}>
                {rec.effectivePpi} PPI · {QUALITY_TEXT[rec.qualityLabel]}
              </span>
            </div>
            <div className="rec-title">
              {d(spec.frameW)} × {d(spec.frameH)} {unitLabel} frame
            </div>
            <div className="rec-meta">
              Mat opening {d(spec.openW)} × {d(spec.openH)} · print {d(spec.printW)} × {d(spec.printH)} ·{" "}
              {spec.orientation} · crops {rec.cropPercent.toFixed(1)}%
            </div>
            <div className="rec-explanation">{rec.explanation}</div>
            {rec.qualityLabel === "low" && (
              <div className="rec-warning">⚠ Below 180 PPI — the print may look soft at this size.</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
