import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FramePreset,
  MatColor,
  OrientationSetting,
  Photo,
  Transform,
} from "./types";
import { DEFAULT_PRESETS, loadCustomPresets, saveCustomPresets } from "./presets";
import { buildPrintOrder, computeCropWindow, orientPreset, printOrderText, recommend } from "./logic";
import { loadPhoto, photoFromBlob } from "./loadPhoto";
import { recentId, saveRecent, type RecentEntry } from "./recent";
import { renderThumbDataUrl } from "./render";
import { generateDemoPhoto } from "./demo";
import { CustomFrameCard } from "./components/CustomFrameCard";
import { DropZone } from "./components/DropZone";
import { EditorCanvas } from "./components/EditorCanvas";
import { CropPreview, FramePreview } from "./components/Previews";
import { RecentPhotos } from "./components/RecentPhotos";
import { RecommendationPanel } from "./components/RecommendationPanel";
import { PresetEditor } from "./components/PresetEditor";
import { InstructionSheet } from "./components/InstructionSheet";
import "./App.css";

const IDENTITY: Transform = { zoom: 1, offsetX: 0, offsetY: 0 };

const MANUAL_ID = "manual";

const DEFAULT_MANUAL: FramePreset = {
  id: MANUAL_ID,
  name: "My own frame",
  frameWidth: 16,
  frameHeight: 20,
  matOpeningWidth: 11,
  matOpeningHeight: 14,
  printWidth: 11,
  printHeight: 14,
  unit: "in",
};

