import { useEffect, useState } from "react";
import { listRecent, type RecentEntry } from "../recent";

type Props = {
  onOpen: (entry: RecentEntry) => void;
};

export function RecentPhotos({ onOpen }: Props) {
  const [entries, setEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    listRecent()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="recent-photos">
      <h3>Recent photos</h3>
      <div className="recent-grid">
        {entries.map((e) => (
          <button key={e.id} className="recent-card" onClick={() => onOpen(e)} title={e.filename}>
            <img src={e.thumb} alt={e.filename} />
            <span className="recent-name">{e.filename}</span>
            <span className="recent-dims">
              {e.width} × {e.height} px
            </span>
          </button>
        ))}
      </div>
      <p className="recent-note">Stored locally in your browser — the last 10 photos you opened.</p>
    </div>
  );
}
