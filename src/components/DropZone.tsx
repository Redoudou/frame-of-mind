import { useRef, useState } from "react";
import { FILE_ACCEPT, isSupportedFile } from "../loadPhoto";

type Props = {
  onFile: (file: File) => void;
  compact?: boolean;
  status: string | null;
};

export function DropZone({ onFile, compact, status }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedFile(file)) {
      setError(`Unsupported file: ${file.name}. Use JPEG, PNG, WebP or HEIC.`);
      return;
    }
    setError(null);
    onFile(file);
  };

  return (
    <div
      className={`dropzone ${compact ? "compact" : ""} ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handle(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT}
        hidden
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {status ? (
        <div className="dropzone-status">
          <span className="spinner" /> {status}
        </div>
      ) : compact ? (
        <span>Replace photo…</span>
      ) : (
        <>
          <div className="dropzone-icon">🖼</div>
          <div className="dropzone-title">Drop a photo here</div>
          <div className="dropzone-sub">or click to choose — JPEG, PNG, WebP, HEIC (iPhone)</div>
          <div className="dropzone-note">Everything stays on your Mac. Nothing is uploaded.</div>
        </>
      )}
      {error && <div className="dropzone-error">{error}</div>}
    </div>
  );
}