export default function App() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [presets, setPresets] = useState<FramePreset[]>(() => [
    ...DEFAULT_PRESETS,
    ...loadCustomPresets(),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manual, setManual] = useState<FramePreset>(DEFAULT_MANUAL);
  const [orientationSetting, setOrientationSetting] = useState<OrientationSetting>("auto");
  const [matColor, setMatColor] = useState<MatColor>("white");
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [showSheet, setShowSheet] = useState(false);
  const [inlineCopied, setInlineCopied] = useState(false);

  const recommendations = useMemo(
    () => (photo ? recommend(photo.analysis, presets, orientationSetting) : []),
    [photo, presets, orientationSetting],
  );

  // Adopt the primary recommendation when nothing valid is selected.
  useEffect(() => {
    if (!photo || recommendations.length === 0) return;
    if (selectedId === MANUAL_ID) return;
    if (!selectedId || !presets.some((p) => p.id === selectedId)) {
      setSelectedId(recommendations[0].framePresetId);
    }
  }, [photo, recommendations, presets, selectedId]);

  const selectedPreset =
    selectedId === MANUAL_ID ? manual : (presets.find((p) => p.id === selectedId) ?? null);
  const spec =
    photo && selectedPreset ? orientPreset(selectedPreset, photo.analysis, orientationSetting) : null;
  const crop =
    photo && spec
      ? computeCropWindow(
          photo.analysis.pixelWidth,
          photo.analysis.pixelHeight,
          spec.printW,
          spec.printH,
          transform,
        )
      : null;

  const adoptPhoto = useCallback((p: Photo) => {
    setPhoto(p);
    setTransform(IDENTITY);
    setSelectedId(null); // re-adopt the new primary recommendation
    setShowSheet(false);
    // Remember it (fire-and-forget; recents are a convenience, not critical).
    saveRecent({
      id: recentId(p.filename, p.analysis.pixelWidth, p.analysis.pixelHeight),
      filename: p.filename,
      width: p.analysis.pixelWidth,
      height: p.analysis.pixelHeight,
      addedAt: Date.now(),
      thumb: renderThumbDataUrl(p.image),
      blob: p.blob,
    }).catch(() => {});
  }, []);

  const onFile = useCallback(
    async (file: File) => {
      setLoadError(null);
      try {
        adoptPhoto(await loadPhoto(file, setStatus));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setStatus(null);
      }
    },
    [adoptPhoto],
  );

  const onDemo = useCallback(async () => {
    setLoadError(null);
    setStatus("Creating demo photo…");
    try {
      adoptPhoto(await generateDemoPhoto());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus(null);
    }
  }, [adoptPhoto]);

  // ?demo loads the app pre-filled with the generated sample photo;
  // ?demo=order additionally opens the resulting print-order sheet.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("demo")) {
      onDemo().then(() => {
        if (params.get("demo") === "order") setShowSheet(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const onOpenRecent = useCallback(
    async (entry: RecentEntry) => {
      setLoadError(null);
      setStatus("Reading photo…");
      try {
        adoptPhoto(await photoFromBlob(entry.blob, entry.filename));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setStatus(null);
      }
    },
    [adoptPhoto],
  );

  const selectPreset = (id: string) => {
    setSelectedId(id);
    setTransform(IDENTITY);
  };

  const updatePreset = (p: FramePreset) => {
    if (p.id === MANUAL_ID) {
      setManual(p);
      return;
    }
    setPresets((prev) => {
      const next = prev.map((x) => (x.id === p.id ? p : x));
      saveCustomPresets(next);
      return next;
    });
  };

  const saveCustom = (p: FramePreset) => {
    setPresets((prev) => {
      const next = [...prev, p];
      saveCustomPresets(next);
      return next;
    });
    setSelectedId(p.id);
  };

  const deleteCustom = (id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveCustomPresets(next);
      return next;
    });
    setSelectedId(null);
  };

  const order = photo && spec ? buildPrintOrder(photo, spec, transform, matColor) : null;

  return (
    <div className="app">
      <header className="app-header no-print">
        <h1>Photo Frame Planner</h1>
        <p>Pick the frame, position the photo, get a pixel-exact print order for your print shop.</p>
      </header>

      {!photo ? (
        <main className="app-empty no-print">
          <DropZone onFile={onFile} status={status} />
          <button className="demo-link" onClick={onDemo}>
            …or try it with a demo photo
          </button>
          {loadError && <div className="load-error">{loadError}</div>}
          <RecentPhotos onOpen={onOpenRecent} />
        </main>
      ) : (
        <main className="app-main no-print">
          <section className="zone-photo">
            <div className="zone-title-row">
              <h2>Photo behind mat</h2>
              <span className="hint">drag to reposition · scroll to zoom</span>
            </div>
            {spec && crop && (
              <EditorCanvas
                photo={photo}
                spec={spec}
                matColor={matColor}
                crop={crop}
                transform={transform}
                onTransform={setTransform}
              />
            )}
            <div className="editor-controls">
              <label className="zoom-control">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.01}
                  value={transform.zoom}
                  onChange={(e) => setTransform({ ...transform, zoom: parseFloat(e.target.value) })}
                />
                <span>{transform.zoom.toFixed(2)}×</span>
              </label>
              <div className="orientation-control">
                {(["auto", "portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    className={`btn btn-toggle ${orientationSetting === o ? "active" : ""}`}
                    onClick={() => {
                      setOrientationSetting(o);
                      setTransform(IDENTITY);
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <div className="mat-control">
                {(["white", "cream", "black"] as const).map((c) => (
                  <button
                    key={c}
                    title={`${c} mat`}
                    className={`mat-swatch mat-${c} ${matColor === c ? "active" : ""}`}
                    onClick={() => setMatColor(c)}
                  />
                ))}
              </div>
              <button className="btn" onClick={() => setTransform(IDENTITY)}>
                Reset position
              </button>
              <DropZone onFile={onFile} status={status} compact />
            </div>
            <div className="photo-facts">
              {photo.filename} — {photo.analysis.pixelWidth} × {photo.analysis.pixelHeight} px,{" "}
              {photo.analysis.orientation}
            </div>
            {loadError && <div className="load-error">{loadError}</div>}
          </section>

          <section className="zone-side">
            <h2>Recommendations</h2>
            <RecommendationPanel
              photo={photo}
              recommendations={recommendations}
              presets={presets}
              orientationSetting={orientationSetting}
              selectedId={selectedId}
              onSelect={selectPreset}
            />

            <h2 className="zone-subtitle">Have a frame already?</h2>
            <CustomFrameCard
              photo={photo}
              frame={manual}
              orientationSetting={orientationSetting}
              active={selectedId === MANUAL_ID}
              onChange={updatePreset}
              onUse={() => selectPreset(MANUAL_ID)}
            />

            <div className="side-previews">
              <div>
                <h3>On the wall</h3>
                {spec && crop && (
                  <FramePreview photo={photo} spec={spec} matColor={matColor} crop={crop} />
                )}
              </div>
              <div>
                <h3>Print window</h3>
                {crop && <CropPreview photo={photo} crop={crop} />}
              </div>
            </div>

            <details className="preset-details">
              <summary>Preset dimensions{selectedPreset ? ` — ${selectedPreset.name}` : ""}</summary>
              {selectedPreset && (
                <PresetEditor
                  preset={selectedPreset}
                  onChange={updatePreset}
                  onSaveCustom={saveCustom}
                  onDeleteCustom={deleteCustom}
                />
              )}
              <div className="preset-picker">
                <label>
                  All presets{" "}
                  <select value={selectedId ?? ""} onChange={(e) => selectPreset(e.target.value)}>
                    <option value={MANUAL_ID}>My own frame</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.custom ? " (custom)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>

            <button
              className="btn btn-primary btn-generate"
              disabled={!order}
              onClick={() => setShowSheet(true)}
            >
              Generate Print Order
            </button>

            {order && (
              <div className="inline-order">
                <div className="inline-order-head">
                  <h3>Message for the print shop</h3>
                  <button
                    className="btn"
                    onClick={async () => {
                      const text = printOrderText(order, photo);
                      try {
                        await navigator.clipboard.writeText(text);
                      } catch {
                        const ta = document.createElement("textarea");
                        ta.value = text;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        ta.remove();
                      }
                      setInlineCopied(true);
                      setTimeout(() => setInlineCopied(false), 1600);
                    }}
                  >
                    {inlineCopied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <pre className="inline-order-text">{printOrderText(order, photo)}</pre>
              </div>
            )}
          </section>
        </main>
      )}

      {showSheet && order && photo && spec && (
        <InstructionSheet order={order} photo={photo} spec={spec} onClose={() => setShowSheet(false)} />
      )}
    </div>
  );
}
