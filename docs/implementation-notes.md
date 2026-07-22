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
- Mobbin was used again on 2026-07-21 for the Zoom recovery workflow. The
  implementation follows the preflight-before-action behavior from YNAB's file
  import and the explicit restore context from Google Drive and Dropbox, while
  keeping the interaction inline rather than adding a long wizard.
- Browserbase was used for current Zoom support documentation, reverse-engineering
  source discovery, and the public VideoLAN fixture. The final parser was tested
  against a real three-camera, PCM-audio recording pair.
- Claude Fable performed the final Zoom recovery UI critique on 2026-07-21. It
  recommended keeping the workbench design. Codex accepted its targeted fixes
  for error color, live status announcements, first-drop protection, accessible
  muted-text contrast, readable durations, focus consistency, and control-file
  dead ends; no structural redesign was made.

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
- [YNAB file import](https://mobbin.com/flows/653f134d-7005-4dfa-b3ee-4e6000fb572a)
- [Google Drive restore confirmation](https://mobbin.com/screens/fdba2151-f022-4fda-a987-334ec8bbd58b)
- [Dropbox recording restore](https://mobbin.com/screens/6f946156-a891-4280-8f00-dfb0f8ec13a1)
- [Frame.io media processing](https://mobbin.com/screens/af14bae7-16b2-4584-acf8-7de751c966a7)
