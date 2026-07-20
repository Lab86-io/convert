# lab86 convert — HEIC → JPEG

A browser-only converter for Apple HEIC/HEIF photos, built for
[heic.lab86.io](https://heic.lab86.io). Drop files, pick a JPEG quality,
convert, preview, and download — individually or as a `.zip`.

**Privacy:** conversion runs entirely on the device with WebAssembly
([heic-to](https://github.com/hoppergee/heic-to) / libheif). No file is ever
uploaded; there is no server-side processing.

This is the first converter in the lab86 convert family. The format registry
in `src/lib/formats.ts` and the conversion dispatcher in `src/lib/convert.ts`
are structured so more source → target pairs can be registered later.

## Stack

- TanStack Start (React 19, file-based routing, SSR-safe — codec code is
  dynamically imported on the client only)
- Tailwind CSS v4 (design tokens in `src/styles.css`)
- `heic-to` for decoding, `client-zip` for batch downloads
- Biome for lint/format, Vitest + Testing Library for tests

## Layout

- `src/lib/formats.ts` — format registry and pure helpers (validation with
  MIME **and** extension fallback, output naming, size formatting)
- `src/lib/convert.ts` — client-only conversion + zip, dynamic imports
- `src/lib/use-conversion-queue.ts` — queue state: add/convert/retry/remove,
  sequential processing, object-URL lifecycle
- `src/components/` — `Dropzone`, `FileCard`, `Wordmark`, `Spinner`
- `src/routes/index.tsx` — the single-page workbench

## Commands

```bash
pnpm install
pnpm dev        # dev server on :3000
pnpm test       # vitest
pnpm check      # biome lint + format check
pnpm typecheck  # TypeScript
pnpm build      # production build
pnpm start      # serve the built Nitro app
pnpm verify     # all checks + production build
```

## Deploy

Nitro builds a Node-compatible server:

```bash
pnpm build
PORT=3000 HOST=127.0.0.1 pnpm start
```

The production server entry point is `.output/server/index.mjs`. It honors
Nitro's standard `PORT` and `HOST` environment variables.
