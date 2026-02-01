// LayAI - Complete JavaScript Implementation

// Browser-compatible MIDI Parser
class MIDIParser {
    constructor() {
        this.tracks = [];
        this.duration = 0;
        this.ticksPerBeat = 480;
        this.tempo = 500000; // Default 120 BPM in microseconds per beat
    }

    async loadFromArrayBuffer(arrayBuffer) {
        const data = new Uint8Array(arrayBuffer);
        let offset = 0;

        // Read header chunk
        const headerChunk = this.readString(data, offset, 4);
        if (headerChunk !== 'MThd') {
            throw new Error('Invalid MIDI file: Missing MThd header');
        }
        offset += 4;

        const headerLength = this.readUint32(data, offset);
        offset += 4;

        const format = this.readUint16(data, offset);
        offset += 2;

        const numTracks = this.readUint16(data, offset);
        offset += 2;

        this.ticksPerBeat = this.readUint16(data, offset);
        offset += 2;

        // Skip any extra header bytes
        offset += headerLength - 6;

        // Read track chunks
        this.tracks = [];
        for (let t = 0; t < numTracks; t++) {
            const trackChunk = this.readString(data, offset, 4);
            if (trackChunk !== 'MTrk') {
                throw new Error('Invalid MIDI file: Missing MTrk header');
            }
            offset += 4;

            const trackLength = this.readUint32(data, offset);
            offset += 4;

            const trackEnd = offset + trackLength;
            const track = { notes: [], events: [] };
            let currentTime = 0;
            let runningStatus = 0;
            const activeNotes = {};

            while (offset < trackEnd) {
                const deltaTime = this.readVariableLength(data, offset);
                offset = deltaTime.newOffset;
                currentTime += deltaTime.value;

                let statusByte = data[offset];
                if (statusByte < 0x80) {
                    // Running status
                    statusByte = runningStatus;
                } else {
                    offset++;
                    if (statusByte < 0xF0) {
                        runningStatus = statusByte;
                    }
                }

                const eventType = statusByte & 0xF0;
                const channel = statusByte & 0x0F;

                if (eventType === 0x90) {
                    // Note On
                    const note = data[offset++];
                    const velocity = data[offset++];
                    if (velocity > 0) {
                        activeNotes[`${channel}-${note}`] = {
                            midi: note,
                            velocity: velocity / 127,
                            startTick: currentTime,
                            channel
                        };
                    } else {
                        // Note On with velocity 0 = Note Off
                        this.endNote(track, activeNotes, channel, note, currentTime);
                    }
                } else if (eventType === 0x80) {
                    // Note Off
                    const note = data[offset++];
                    offset++; // velocity (ignored for note off)
                    this.endNote(track, activeNotes, channel, note, currentTime);
                } else if (eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) {
                    // Polyphonic Pressure, Control Change, Pitch Bend (2 data bytes)
                    offset += 2;
                } else if (eventType === 0xC0 || eventType === 0xD0) {
                    // Program Change, Channel Pressure (1 data byte)
                    offset += 1;
                } else if (statusByte === 0xFF) {
                    // Meta event
                    const metaType = data[offset++];
                    const metaLength = this.readVariableLength(data, offset);
                    offset = metaLength.newOffset;

                    if (metaType === 0x51 && metaLength.value === 3) {
                        // Tempo
                        this.tempo = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
                    }
                    offset += metaLength.value;
                } else if (statusByte === 0xF0 || statusByte === 0xF7) {
                    // SysEx
                    const sysexLength = this.readVariableLength(data, offset);
                    offset = sysexLength.newOffset + sysexLength.value;
                } else {
                    // Unknown event, try to skip
                    break;
                }
            }

            // End any remaining active notes
            for (const key in activeNotes) {
                const noteData = activeNotes[key];
                track.notes.push({
                    midi: noteData.midi,
                    velocity: noteData.velocity,
                    time: this.ticksToSeconds(noteData.startTick),
                    duration: this.ticksToSeconds(currentTime - noteData.startTick)
                });
            }

            this.tracks.push(track);
            offset = trackEnd;
        }

        // Calculate total duration
        this.duration = 0;
        for (const track of this.tracks) {
            for (const note of track.notes) {
                const endTime = note.time + note.duration;
                if (endTime > this.duration) {
                    this.duration = endTime;
                }
            }
        }

        return this;
    }

    endNote(track, activeNotes, channel, note, currentTime) {
        const key = `${channel}-${note}`;
        if (activeNotes[key]) {
            const noteData = activeNotes[key];
            track.notes.push({
                midi: noteData.midi,
                velocity: noteData.velocity,
                time: this.ticksToSeconds(noteData.startTick),
                duration: this.ticksToSeconds(currentTime - noteData.startTick)
            });
            delete activeNotes[key];
        }
    }

    ticksToSeconds(ticks) {
        return (ticks / this.ticksPerBeat) * (this.tempo / 1000000);
    }

