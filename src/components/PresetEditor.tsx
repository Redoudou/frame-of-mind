import { useState } from "react";
import type { FramePreset, Unit } from "../types";

type Props = {
  preset: FramePreset;
  onChange: (preset: FramePreset) => void;
  onSaveCustom: (preset: FramePreset) => void;
  onDeleteCustom: (id: string) => void;
};

type NumField = Extract<
  keyof FramePreset,
  "frameWidth" | "frameHeight" | "matOpeningWidth" | "matOpeningHeight" | "printWidth" | "printHeight"
>;

const FIELDS: { key: NumField; label: string }[] = [
  { key: "frameWidth", label: "Frame W" },
  { key: "frameHeight", label: "Frame H" },
  { key: "matOpeningWidth", label: "Mat opening W" },
  { key: "matOpeningHeight", label: "Mat opening H" },
  { key: "printWidth", label: "Print W" },
  { key: "printHeight", label: "Print H" },
];

export function PresetEditor({ preset, onChange, onSaveCustom, onDeleteCustom }: Props) {
  const [name, setName] = useState("");

  const set = (key: NumField, raw: string) => {
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v <= 0) return;
    onChange({ ...preset, [key]: v });
  };

  return (
    <div className="preset-editor">
      <div className="preset-grid">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="preset-field">
            <span>{label}</span>
            <input
              type="number"
              min={0.5}
              step={0.25}
              value={preset[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <label className="preset-field">
          <span>Unit</span>
          <select
            value={preset.unit}
            onChange={(e) => onChange({ ...preset, unit: e.target.value as Unit })}
          >
            <option value="in">inches</option>
            <option value="cm">cm</option>
          </select>
        </label>
      </div>
      <div className="preset-actions">
        <input
          type="text"
          placeholder="Custom preset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="btn"
          disabled={!name.trim()}
          onClick={() => {
            onSaveCustom({
              ...preset,
              id: `custom-${Date.now().toString(36)}`,
              name: name.trim(),
              custom: true,
            });
            setName("");
          }}
        >
          Save preset
        </button>
        {preset.custom && (
          <button className="btn btn-danger" onClick={() => onDeleteCustom(preset.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
