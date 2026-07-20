# Photo Frame Planner

A local macOS web app that takes one photo and produces one deliverable: a
precise, unambiguous **printer instruction sheet** you send to your print shop.

Everything runs in the browser. No backend, no accounts, no uploads — the
photo never leaves your Mac.

## Run

```sh
npm install
npm run dev
```

Then open http://localhost:5173.

## How it works

1. Drop in one photo (JPEG, PNG, WebP, or HEIC — iPhone HEIC files are
   converted locally with a lazily-loaded WASM decoder).
2. The app reads pixel dimensions, aspect ratio, and orientation, then scores
   every frame preset: **50% minimal cropping, 30% print quality (effective
   DPI), 20% mat proportion**. A "Low DPI" (< 180) option is never recommended
   as primary.
3. Pick the recommendation or an alternative, drag/zoom the photo behind the
   mat, choose a mat color (white / cream / black). Or, if you already own a
   frame, enter its frame size and mat opening under **"Have a frame
   already?"** — the app shows the best print spec for it (print size, DPI,
   crop, visible area) and "Use this frame" feeds it into the same
   editor/print-order flow. An optional **print bleed** (+¼ or +½ in per
   side) makes the print larger than the opening so extra image, not white
   paper, hides behind the mat.
4. The print-shop message is always visible live in the side panel with a
   copy button. **Generate Print Order** opens the full instruction sheet:
   exact print size, paper size, DPI, and a **pixel-exact crop window** —
   copyable as plain text and printable as a browser page, with thumbnail
   attachments.
5. The home page lists the **last 10 photos** you opened (stored locally in
   the browser's IndexedDB at full resolution) — click one to reopen it.

## Dimension model

Five values are always kept separate: frame size, outer paper size, mat
opening size, visible image size (mat opening minus ~1/4 in overlap), and the
actual printed image area. Example: 11×14 frame, 8×10 mat opening, 8×10
print on an 11×14 sheet, 7.75×9.75 visible.

## Presets

Standard sizes (8×10, 11×14, 12×16, 16×20, 20×24, and squares) ship built in.
Every dimension is editable, and edited setups can be saved as named custom
presets (persisted in LocalStorage).

## Stack

React + Vite + TypeScript, HTML Canvas for all previews, `heic2any` for HEIC
decoding (code-split, fetched only when a `.heic` file is dropped).