    readString(data, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(data[offset + i]);
        }
        return str;
    }

    readUint32(data, offset) {
        return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    }

    readUint16(data, offset) {
        return (data[offset] << 8) | data[offset + 1];
    }

    readVariableLength(data, offset) {
        let value = 0;
        let byte;
        do {
            byte = data[offset++];
            value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        return { value, newOffset: offset };
    }

    async addLog(message, type = 'info') {
        const logOutput = document.getElementById('logOutput');
        if (!logOutput) return;
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        const timestamp = new Date().toLocaleTimeString();
        line.textContent = `[${timestamp}] ${message}`;
        logOutput.appendChild(line);
        logOutput.scrollTop = logOutput.scrollHeight;
    }
}

class LayAI {
    constructor() {
        // State variables
        this.running = false;
        this.maxnum = this.getRandomInt(1, 314);
        this.totalchannels = 0;
        this.songs = [];
        this.count = 0;
        this.bassdelta = 0;
        this.trebledelta = 0;
        this.bassfreqdelta = 0;
        this.treblefreqdelta = 0;
        this.volumedelta = 0;
        this.tempodelta = 1.0; // Tempo multiplier delta (starts at 1.0x = normal speed)
        this.bass = this.getRandomInt(0, 166);
        this.treble = this.getRandomInt(0, 66);
        this.bassfreq = this.getRandomInt(0, 1000);
        this.treblefreq = this.getRandomInt(666, 10000);
        this.volume = this.getRandomInt(10, 31415) / 420;
        this.tempo = 1.0; // Tempo multiplier (0.5 = half speed, 2.0 = double speed)
        this.aichannels = 0;
        this.aibass = 0;
        this.aitreble = 0;
        this.aibassfreq = 0;
        this.aitreblefreq = 0;
        this.aivolume = 0;
        this.aitempo = 0;
        this.aimaxnum = 0;
        this.bytespersample = 0;
        this.numSamples = 0;
        this.samplenum = -1;

        // Audio processing variables
        this.crayzz = 0;
        this.panfull = "";
        this.audchnum = 0;
        this.extension = "mp3";
        this.bitrate = 320;
        this.channels = [];
        this.pan = {};
        this.audioContext = null;
        this.audioBuffers = [];
        this.samples = [];
        this.sampleBlobs = [];
        this.knowledgeBase = [];
        this.mixBlob = null;
        this.mixMimeType = 'audio/wav';

        // DOM Elements
        this.audioSource = document.getElementById('audioSource');
        this.player = document.getElementById('player');
        this.setupSection = document.getElementById('setupSection');
        this.mixingSection = document.getElementById('mixingSection');
        this.startBtn = document.getElementById('startBtn');
        this.generateBtn = document.getElementById('generateBtn');
        this.rememberBtn = document.getElementById('rememberBtn');
        this.rerunBtn = document.getElementById('rerunBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.convertBtn = document.getElementById('convertBtn');
        this.playBtn = document.getElementById('playBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.logOutput = document.getElementById('logOutput');
        this.progressOverlay = document.getElementById('progressOverlay');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.extensionSelect = document.getElementById('extension');

        // Slider elements
        this.bassSlider = document.getElementById('bassSlider');
        this.trebleSlider = document.getElementById('trebleSlider');
        this.bassFreqSlider = document.getElementById('bassFreqSlider');
        this.trebleFreqSlider = document.getElementById('trebleFreqSlider');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.tempoSlider = document.getElementById('tempoSlider');
        this.bassValue = document.getElementById('bassValue');
        this.trebleValue = document.getElementById('trebleValue');
        this.bassFreqValue = document.getElementById('bassFreqValue');
        this.trebleFreqValue = document.getElementById('trebleFreqValue');
        this.volumeValue = document.getElementById('volumeValue');
        this.tempoValue = document.getElementById('tempoValue');
        this.sampleNumber = document.getElementById('sampleNumber');
        this.sampleValue = document.getElementById('sampleValue');
        
        // Display elements
        this.maxNumDisplay = document.getElementById('maxNumDisplay');
        this.totalChannelsDisplay = document.getElementById('totalChannelsDisplay');
        this.panDisplay = document.getElementById('panDisplay');

        this.initEventListeners();
        this.updateOutputFormatOptions();
        this.loadKnowledgeBase();
        this.resetDownload();
        this.fetchFile = null;
    }

    initEventListeners() {
        this.playBtn.addEventListener('click', () => this.handlePlay());
        this.convertBtn.addEventListener('click', () => this.handleConvert());
        this.startBtn.addEventListener('click', () => this.handleStart());
        this.generateBtn.addEventListener('click', () => this.handleGenerate());
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        this.rememberBtn.addEventListener('click', () => this.handleRemember());
        if (this.rerunBtn) {
            this.rerunBtn.addEventListener('click', () => this.handleRerun());
        }
        this.stopBtn.addEventListener('click', () => this.handleStop());
        this.deleteBtn.addEventListener('click', () => this.handleDelete());
        // Slider listeners
        this.bassSlider.addEventListener('input', (e) => {
            this.bassdelta = parseInt(e.target.value);
            this.bassValue.textContent = this.bassdelta;
        });

        this.trebleFreqSlider.addEventListener('input', (e) => {
            this.treblefreqdelta = parseInt(e.target.value);
            this.trebleFreqValue.textContent = this.treblefreqdelta;
        });
        this.bassFreqSlider.addEventListener('input', (e) => {
            this.bassfreqdelta = parseInt(e.target.value);
            this.bassFreqValue.textContent = this.bassfreqdelta;
        });

        this.trebleSlider.addEventListener('input', (e) => {
            this.trebledelta = parseInt(e.target.value);
            this.trebleValue.textContent = this.trebledelta;
        });
        this.volumeSlider.addEventListener('input', (e) => {
            this.volumedelta = parseInt(e.target.value);
            this.volumeValue.textContent = this.volumedelta;
        });

        this.tempoSlider.addEventListener('input', (e) => {
            this.tempodelta = parseInt(e.target.value) / 100; // Convert to multiplier (50-200 -> 0.5-2.0)
            this.tempoValue.textContent = this.tempodelta.toFixed(2) + 'x';
        });
    
        this.sampleNumber.addEventListener('input', (e) => {
            this.samplenum = parseInt(e.target.value);
            this.sampleValue.textContent = this.samplenum;
        });
    }

    handleStart() {
        this.resetDownload();
        const songInput = document.getElementById('songInput');
        const craziness = parseInt(document.getElementById('craziness').value);
        const surround = document.getElementById('surround').value;
        const extension = this.extensionSelect.value;
        const bitrate = parseInt(document.getElementById('bitrate').value);
        const loadAI = document.getElementById('loadAI').checked;

        if (songInput.files.length === 0) {
            this.addLog('Please select at least one audio file', 'error');
            return;
        }

        this.crayzz = craziness;
        this.extension = extension;
        this.bitrate = bitrate;
        this.songs = Array.from(songInput.files);

        // Set audio channels based on surround selection
        this.setSurroundChannels(surround);
        this.ensureSupportedExtension();

        // Initialize audio context
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        this.addLog(`Starting LayAI with ${this.songs.length} song(s)`, 'info');
        this.addLog(`Craziness Level: ${craziness}`, 'info');
        this.addLog(`Surround: ${surround} (${this.audchnum} channels)`, 'info');
        this.addLog(`Output Format: ${this.extension} @ ${bitrate}Kb/s`, 'info');

        if (loadAI) {
            this.addLog('Loading AI Knowledge Base...', 'info');
            this.loadAIKnowledgeBase();
        }

        this.countSongs();
    }

    setSurroundChannels(panfull) {
        const channelMap = {
            'mono': 1,
            'stereo': 2,
            '5.1': 6,
            '7.1': 8,
            'hexadecagonal': 16,
            '22.2': 24
        };
        this.audchnum = channelMap[panfull];
        this.panfull = panfull;
    }

    updateOutputFormatOptions() {
        this.outputFormatSupport = this.getOutputFormatSupport();
        const options = Array.from(this.extensionSelect.options);
        for (const option of options) {
            const originalLabel = option.dataset.label || option.textContent;
            option.dataset.label = originalLabel;
            const supported = this.outputFormatSupport[option.value];
            option.disabled = !supported;
            option.textContent = supported ? originalLabel : `${originalLabel} (browser export unavailable)`;
        }
        if (this.extensionSelect.selectedOptions.length) {
            const selected = this.extensionSelect.selectedOptions[0];
            if (selected.disabled) {
                this.extensionSelect.value = 'wav';
            }
        }
    }

    getOutputFormatSupport() {
        return {
            wav: true,
            mp3: true,
            opus: true,
            flac: true,
            wv: true
        };
    }

    async ensureSupportedExtension() {
        const selected = this.extensionSelect.value;
        if (!this.outputFormatSupport || !this.outputFormatSupport[selected]) {
            this.addLog('Selected output format is not available in-browser. Falling back to WAV.', 'warning');
            this.extensionSelect.value = 'wav';
            this.extension = 'wav';
        }
    }

    async countSongs() {
        this.addLog('STARTING THE SONG COUNT', 'info');
        this.count = 0;
        this.totalchannels = 0;
        this.audioBuffers = [];

        for (let i = 0; i < this.songs.length; i++) {
            const song = this.songs[i];
            const arrayBuffer = await this.readFile(song);
            
            try {
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.audioBuffers.push(audioBuffer);
                this.channels[this.count] = audioBuffer.numberOfChannels;
                this.totalchannels += audioBuffer.numberOfChannels;
                
                this.addLog(`Song ${this.count + 1}: ${song.name} (${audioBuffer.numberOfChannels} channels)`, 'info');
                this.count++;
            } catch (e) {
                this.addLog(`Error decoding ${song.name}: ${e.message}`, 'error');
            }
        }

        this.addLog('SONG COUNT DONE', 'success');
        this.addLog(`Total Channels: ${this.totalchannels}`, 'info');

        this.setupPans();
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    setupPans() {
        this.addLog('STARTING THE PAN SETUP', 'info');
        
        // Initialize pan array
        for (let i = 0; i < this.maxnum * 64; i++) {
            this.pan[i] = '';
        }

        // Setup pan for each position
        for (let i = 0; i < this.maxnum * 64; i++) {
            const used = {};
            let randomc = '';

            for (let x = 0; x < this.crayzz; x++) {
                used[x] = '';
                let add = 1;
                let op = this.getRandomInt(0, 1);
                let oper = op ? '+' : '-';
                op = this.getRandomInt(0, 1);
                let opel = op ? '+' : '-';
                
                if (x === 0) {
                    opel = '';
                    oper = '';
                }

                randomc = this.getRandomInt(0, this.totalchannels);

                // Check if already used
                for (let z = 0; z < x; z++) {
                    if (used[z] === randomc) {
                        add = 0;
                        break;
                    }
                }

                if (add) {
                    this.pan[i] = `c${randomc}${opel}` + (this.pan[i] || '');
                }

                used[x] = randomc;
            }

            if (this.pan[i] === '') {
                this.pan[i] = 'c0';
            }
        }

        // Build panfull configuration
        let panfullConfig = this.panfull;
        for (let i = 0; i < this.audchnum*this.crayzz; i++) {
            const panIndex = this.getRandomInt(0, this.maxnum * 4 - 1);
            panfullConfig += `|c${i}=${this.pan[panIndex] || 'c0'}`;
        }

        this.panfull = panfullConfig;
        this.addLog('PAN SETUP DONE', 'success');

        // Update display and transition to mixing section
        this.updateDisplay();
        this.setupSection.classList.remove('active');
        this.mixingSection.classList.add('active');
        this.running = true;
    }

    async updateDisplay() {
        this.maxNumDisplay.textContent = this.maxnum;
        this.totalChannelsDisplay.textContent = this.totalchannels;
        this.panDisplay.textContent = this.panfull.substring(0, 1000) + (this.panfull.length > 1000 ? '...' : '');
    }

    async handleGenerate() {
        if (!this.running) return;

        this.resetDownload();
        const datetime = new Date().toISOString().replace(/[:.]/g, '');

        this.addLog('Generating audio mix...', 'info');
        this.showProgress(true);

        // Calculate final parameters
        const finalBass = this.bass + (this.bassdelta*this.getRandomInt(0,3));
        const finalTreble = this.treble + (this.trebledelta*this.getRandomInt(0,3));
        const finalBassFreq = this.bassfreq + (this.bassfreqdelta*this.getRandomInt(0,3));
        const finalTrebleFreq = this.treblefreq + (this.treblefreqdelta*this.getRandomInt(0,3));
        const finalVolume = this.volume + (this.volumedelta*this.getRandomInt(0,3)) / 100;
        // Tempo is now a multiplier (0.5-2.0), use tempodelta directly if set, otherwise default
        const finalTempo = this.tempodelta > 0 ? this.tempodelta : this.tempo;
        this.bass=finalBass;
        this.treble=finalTreble;
        this.bassfreq=finalBassFreq;
        this.treblefreq=finalTrebleFreq;
        this.volume=finalVolume;
        this.tempo=finalTempo;
        this.sampleValue=this.samplenum;
        this.addLog(`Bass: ${finalBass}, Treble: ${finalTreble}, Bass Frequency: ${finalBassFreq}, Treble Frequency: ${finalTrebleFreq}, Volume: ${finalVolume}, Tempo: ${finalTempo.toFixed(2)}x`, 'info');
        this.addLog(`Pan Config: ${this.panfull}`, 'info');

        try {
            const { blob, extension } = await this.processAudio(finalBass, finalTreble, finalVolume);
            const filename = `out_${datetime}.${extension}`;
            this.addLog(`Mix generated: ${filename}`, 'success');
            this.setDownloadReady(filename, blob);
            this.showProgress(false);
        } catch (e) {
            this.addLog(`Error generating mix: ${e.message}`, 'error');
            this.showProgress(false);
        }
    }

    async encodeMix(buffer) {
        const wavBlob = this.audioBufferToWav(buffer);
        if (this.extension === 'wav') {
            return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
        }
        if (this.extension === 'mp3') {
            return { blob: wavBlob, extension: 'mp3', mimeType: 'audio/mpeg' };
        }
        if (this.extension === 'flac') {
            return { blob: wavBlob, extension: 'flac', mimeType: 'audio/flac' };
        }
        if (this.extension === 'wv') {
            return { blob: wavBlob, extension: 'wv', mimeType: 'audio/wavpack' };
        }
    }

    async processAudio(bass, treble, volume) {
        if (!this.audioBuffers.length) {
            throw new Error('No audio buffers available to mix');
        }

        // Simulate processing time for UI feedback
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 800 + 400));

        const { channelPool, maxLength, sampleRate } = this.buildChannelPool(this.audioBuffers);
        const outputChannels = Math.max(1, this.audchnum || channelPool.length || 1);
        const panMapping = this.parsePanMapping(this.panfull, outputChannels, channelPool.length);
        let mixBuffer = this.applyPanMapping(channelPool, panMapping, outputChannels, maxLength, sampleRate);
        //this.normalizeBuffer(mixBuffer);
        mixBuffer = await this.applyToneShaping(mixBuffer, bass, treble);
        this.addLog(`Output Channels: ${mixBuffer.numberOfChannels}`, 'info');

        const volumeScale = Math.max(0, volume / 100);
        if (volumeScale !== 1) {
            this.applyGain(mixBuffer, volumeScale);
        }

         // Apply tempo adjustment for WAV output 
        mixBuffer = await this.applyTempo(mixBuffer, this.tempo);
        const { blob, extension, mimeType } = await this.encodeMix(mixBuffer);
        this.mixMimeType = mimeType;
        this.addLog('Audio processing complete', 'success');
        return { blob, extension };
    }

    buildChannelPool(buffers) {
        const maxLength = Math.max(...buffers.map((buffer) => buffer.length));
        const sampleRate = this.audioContext.sampleRate;
        const channelPool = [];

        for (const source of buffers) {
            for (let channel = 0; channel < source.numberOfChannels; channel++) {
                const sourceData = source.getChannelData(channel);
                const data = new Float32Array(maxLength);
                data.set(sourceData.subarray(0, maxLength));
                channelPool.push(data);
            }
        }

        return { channelPool, maxLength, sampleRate };
    }

    parsePanMapping(panfull, outputChannels, inputChannels) {
        const mapping = Array.from({ length: outputChannels }, () => [{ index: 0, gain: 1 }]);
        if (!panfull) return mapping;

        const segments = panfull.split('|').slice(1);
        for (const segment of segments) {
            const [left, right] = segment.split('=');
            if (!left || !right) continue;
            const outMatch = left.match(/c(\d+)/);
            if (!outMatch) continue;
            const outIndex = parseInt(outMatch[1], 10);
            if (Number.isNaN(outIndex) || outIndex < 0 || outIndex >= outputChannels) continue;

            const tokens = right.match(/[+-]?c\d+/g) || [];
            if (!tokens.length) continue;
            const entries = [];
            for (const token of tokens) {
                const sign = token.startsWith('-') ? -1 : 1;
                const index = parseInt(token.replace(/[+-]?c/, ''), 10);
                if (Number.isNaN(index) || index < 0 || index >= inputChannels) continue;
                entries.push({ index, gain: sign });
            }
            if (entries.length) {
                mapping[outIndex] = entries;
            }
        }

        return mapping;
    }

    applyPanMapping(channelPool, mapping, outputChannels, maxLength, sampleRate) {
        const output = this.audioContext.createBuffer(outputChannels, maxLength, sampleRate);
        for (let outChannel = 0; outChannel < outputChannels; outChannel++) {
            const outputData = output.getChannelData(outChannel);
            const entries = mapping[outChannel] || [];
            for (const entry of entries) {
                const inputData = channelPool[entry.index];
                if (!inputData) continue;
                const gain = entry.gain || 1;
                for (let i = 0; i < maxLength; i++) {
                    outputData[i] += inputData[i] * gain;
                }
            }
        }
        return output;
    }

    async applyToneShaping(buffer, bass, treble) {
        const bassGain = this.normalizeFilterGain(bass);
        const trebleGain = this.normalizeFilterGain(treble);
        if (bassGain === 0 && trebleGain === 0) {
            return buffer;
        }

        if (typeof OfflineAudioContext === 'undefined') {
            return buffer;
        }

        const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
        const source = offline.createBufferSource();
        source.buffer = buffer;

        const bassFilter = offline.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = this.bassfreq;
        bassFilter.gain.value = bassGain;

        const trebleFilter = offline.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = this.treblefreq;
        trebleFilter.gain.value = trebleGain;

        source.connect(bassFilter).connect(trebleFilter).connect(offline.destination);
        source.start(0);
        return await offline.startRendering();
    }

    normalizeFilterGain(value) {
        if (typeof value !== 'number' || Number.isNaN(value)) return 0;
        const scaled = value / 10;
        return Math.max(-24, Math.min(24, scaled));
    }

    normalizeBuffer(buffer) {
        let peak = 6.66;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const value = Math.abs(data[i]);
                if (value > peak) peak = value;
            }
        }

