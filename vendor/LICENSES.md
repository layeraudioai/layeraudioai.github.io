# Vendor Libraries License Summary

This directory contains vendored (locally-hosted) JavaScript and WebAssembly runtime libraries to reduce CDN dependencies and improve performance.

## Libraries

### 1. LAME (MP3 Encoder)
- **File:** `vendor/lame.min.js`
- **Library:** lamejs (JavaScript port of LAME MP3 encoder)
- **Version:** 1.2.0
- **License:** LGPL-2.0
- **Source:** https://github.com/zhuker/lamejs
- **CDN Original:** https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js
- **Purpose:** In-browser MP3 audio encoding
- **Attribution:** Based on LAME MP3 encoder by Gabriel Bouvigne and contributors

### 2. FFmpeg.wasm (FLAC, Opus, WAV transcoding)
- **File:** `vendor/ffmpeg.min.js`, `vendor/ffmpeg-core.js`, `vendor/ffmpeg-core.wasm`
- **Library:** ffmpeg.wasm (@ffmpeg/ffmpeg)
- **Version:** 0.11.6 (wrapper), 0.11.0 (core)
- **License:** MIT
- **Source:** https://github.com/ffmpegwasm/ffmpeg.wasm
- **CDN Original:** https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js
- **Core CDN:** https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm
- **Purpose:** In-browser FLAC, Opus, WAV, and other codec transcoding
- **Attribution:** ffmpeg.wasm wrapper by Jerome Wu; FFmpeg core by FFmpeg Project contributors

### 3. FFmpeg Core (libavformat, libavcodec, etc.)
- **Files:** `vendor/ffmpeg-core.js`, `vendor/ffmpeg-core.wasm`
- **Library:** FFmpeg (Emscripten-compiled WebAssembly)
- **Version:** 0.11.0 (as included in @ffmpeg/core)
- **License:** LGPL-2.1 (or GPL-2.0 depending on FFmpeg compile flags)
- **Source:** https://www.ffmpeg.org/
- **Purpose:** Core codec library for audio/video processing in WebAssembly
- **Attribution:** FFmpeg Project (see https://www.ffmpeg.org/legal.html)

---

## Notes

### Licensing Compliance
- **LAME (LGPL-2.0):** Commercial use is permitted; you must provide source code or offer to provide it.
  - This app is open-source (JavaScript), so compliance is met by distributing source.
- **FFmpeg (LGPL-2.1):** Similar LGPL obligations apply to dynamically linked libraries.
- **ffmpeg.wasm (MIT):** Permissive license with no special requirements.

### Large Binary Files
- `vendor/ffmpeg-core.wasm` (~24 MB) is a precompiled WebAssembly binary of FFmpeg core.
  - Increase in repository size is expected.
  - Consider using Git LFS or external artifact hosting if repository size becomes problematic.

### CDN Fallback
If local vendor assets fail to load, the app automatically falls back to CDN copies:
- ffmpeg wrapper: https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js
- lame: https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js
- ffmpeg-core.js: https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js
- ffmpeg-core.wasm: https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm

---

## How to Update Vendor Assets

1. Check for newer versions on npm/GitHub:
   - https://www.npmjs.com/package/lamejs
   - https://www.npmjs.com/package/@ffmpeg/ffmpeg
   - https://www.npmjs.com/package/@ffmpeg/core

2. Download new minified/core files and replace existing files in `vendor/`.

3. Update `app.js` if CDN URLs change.

4. Test in all major browsers (Chromium, Firefox, WebKit).

5. Update this file with new version numbers and links.

---

## References

- LAME: http://www.mp3dev.org/
- FFmpeg: https://www.ffmpeg.org/
- ffmpeg.wasm: https://github.com/ffmpegwasm/ffmpeg.wasm
- LGPL: https://www.gnu.org/licenses/lgpl-2.0.html
