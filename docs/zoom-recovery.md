# Zoom recording recovery

`lab86 convert` can recover media from an unconverted Zoom computer-recording
file in the browser. This is a recovery path for `*.zoom` working files, not a
general decoder for Zoom cloud recordings or the standard MP4/M4A exports.

## User flow

1. Add the larger `double_click_to_convert_01.zoom` file.
2. Add `double_click_to_convert_02.zoom` at the same time if it is available.
   The workbench recognizes it as the paired control file and does not create a
   duplicate conversion row.
3. Wait for local preflight inspection. The row reports detected camera,
   screen-share, audio, resolution, and duration information.
4. Recover a gallery MP4, or select M4A/WAV to extract only the audio.

Files never leave the browser. The 500 MB limit is deliberate: the original
container, extracted streams, and FFmpeg virtual filesystem can briefly coexist
in memory. Larger or unsupported recordings should be preserved unchanged and
opened with the Zoom desktop app on the computer that created them.

## What the engine recovers

The current Zoom working-file layout has a 96-byte file header and a sequence of
little-endian, length-delimited media packets. In the public fixture used for
validation, the large `_01.zoom` contained:

- 32 kHz, mono, signed 16-bit PCM audio;
- three independent Annex B H.264 camera streams;
- per-stream participant identifiers, dimensions, and millisecond timestamps.

The small `_02.zoom` contained control metadata rather than media samples. The
recovery engine validates every packet boundary and trailer before reading its
payload, groups video by Zoom's stream identifier, starts each stream at its
first decodable IDR frame, prefixes discovered SPS/PPS parameter sets, and
places all detected camera or screen tracks in an MP4 grid. It never executes
Zoom binaries and does not upload source data.

Unsupported packet layouts, non-PCM audio, malformed sizes, truncated trailers,
more than 16 video streams, and metadata-only `_02` inputs fail with an explicit
message instead of producing a partial file silently.

## Research and validation

- Zoom's current troubleshooting documentation describes the
  `double_click_to_convert_01.zoom` / `_02.zoom` pair, desktop conversion, and
  the same-computer requirement:
  [Troubleshooting computer recording issues](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0061761).
- Zoom documents MP4, M4A, M3U, TXT, and VTT as normal computer-recording
  outputs; `.zoom` is therefore treated as an unfinished working container:
  [Finding and viewing computer recordings](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0064394).
- Zoom staff state that Linux has no supported `zTscoder` equivalent:
  [Zoom Developer Forum](https://devforum.zoom.us/t/converting-meeting-local-recordings-on-linux/106213).
- The packet layout was independently checked against the format observations in
  [gozoom](https://github.com/galli-leo/gozoom) and its associated
  [reverse-engineering paper](https://flagbot.ch/zoom.pdf). No third-party source
  code is included in this project.
- End-to-end recovery was tested with the public paired fixture in the
  [VideoLAN FFmpeg incoming archive](https://streams.videolan.org/ffmpeg/incoming/).
  The fixture is not committed because it contains identifiable meeting video.
- FFmpeg's historical behavior when a raw `.zoom` file is passed directly was
  cross-checked against the
  [FFmpeg user discussion](https://ffmpeg.org/pipermail/ffmpeg-user/2020-May/048785.html).

The format is proprietary and not formally specified by Zoom. Support is
consequently conservative and fixture-driven; future Zoom versions may require
additional packet or codec handling.
