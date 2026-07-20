# lab86 convert

A private, browser-only universal file converter for
[convert.lab86.io](https://convert.lab86.io). Drop a mixed batch, choose an
output per file, convert sequentially, then download files individually or as
a ZIP. The original [heic.lab86.io](https://heic.lab86.io) URL remains an alias.

Files never leave the browser. There is no upload endpoint, account, database,
or server-side file processing.

## Supported conversions

- Images: HEIC/HEIF, JPEG, PNG, WebP, AVIF, GIF, BMP → JPEG, PNG, WebP, PDF
- Audio: MP3, WAV, FLAC, AAC, M4A, OGG, Opus → MP3, WAV, FLAC, M4A, OGG, Opus
- Video: MP4, MOV, WebM, MKV, AVI, MPEG → MP4, WebM, GIF, or extracted audio
- Data: JSON, YAML, CSV, XML → JSON, YAML, CSV, XML
- Text: TXT, Markdown, HTML → TXT, Markdown, HTML
- Documents: DOCX → HTML, Markdown, TXT; PDF → TXT

Only valid edges are exposed in the UI. Animated image inputs use their first
frame, scanned PDFs need OCR, and complex Word layout may be simplified. Media
conversion is capped at 500 MB because it runs in browser memory.

## Stack

- TanStack Start, React 19, TypeScript, Vite, Tailwind CSS v4
- `heic-to` and Canvas for images
- `ffmpeg.wasm` for audio/video
- Papa Parse, YAML, and fast-xml-parser for structured data
- Marked and Turndown for markup
- Mammoth, PDF.js, and pdf-lib for documents
- Client Zip for local batch downloads
- Biome, Vitest, Testing Library, and a Playwright smoke test

## Architecture

- `src/lib/formats.ts` — typed format registry and explicit conversion graph
- `src/lib/engines/` — lazy-loaded image, media, data, text, and document engines
- `src/lib/convert.ts` — engine dispatcher and ZIP creation
- `src/lib/use-conversion-queue.ts` — mixed queue, per-file targets, progress,
  retries, sequential processing, and object URL lifecycle
- `src/components/` — dropzone, file row, wordmark, and spinner
- `src/routes/index.tsx` — universal conversion workbench
- `scripts/e2e-smoke.mjs` — real Chromium HEIC/data/media smoke coverage

## Commands

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm typecheck
pnpm build
pnpm start
pnpm verify
```

The production build copies the single-thread FFmpeg core into
`.output/public/ffmpeg/` and serves the Nitro app from
`.output/server/index.mjs`.

## Production

`convert.lab86.io` runs on Railway using `railway.toml`:

- Project: `lab86-convert`
- Service: `web`
- Environment: `production`
- Health check: `/`

Deploy the current directory with:

```bash
railway up --service web --environment production --detach -m "Describe release"
```

`heic.lab86.io` remains a lab86-hosted alias and fallback.
