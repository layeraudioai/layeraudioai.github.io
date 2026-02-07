(() => {
    class LayaiRenderer {
        constructor() {
            this._audioContext = null;
            this._isLittleEndian = undefined;
        }

        getAudioContext() {
            if (this._audioContext) return this._audioContext;
            const Ctx = window.AudioContext || window.webkitAudioContext;
            this._audioContext = new Ctx();
            return this._audioContext;
        }

        async ensureScript(url) {
            if (!url) throw new Error('No script URL provided');
            const already = Array.from(document.getElementsByTagName('script')).some(s => s.src && s.src.indexOf(url) !== -1);
            if (already) return;
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = url;
                s.onload = () => resolve();
                s.onerror = () => reject(new Error('Failed to load ' + url));
                document.head.appendChild(s);
            });
        }

        async decodeFile(file) {
            const arrayBuffer = await file.arrayBuffer();
            const ctx = this.getAudioContext();
            return await ctx.decodeAudioData(arrayBuffer.slice(0));
        }

        async renderBuffer(buffer, options = {}) {
            const gain = Number.isFinite(options.gain) ? options.gain : 1;
            const playbackRate = Number.isFinite(options.playbackRate) ? options.playbackRate : 1;
            const targetSampleRate = Number.isFinite(options.sampleRate) ? options.sampleRate : buffer.sampleRate;

            if (gain === 1 && playbackRate === 1 && targetSampleRate === buffer.sampleRate) {
                return buffer;
            }

            const channels = buffer.numberOfChannels || 1;
            const length = Math.max(
                1,
                Math.floor((buffer.length / playbackRate) * (targetSampleRate / buffer.sampleRate))
            );
            const offline = new OfflineAudioContext(channels, length, targetSampleRate);
            const source = offline.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = playbackRate;
            const gainNode = offline.createGain();
            gainNode.gain.value = gain;
            source.connect(gainNode).connect(offline.destination);
            source.start(0);
            return await offline.startRendering();
        }

        floatTo16BitPCM(float32Array) {
            const l = float32Array.length;
            const buf = new Int16Array(l);
            for (let i = 0; i < l; i++) {
                let s = Math.max(-1, Math.min(1, float32Array[i]));
                buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            return buf;
        }

        isLittleEndian() {
            if (this._isLittleEndian !== undefined) return this._isLittleEndian;
            const test = new ArrayBuffer(2);
            new DataView(test).setInt16(0, 256, true);
            this._isLittleEndian = new Int16Array(test)[0] === 256;
            return this._isLittleEndian;
        }

        audioBufferToWav(buffer) {
            const numChannels = buffer.numberOfChannels;
            const sampleRate = buffer.sampleRate;
            const numFrames = buffer.length;
            const bytesPerSample = 2;
            const blockAlign = numChannels * bytesPerSample;
            const byteRate = sampleRate * blockAlign;
            const dataSize = numFrames * blockAlign;

            const headerBuffer = new ArrayBuffer(44);
            const view = new DataView(headerBuffer);

            const writeString = (offset, text) => {
                for (let i = 0; i < text.length; i++) {
                    view.setUint8(offset + i, text.charCodeAt(i));
                }
            };

            writeString(0, 'RIFF');
            view.setUint32(4, 36 + dataSize, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, bytesPerSample * 8, true);
            writeString(36, 'data');
            view.setUint32(40, dataSize, true);

            const parts = [headerBuffer];
            const channelData = new Array(numChannels);
            for (let ch = 0; ch < numChannels; ch++) {
                channelData[ch] = buffer.getChannelData(ch);
            }
            const chunkFrames = 16384;
            const littleEndian = this.isLittleEndian();
            for (let start = 0; start < numFrames; start += chunkFrames) {
                const frames = Math.min(chunkFrames, numFrames - start);
                const chunkBuffer = new ArrayBuffer(frames * blockAlign);
                if (littleEndian) {
                    const chunk = new Int16Array(chunkBuffer);
                    let out = 0;
                    for (let i = 0; i < frames; i++) {
                        for (let ch = 0; ch < numChannels; ch++) {
                            const sample = channelData[ch][start + i];
                            const clamped = Math.max(-1, Math.min(1, sample));
                            chunk[out++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
                        }
                    }
                } else {
                    const dv = new DataView(chunkBuffer);
                    let off = 0;
                    for (let i = 0; i < frames; i++) {
                        for (let ch = 0; ch < numChannels; ch++) {
                            const sample = channelData[ch][start + i];
                            const clamped = Math.max(-1, Math.min(1, sample));
                            dv.setInt16(off, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
                            off += bytesPerSample;
                        }
                    }
                }
                parts.push(chunkBuffer);
            }

            return new Blob(parts, { type: 'audio/wav' });
        }

        async recordWithMediaRecorder(buffer, mimeType) {
            return new Promise(async (resolve, reject) => {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    const ctx = new AudioCtx();
                    const src = ctx.createBufferSource();
                    src.buffer = buffer;
                    const dest = ctx.createMediaStreamDestination();
                    src.connect(dest);
                    try { src.connect(ctx.destination); } catch (e) {}

                    const recorder = new MediaRecorder(dest.stream, { mimeType });
                    const chunks = [];
                    recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
                    recorder.onerror = (ev) => { try { ctx.close && ctx.close(); } catch(e){}; reject(ev.error || new Error('Recording error')); };
                    recorder.onstop = () => {
                        try { ctx.close && ctx.close(); } catch (e) {}
                        resolve(new Blob(chunks, { type: mimeType }));
                    };

                    recorder.start();
                    src.start();
                    const timeout = (buffer.duration || (buffer.length / buffer.sampleRate || 0)) * 1000 + 200;
                    setTimeout(() => {
                        try { src.stop(); } catch (e) {}
                        try { recorder.stop(); } catch (e) { try { recorder.requestData(); } catch (e2) {} }
                    }, timeout);
                } catch (err) {
                    reject(err);
                }
            });
        }

        async encodeAudioBuffer(buffer, options = {}) {
            const ext = (options.extension || 'wav').toLowerCase();
            const targetExt = ext === 'ogg' ? 'opus' : ext;
            const wavBlob = this.audioBufferToWav(buffer);

            if (targetExt === 'wav') {
                return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
            }

            if (targetExt === 'mp3') {
                try {
                    try {
                        await this.ensureScript('vendor/lame.min.js');
                    } catch (e) {
                        await this.ensureScript('https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js');
                    }
                    const Mp3Encoder = (window.lamejs && window.lamejs.Mp3Encoder) || window.Mp3Encoder || (window.lame && window.lame.Mp3Encoder);
                    if (!Mp3Encoder) throw new Error('Mp3 encoder not available');

                    const numChannels = Math.min(2, buffer.numberOfChannels || 1);
                    const sampleRate = buffer.sampleRate || 44100;
                    const bitrate = Math.max(32, Math.min(320, Math.round(options.bitrate || 192)));
                    const mp3enc = new Mp3Encoder(numChannels, sampleRate, bitrate);

                    const leftData = buffer.getChannelData(0);
                    const rightData = numChannels === 2 ? buffer.getChannelData(1) : null;
                    const mp3Data = [];
                    const maxSamples = 1152;
                    const totalSamples = leftData.length;

                    if (numChannels === 2) {
                        for (let i = 0; i < totalSamples; i += maxSamples) {
                            const end = Math.min(totalSamples, i + maxSamples);
                            const len = end - i;
                            const leftChunk = new Int16Array(len);
                            const rightChunk = new Int16Array(len);
                            for (let j = 0; j < len; j++) {
                                const l = Math.max(-1, Math.min(1, leftData[i + j]));
                                const r = Math.max(-1, Math.min(1, rightData[i + j]));
                                leftChunk[j] = l < 0 ? l * 0x8000 : l * 0x7fff;
                                rightChunk[j] = r < 0 ? r * 0x8000 : r * 0x7fff;
                            }
                            const mp3buf = mp3enc.encodeBuffer(leftChunk, rightChunk);
                            if (mp3buf && mp3buf.length) mp3Data.push(new Uint8Array(mp3buf));
                        }
                    } else {
                        for (let i = 0; i < totalSamples; i += maxSamples) {
                            const end = Math.min(totalSamples, i + maxSamples);
                            const len = end - i;
                            const chunk = new Int16Array(len);
                            for (let j = 0; j < len; j++) {
                                const v = Math.max(-1, Math.min(1, leftData[i + j]));
                                chunk[j] = v < 0 ? v * 0x8000 : v * 0x7fff;
                            }
                            const mp3buf = mp3enc.encodeBuffer(chunk);
                            if (mp3buf && mp3buf.length) mp3Data.push(new Uint8Array(mp3buf));
                        }
                    }

                    const end = mp3enc.flush();
                    if (end && end.length) mp3Data.push(new Uint8Array(end));
                    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
                    return { blob: mp3Blob, extension: 'mp3', mimeType: 'audio/mpeg' };
                } catch (e) {
                    return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
                }
            }

            if (targetExt === 'opus' || targetExt === 'webm') {
                const candidates = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus'];
                for (const mime of candidates) {
                    if (!window.MediaRecorder || (MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mime))) continue;
                    try {
                        const blob = await this.recordWithMediaRecorder(buffer, mime);
                        const outExt = mime.includes('ogg') ? 'opus' : 'webm';
                        return { blob, extension: outExt, mimeType: mime };
                    } catch (err) {
                        // try next
                    }
                }
                return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
            }

            if (targetExt === 'flac') {
                try {
                    try {
                        await this.ensureScript('vendor/ffmpeg.min.js');
                    } catch (e) {
                        await this.ensureScript('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');
                    }
                    const createFFmpeg = window.createFFmpeg || (window.FFmpeg && window.FFmpeg.createFFmpeg) || null;
                    if (!createFFmpeg) throw new Error('ffmpeg.wasm createFFmpeg not found');
                    let corePath = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js';
                    try {
                        await this.ensureScript('vendor/ffmpeg-core.js');
                        corePath = 'vendor/ffmpeg-core.js';
                    } catch (err) {
                        try { await this.ensureScript(corePath); } catch (e) {}
                    }
                    const ffmpeg = createFFmpeg({ log: false, corePath });
                    await ffmpeg.load();
                    const inputName = 'input.wav';
                    const outputName = 'output.flac';
                    const arrayBuffer = await wavBlob.arrayBuffer();
                    ffmpeg.FS('writeFile', inputName, new Uint8Array(arrayBuffer));
                    await ffmpeg.run('-i', inputName, '-c:a', 'flac', '-compression_level', '5', outputName);
                    const out = ffmpeg.FS('readFile', outputName);
                    const flacBlob = new Blob([out.buffer], { type: 'audio/flac' });
                    return { blob: flacBlob, extension: 'flac', mimeType: 'audio/flac' };
                } catch (e) {
                    return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
                }
            }

            return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
        }
    }

    window.layaiRenderer = new LayaiRenderer();
})();
