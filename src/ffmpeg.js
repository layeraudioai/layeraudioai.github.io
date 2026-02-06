// ffmpeg.js - FFmpeg WASM wrapper for LayAI
// This module wraps ffmpeg.min.js and provides a simple API for running ffmpeg commands in the browser

// Load ffmpeg.min.js as a global script if not already loaded
export async function ensureFFmpegLoaded() {
    if (window.createFFmpeg) return;
    if (!window.FFmpeg) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'vendor/ffmpeg.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// Create and load FFmpeg instance
export async function getFFmpegInstance(options = {}) {
    await ensureFFmpegLoaded();
    // Use window.FFmpeg.createFFmpeg if available
    if (!window.FFmpeg || !window.FFmpeg.createFFmpeg) {
        throw new Error('FFmpeg WASM not loaded');
    }
    const ffmpeg = window.FFmpeg.createFFmpeg({
        corePath: 'vendor/ffmpeg-core.js',
        wasmPath: 'vendor/ffmpeg-core.wasm',
        log: true,
        ...options
    });
    await ffmpeg.load();
    return ffmpeg;
}

// Run ffmpeg command
export async function runFFmpegCommand(ffmpeg, args, inputFiles = {}, outputFiles = []) {
    // Write input files to FS
    for (const [filename, data] of Object.entries(inputFiles)) {
        ffmpeg.FS('writeFile', filename, data);
    }
    // Run command
    await ffmpeg.run(...args);
    // Read output files
    const outputs = {};
    for (const filename of outputFiles) {
        try {
            outputs[filename] = ffmpeg.FS('readFile', filename);
        } catch (e) {
            // Ignore missing outputs
        }
    }
    return outputs;
}
