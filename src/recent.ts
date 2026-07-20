/**
 * Last-10 recent photos, stored fully locally in IndexedDB (browsers do not
 * expose real file paths, so we keep the decoded image itself plus a
 * thumbnail — clicking a recent photo restores it exactly, pixel for pixel).
 */
export type RecentEntry = {
  id: string;
  filename: string;
  width: number;
  height: number;
  addedAt: number;
  thumb: string; // small JPEG data URL for the home-page grid
  blob: Blob; // full-resolution decoded image (JPEG for converted HEIC)
};

const DB_NAME = "photoformat";
const STORE = "recentPhotos";
const MAX_ENTRIES = 10;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listRecent(): Promise<RecentEntry[]> {
  const db = await openDb();
  try {
    const all = await requestAsPromise(
      db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<RecentEntry[]>,
    );
    return all.sort((a, b) => b.addedAt - a.addedAt);
  } finally {
    db.close();
  }
}

/** Insert or refresh an entry, then prune to the newest MAX_ENTRIES. */
export async function saveRecent(entry: RecentEntry): Promise<void> {
  const db = await openDb();
  try {
    const store = db.transaction(STORE, "readwrite").objectStore(STORE);
    await requestAsPromise(store.put(entry));
    const all = await listRecent();
    if (all.length > MAX_ENTRIES) {
      const prune = db.transaction(STORE, "readwrite").objectStore(STORE);
      for (const stale of all.slice(MAX_ENTRIES)) {
        await requestAsPromise(prune.delete(stale.id));
      }
    }
  } finally {
    db.close();
  }
}

export function recentId(filename: string, width: number, height: number): string {
  return `${filename}|${width}x${height}`;
}