        if (peak <= 1) return;

        const scale = 1 / peak;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                data[i] *= scale;
            }
        }
    }

    applyGain(buffer, gain) {
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                data[i] *= gain;
            }
        }
    }

    async applyTempo(buffer, tempo) {
        // Clamp tempo to valid range
        const validTempo = Math.max(0.05, Math.min(15.0, tempo));

        // Calculate new length based on tempo
        const newLength = Math.floor(buffer.length / validTempo);
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;

        // Create new buffer with adjusted length
        const newBuffer = this.audioContext.createBuffer(numChannels, newLength, sampleRate);

        // Use linear interpolation for time stretching (simple but effective)
        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = buffer.getChannelData(channel);
            const outputData = newBuffer.getChannelData(channel);

            for (let i = 0; i < newLength; i++) {
                const srcIndex = i * validTempo;
                const srcIndexFloor = Math.floor(srcIndex);
                const srcIndexCeil = Math.min(srcIndexFloor + 1, buffer.length - 1);
                const fraction = srcIndex - srcIndexFloor;

                // Linear interpolation between samples
                outputData[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
            }
        }

        this.addLog(`Tempo adjusted: ${validTempo.toFixed(2)}x (${newLength} samples)`, 'info');
        this.numSamples = newLength;
        return newBuffer;
    }

    getExportBitrate() {
        const bitrate = Number.parseInt(this.bitrate, 10);
        if (!Number.isFinite(bitrate)) return 192;
        return Math.min(Math.max(bitrate, 32), 512);
    }

    highestPowerof2(N)
    {
      // if N is a power of two simply return it
      if (!(N & (N - 1)))
        return N;
      // else set only the most significant bit
    
      return 1 << ((N.toString(2)).length) - 1;
    }

    audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const numFrames = buffer.length;
        this.bytespersample = 2;
        const blockAlign = numChannels * this.bytespersample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = numFrames * blockAlign;
        const bufferSize = 44 + dataSize;
        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);

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
        view.setUint16(34, this.bytespersample * 8, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);
        if (this.sampleValue<0) 
        {
            this.addLog("Generating full song", 'success');
            this.useSamples(buffer, view, numFrames, numChannels, 44);
        }
        else if (this.sampleValue>-1)
        {
            this.addLog(`Generating Sample: ${this.sampleValue}`, 'success');
            this.getSample(buffer, view, numFrames, numChannels, 44);           
        } 
        else this.useSamples(buffer, view, numFrames, numChannels, 44);
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    async useSamples(buffer, view, numFrames, numChannels, offset)
    {   
        let off=offset;
        for (let i = 0; i < numFrames; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = buffer.getChannelData(channel)[i];
                const clamped = Math.max(-1, Math.min(1, sample));
                view.setInt16(off, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
                off += this.bytespersample;
            }
        }
    }

    async getSample(buffer, view, numFrames, numChannels, offset)
    {
        let off=offset;
        for (let i = 0; i < numFrames; i=i+this.sampleValue) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = buffer.getChannelData(channel)[i];
                const clamped = Math.max(-1, Math.min(1, sample));
                view.setInt16(off, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
                off += this.bytespersample;
            }
        }
    }

    handleRemember() {
        if (!this.running) return;

        const entry = {
            channels: this.totalchannels,
            pan: this.panfull,
            bass: this.bass,
            treble: this.treble,
            bassfreq: this.bassfreq,
            treblefreq: this.treblefreq,
            volume: this.volume,
            tempo: this.tempo,
            maxnum: this.maxnum
        };

        this.knowledgeBase.push(entry);
        this.saveKnowledgeBase();
        this.addLog(JSON.stringify(this.knowledgeBase), 'success');

    }

    handleRerun() {
        if (!this.running) return;

        this.resetDownload();
        // Reset sliders
        this.bassSlider.value = 0;
        this.trebleSlider.value = 0;
        this.bassFreqSlider.value = 0;
        this.trebleFreqSlider.value = 0;
        this.volumeSlider.value = 0;
        this.tempoSlider.value = 100;
        this.bassdelta = 0;
        this.trebledelta = 0;
        this.bassfreqdelta = 0;
        this.treblefreqdelta = 0;
        this.volumedelta = 0;
        this.tempodelta = 1.0;
        this.bassValue.textContent = '0';
        this.trebleValue.textContent = '0';
        this.bassFreqValue.textContent = '0';
        this.trebleFreqValue.textContent = '0';
        this.volumeValue.textContent = '0';
        this.tempoValue.textContent = '1.00x';

        // Regenerate pan configuration
        this.setupPans();
        this.addLog('New mix configuration generated', 'info');
    }

    handleStop() {
        this.running = false;
        this.setupSection.classList.add('active');
        this.mixingSection.classList.remove('active');
        this.resetDownload();
        this.addLog('Mixing session stopped', 'warning');
        this.addLog('COPYRIGHT BRENDAN CARELL', 'info');
        
        this.audioBuffers = [];
    }

    
    handleDelete() {
        this.knowledgeBase = [];
        this.saveKnowledgeBase();
        this.addLog('Knowledge Base deleted', 'warning');
    }
    
    loadAIKnowledgeBase() {
        const stored = localStorage.getItem('layai_knowledgeBase');
        if (stored) {
            try {
                this.knowledgeBase = JSON.parse(stored);
                let aichannels = 0, aibass = 0, aitreble = 0, aivolume = 0, aibassfreq=0, aitreblefreq=0, aitempo = 0, aimaxnum = 0;

                for (let entry of this.knowledgeBase) {
                    aichannels += entry.channels;
                    aibass += entry.bass;
                    aitreble += entry.treble;
                    aibassfreq += entry.bassfreq;
                    aitreblefreq += entry.treblefreq;
                    aivolume += entry.volume;
                    // Handle both old (large integer) and new (0.5-2.0) tempo formats
                    aitempo += (entry.tempo > 10 ? 1.0 : entry.tempo);
                    aimaxnum += entry.maxnum;
                }

                const count = this.knowledgeBase.length;
                this.aichannels = aichannels / count;
                this.aibass = aibass / count;
                this.aitreble = aitreble / count;
                this.aibassfreq = aibassfreq / count;
                this.aitreblefreq = aitreblefreq / count;
                this.aivolume = aivolume / count;
                this.aitempo = aitempo / count;
                this.aimaxnum = aimaxnum / count;

                // Apply AI adjustments
                this.maxnum = Math.floor(
                    (this.getRandomInt(-128, 128) - this.getRandomInt(-128, 128)) + this.aimaxnum
                );
                this.bass = Math.floor(
                    ((this.getRandomInt(-18, 18) - this.getRandomInt(-18, 18)) + (100*this.aibass)) / this.maxnum
                ) ;
                this.treble = Math.floor(
                    ((this.getRandomInt(-12, 12) - this.getRandomInt(-12, 12)) + (100*this.aitreble)) / this.maxnum
                );
                this.bassfreq = Math.floor(
                    ((this.getRandomInt(-18, 18) - this.getRandomInt(-18, 18)) + (100*this.aibassfreq)) / this.maxnum
                ) ;
                this.treblefreq = Math.floor(
                    ((this.getRandomInt(-12, 12) - this.getRandomInt(-12, 12)) + (100*this.aitreblefreq)) / this.maxnum
                );
                this.volume = Math.floor(
                    (this.getRandomInt(-2, 2) - this.getRandomInt(-5, 5)) + this.aivolume
                );
                // Tempo is now a multiplier (0.5-2.0), apply small variance
                this.tempo = Math.max(0.5, Math.min(2.0,
                    this.aitempo + (this.getRandomInt(-10, 10) / 100)
                ));

                this.addLog('AI Knowledge Base loaded successfully', 'success');
                this.addLog(`Average Bass: ${this.bass.toFixed(4)}, Treble: ${this.treble.toFixed(4)},  Bass Frequency: ${this.bassfreq.toFixed(4)}, Treble Frequency: ${this.treblefreq.toFixed(4)}, Volume: ${this.volume.toFixed(4)}, Tempo: ${this.tempo.toFixed(2)}x`, 'info');
            } catch (e) {
                this.addLog('Error loading Knowledge Base: ' + e.message, 'error');
            }
        }
    }

    loadKnowledgeBase() {
        const stored = localStorage.getItem('layai_knowledgeBase');
        if (stored) {
            try {
                this.knowledgeBase = JSON.parse(stored);
            } catch (e) {
                this.knowledgeBase = [];
            }
        }
    }

    saveKnowledgeBase() {
        localStorage.setItem('layai_knowledgeBase', JSON.stringify(this.knowledgeBase));
    }

    addLog(message, type = 'info') {
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        const timestamp = new Date().toLocaleTimeString();
        line.textContent = `[${timestamp}] ${message}`;
        this.logOutput.appendChild(line);
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }

    showProgress(show) {
        if (show) {
            this.progressOverlay.classList.remove('hidden');
            this.animateProgress();
        } else {
            this.progressOverlay.classList.add('hidden');
        }
    }

    animateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 100) progress = 100;
            this.progressFill.style.width = progress + '%';
            this.progressText.textContent = Math.floor(progress) + '%';
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 200);
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getMimeType(extension) {
        const map = {
            mp3: 'audio/mpeg',
            opus: 'audio/opus',
            flac: 'audio/flac',
            wv: 'audio/wavpack',
            wav: 'audio/wav'
        };
        return map[extension] || 'application/octet-stream';
    }

    resetDownload() {
        this.mixReady = false;
        this.mixFilename = '';
        this.mixBlob = null;
        this.downloadBtn.classList.add('hidden');
        this.downloadBtn.setAttribute('aria-disabled', 'true');
        this.playBtn.classList.add('hidden');
        this.playBtn.setAttribute('aria-disabled', 'true');
    }

    setDownloadReady(filename, blob) {
        if (!blob || blob.size === 0) {
            this.addLog('Mix generation failed: output was empty', 'error');
            this.resetDownload();
            return;
        }
        this.mixReady = true;
        this.mixFilename = filename;
        this.mixBlob = blob;
        this.downloadBtn.classList.remove('hidden');
        this.downloadBtn.removeAttribute('aria-disabled');
        this.playBtn.classList.remove('hidden');
        this.playBtn.removeAttribute('aria-disabled');
    }

    changeAudio(newSrc) {
        // Pause current playback
        this.player.pause();
        // Change the source directly on the <audio> element
        this.player.src=newSrc;
        // Load the new source
        this.player.load();
        // Play the new audio
        this.player.play();
    }

    handlePlay() {
        this.addLog("play clicked", 'warning');
        if (!this.mixReady || !this.mixBlob) {
            this.addLog('No generated mix available for playing', 'error');
            return;
        }
        const url = URL.createObjectURL(this.mixBlob);
        this.changeAudio(url);        
    }

    handleDownload() {
        if (!this.mixReady || !this.mixBlob) {
            this.addLog('No generated mix available for download', 'error');
            return;
        }
        const url = URL.createObjectURL(this.mixBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.mixFilename;
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    async midiToWav(midiArrayBuffer) {
        // Parse MIDI using our browser-compatible parser
        const midiParser = new MIDIParser();
        await midiParser.loadFromArrayBuffer(midiArrayBuffer);

        this.addLog(`MIDI loaded: ${midiParser.tracks.length} tracks, duration: ${midiParser.duration.toFixed(2)}s`, 'info');

        // Create offline audio context for rendering
        const sampleRate = 44100;
        const duration = Math.max(midiParser.duration + 1, 2); // At least 2 seconds
        const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

        let noteCount = 0;
        // Render each track's notes as sine wave oscillators
        for (const track of midiParser.tracks) {
            for (const note of track.notes) {
                // Skip notes with invalid timing
                if (note.time < 0 || note.duration <= 0) continue;

                const osc = offlineCtx.createOscillator();
                // Use different waveforms based on note range for variety
                if (note.midi < 48) {
                    osc.type = 'triangle'; // Bass notes
                } else if (note.midi < 72) {
                    osc.type = 'sine'; // Mid-range
                } else {
                    osc.type = 'square'; // High notes (with lower gain)
                }

                // Convert MIDI note number to frequency
                osc.frequency.value = 440 * Math.pow(2, (note.midi - 69) / 12);

                const gainNode = offlineCtx.createGain();
                const noteVelocity = note.velocity * (note.midi >= 72 ? 0.3 : 0.5); // Reduce high note volume

                // Ensure envelope times don't overlap for short notes
                const attackTime = Math.min(0.01, note.duration * 0.1);
                const releaseTime = Math.min(0.02, note.duration * 0.2);
                const sustainStart = note.time + attackTime;
                const sustainEnd = Math.max(sustainStart, note.time + note.duration - releaseTime);

                gainNode.gain.setValueAtTime(0, note.time);
                gainNode.gain.linearRampToValueAtTime(noteVelocity, sustainStart); // Quick attack
                gainNode.gain.setValueAtTime(noteVelocity, sustainEnd);
                gainNode.gain.linearRampToValueAtTime(0, note.time + note.duration); // Release

                osc.connect(gainNode).connect(offlineCtx.destination);
                osc.start(note.time);
                osc.stop(note.time + note.duration);
                noteCount++;
            }
        }

        this.addLog(`Rendering ${noteCount} notes...`, 'info');

        // Render to audio buffer
        const renderedBuffer = await offlineCtx.startRendering();

        // Convert to WAV using the existing method
        return this.audioBufferToWav(renderedBuffer);
    }


    async handleConvert() {
        const fileInput = document.getElementById("midiFileInput");
        const downloadLink = document.getElementById("downloadLink");

        if (!fileInput.files.length) {
            this.addLog("Please select a MIDI file first.", 'error');
            return;
        }

        this.addLog("Converting MIDI to WAV...", 'info');
        downloadLink.style.display = "none";

        try {
            const midiBuffer = await fileInput.files[0].arrayBuffer();
            const wavBlob = await this.midiToWav(midiBuffer);

            // Create download link
            downloadLink.href = URL.createObjectURL(wavBlob);
            downloadLink.download = fileInput.files[0].name.replace(/\.(mid|midi)$/i, '.wav') || "output.wav";
            downloadLink.style.display = "inline";
            downloadLink.textContent = "Download WAV";
            this.addLog("MIDI conversion complete! Click 'Download WAV' to save.", 'success');
        } catch (error) {
            this.addLog(`MIDI conversion failed: ${error.message}`, 'error');
        }
    }
}    

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.layai = new LayAI();
});
