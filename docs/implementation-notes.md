# Implementation notes

## Research and specialist pass

- Mobbin was used on 2026-07-20 to research shipped web upload and completion
  patterns. The implementation adapts the focused upload target and adjacent
  constraints from Gamma and Notion, then uses output-bound downloads inspired
  by PlayAI and Sora's ready state.
- Claude Fable was used as the UI specialist on 2026-07-20. It was asked to
  implement the first complete interface in the fresh TanStack Start scaffold.
  Its work was accepted and then reviewed by Codex for conversion behavior,
  queue lifecycle, accessibility, tests, and deployment readiness.
- Codex fixed a queue wake-up race found during review: if a user removed an
  actively converting file and added another before the first conversion
  finished, the second item could remain queued after the discarded result
  resolved.

## Product decisions

- Conversion is browser-only. The server delivers the application but never
  receives image data.
- The product label is `lab86 convert`, while the route names the active pair
  `HEIC → JPEG`. Format definitions and conversion dispatch are separated so
  additional converters can be added without replacing the workbench.
- HEIC/HEIF validation checks MIME type and filename extension because browser
  file pickers frequently return empty or generic MIME types for these files.
- Codec and ZIP dependencies are dynamically imported to keep them out of the
  initial browser path and safe during server rendering.

## Mobbin references

- [Gamma import](https://mobbin.com/screens/5fec65f1-5771-424d-bf73-f43f636fa1ff)
- [Notion import](https://mobbin.com/screens/81df8bca-0457-4584-a5e3-8516bfdc734f)
- [PlayAI output](https://mobbin.com/screens/8b56ede8-f491-46d5-afd1-b9c23e18e5f7)
- [Sora ready state](https://mobbin.com/screens/2b1ece3e-1d88-415a-82cc-3c9889654222)
