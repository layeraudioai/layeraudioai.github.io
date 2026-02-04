Vendor files directory for LayAI encoders

Place encoder JS/WASM artifacts here to avoid CDN fetches at runtime.

Recommended files to provide:
- vendor/lame.min.js
  - A browser build of lamejs (e.g. https://github.com/zhuker/lamejs). Download the minified JS and save as `vendor/lame.min.js`.

- vendor/ffmpeg.min.js
- vendor/ffmpeg-core.js / vendor/ffmpeg-core.wasm (if required)
  - A browser build of ffmpeg.wasm (https://github.com/ffmpegwasm/ffmpeg.wasm). The package typically exposes `createFFmpeg` and `fetchFile` globals used by the app. Put the minified loader as `vendor/ffmpeg.min.js` and the wasm/core files alongside as needed.

Notes:
- These libraries are large (especially ffmpeg.wasm). Adding them to the repo will increase its size substantially.
- If you prefer not to commit large binaries, host them on a local static server and update `app.js` to point to their URLs.
- After placing the files, the app will try the `vendor/` copies first and fall back to CDN versions if missing.

Example (download):
1. Download `lame.min.js` and save to `vendor/lame.min.js`.
2. Follow ffmpeg.wasm docs to download the distribution files and place them in `vendor/`.

If you want, I can (a) add a small script to verify vendor files are present at runtime, or (b) attempt to vendor a minimal stub here (not recommended due to size).