import { Visualizer } from './visualizer.js';
import { MIDIParser } from './midiparser.js';
import { getFFmpegInstance, runFFmpegCommand } from './ffmpeg.js';
// LayAI - Complete JavaScript Implementation
class LayAI {
    constructor() {
        // Expose checkboxes globally for Visualizer after DOM is ready
        setTimeout(() => {
            if (typeof window !== 'undefined') {
                window.layaiVisualizerCheckboxes = this.visualizerCheckboxes;
            }
        }, 0);
        // Visualizer checkboxes
        this.visualizerCheckboxes = {
            star: document.getElementById('showStarField'),
            waveform: document.getElementById('showWaveform'),
            average: document.getElementById('showAverage'),
            bar: document.getElementById('showBarGraph'),
            rings: document.getElementById('showRings'),
            spiral: document.getElementById('showSpiral'),
            radial: document.getElementById('showRadialBars'),
            glitch: document.getElementById('showGlitch'),
            piano: document.getElementById('showPianoRoll'),
            random: document.getElementById('visualizerRandom')
        };
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
        this.volume = this.getRandomInt(10, 31415) / 366;
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
        this.extension = "wav";
        this.bitrate = 320;
        this.channels = [];
        this.pan = {};
        this.trackPans = [];
        this.audioContext = null;
        this.audioBuffers = [];
        this.samples = [];
        this.sampleBlobs = [];
        this.knowledgeBase = [];
        this.mixBlob = null;
        this.visualizerObj = null;
        this.mixMimeType = 'audio/wav';
        this.midiVisualData = null;

        // DOM Elements
        this.audioSource = document.getElementById('audioSource');
        this.player = document.getElementById('player');
        this.setupSection = document.getElementById('setupSection');
        this.mixingSection = document.getElementById('mixingSection');
        this.startBtn = document.getElementById('startBtn');
        this.generateBtn = document.getElementById('generateBtn');
        this.rememberBtn = document.getElementById('rememberBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.rerunBtn = document.getElementById('rerunBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.convertBtn = document.getElementById('convertBtn');
        this.playBtn = document.getElementById('playBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.exportVideoBtn = document.getElementById('exportVideoBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.logOutput = document.getElementById('logOutput');
        this.progressOverlay = document.getElementById('progressOverlay');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.extensionSelect = document.getElementById('extension');
        this.visualizer = document.getElementById('visualizer');
        this.currentObjectUrl = null;
        this.hasAutoPlayedFirstMix = false;
        this.userGestureSeen = false;

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
        this.bpmInput = document.getElementById('bpmInput');
        this.bpmValue = document.getElementById('bpmValue');
        this.bpmUserSet = false;
        this.baseBpmDetected = 120;
        
        // Display elements
        this.maxNumDisplay = document.getElementById('maxNumDisplay');
        this.totalChannelsDisplay = document.getElementById('totalChannelsDisplay');
        this.panDisplay = document.getElementById('panDisplay');
        this.generatedFilenameDisplay = document.getElementById('generatedFilename');
        this.vendorStatusDisplay = document.getElementById('vendorStatus');

        this.setRandomVisualizerDefaults();
        this.initEventListeners();
        this.updateOutputFormatOptions();
        this.loadKnowledgeBase();
        this.resetDownload();
        // Check vendor assets presence and update UI
        this.checkVendorAssets();
        this.fetchFile = null;
        const hostname = location.hostname.toLowerCase();
        const isProduction = hostname.includes('layai.ca') || hostname.includes('layeraudio') || hostname.includes('github.io');
        const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';       
        const isSecure = location.protocol === 'https:';
        const shouldForceHttps = location.protocol === 'http:' && !isLocalDev;
        if (shouldForceHttps) {
            this.addLog("Connection not secure", "warning");
            const httpsUrl = new URL(location.href);
            httpsUrl.protocol = 'https:';
            location.replace(httpsUrl.toString());
            return;
        }
    }

    // Fully decode all audio files with progress bar
    async decodeAllAudioFilesWithProgress() {
        this.showProgress(true, 'Decoding audio...', { animate: false });
        this.audioBuffers = [];
        for (let i = 0; i < this.songs.length; i++) {
            const song = this.songs[i];
            const arrayBuffer = await this.readFile(song);
            try {
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.audioBuffers.push(audioBuffer);
                this.addLog(`Decoded ${song.name} (${audioBuffer.numberOfChannels} channels)`, 'info');
            } catch (e) {
                this.addLog(`Error decoding ${song.name}: ${e.message}`, 'error');
            }
            // Update progress bar
            const percent = Math.floor(((i + 1) / this.songs.length) * 100);
            this.progressFill.style.width = percent + '%';
            this.progressText.textContent = `Decoding audio... ${percent}%`;
        }
        this.showProgress(false);
        this.addLog('All audio files fully decoded and ready for mixing.', 'success');
        this.setDetectedBpmFromBuffers();
        this.mixReadyToGenerate = true;
        this.generateBtn.disabled = false;
        this.handleGenerate();
        //if (this.audio.paused) this.handlePlay();
    }

    setDetectedBpmFromBuffers() {
        if (!this.bpmInput || !this.audioBuffers || !this.audioBuffers.length) return;
        const primary = this.audioBuffers[0];
        const detected = this.estimateBpmFromBuffer(primary);
        if (detected && Number.isFinite(detected)) {
            this.baseBpmDetected = detected;
        }
        if (!this.bpmUserSet) {
            const nextBpm = Math.round(this.baseBpmDetected * (this.tempodelta || 1));
            this.bpmInput.value = Math.max(20, Math.min(300, nextBpm));
        }
        if (this.bpmValue) {
            const display = this.bpmUserSet ? this.bpmInput.value : `Auto (${this.bpmInput.value || Math.round(this.baseBpmDetected)})`;
            this.bpmValue.textContent = display;
        }
        this.addLog(`Detected BPM: ${Math.round(this.baseBpmDetected)}`, 'info');
    }

    ChangeUrl(title, url) 
    {
        window.history.pushState({ path: url }, title, url);
    }

    async checkVendorAssets() {
        const vendorFiles = [
            { path: 'vendor/lame.min.js', name: 'lamejs' },
            { path: 'vendor/ffmpeg.min.js', name: 'ffmpeg' }
        ];
        const results = {};
        for (const vf of vendorFiles) {
            try {
                // Try a HEAD fetch to check existence
                const res = await fetch(vf.path, { method: 'HEAD' });
                results[vf.name] = res.ok;
            } catch (e) {
                results[vf.name] = false;
            }
        }

        let text;
        if (results.lamejs && results.ffmpeg) {
            text = 'Available (lame, ffmpeg)';
            if (this.vendorStatusDisplay) this.vendorStatusDisplay.style.color = 'green';
        } else if (results.lamejs || results.ffmpeg) {
            const parts = [];
            if (results.lamejs) parts.push('lame');
            if (results.ffmpeg) parts.push('ffmpeg');
            text = `Partial (${parts.join(', ')}) - CDN fallback will be used for missing assets`;
            if (this.vendorStatusDisplay) this.vendorStatusDisplay.style.color = 'orange';
        } else {
            text = 'Not present - CDN fallback will be used';
            if (this.vendorStatusDisplay) this.vendorStatusDisplay.style.color = 'red';
        }
        if (this.vendorStatusDisplay) this.vendorStatusDisplay.textContent = text;
        // Also log
        this.addLog('Vendor assets check: ' + text, 'info');
        return results;
    }

    async updateVisualizerModes() {
        // If random/cycle mode is checked, let Visualizer handle rotation
        if (this.visualizerCheckboxes.random && this.visualizerCheckboxes.random.checked) {
            if (this.visualizerObj && typeof this.visualizerObj.enableCycleMode === 'function') {
                this.visualizerObj.enableCycleMode(true);
            }
            return;
        }
        const maxActive = 4;
        const enforceLimit = () => {
              const list = [
                  this.visualizerCheckboxes.star,
                  this.visualizerCheckboxes.waveform,
                  this.visualizerCheckboxes.average,
                  this.visualizerCheckboxes.bar,
                  this.visualizerCheckboxes.rings,
                  this.visualizerCheckboxes.spiral,
                  this.visualizerCheckboxes.radial,
                  this.visualizerCheckboxes.piano
              ].filter(Boolean);
            const active = list.filter(cb => cb.checked);
            if (active.length > maxActive) {
                const toDisable = active.slice(0, active.length - maxActive);
                toDisable.forEach(cb => { cb.checked = false; });
            }
        };

        enforceLimit();
        // Otherwise, set visualizer flags directly
        if (this.visualizerObj) {
            this.visualizerObj.SHOW_STAR_FIELD = !!this.visualizerCheckboxes.star.checked;
            this.visualizerObj.SHOW_WAVEFORM = !!this.visualizerCheckboxes.waveform.checked;
            this.visualizerObj.SHOW_AVERAGE = !!this.visualizerCheckboxes.average.checked;
              this.visualizerObj.SHOW_BAR_GRAPH = !!this.visualizerCheckboxes.bar.checked;
              if (this.visualizerObj.SHOW_RINGS !== undefined) {
                  this.visualizerObj.SHOW_RINGS = !!(this.visualizerCheckboxes.rings && this.visualizerCheckboxes.rings.checked);
              }
              if (this.visualizerObj.SHOW_SPIRAL !== undefined) {
                  this.visualizerObj.SHOW_SPIRAL = !!(this.visualizerCheckboxes.spiral && this.visualizerCheckboxes.spiral.checked);
              }
              if (this.visualizerObj.SHOW_RADIAL_BARS !== undefined) {
                  this.visualizerObj.SHOW_RADIAL_BARS = !!(this.visualizerCheckboxes.radial && this.visualizerCheckboxes.radial.checked);
              }
              if (this.visualizerObj.SHOW_PIANO_ROLL !== undefined) {
                  const enabled = !!(this.visualizerCheckboxes.piano && this.visualizerCheckboxes.piano.checked);
                  this.visualizerObj.SHOW_PIANO_ROLL = enabled && !!this.midiVisualData;
              }
              if (typeof this.visualizerObj.enableCycleMode === 'function') {
                  this.visualizerObj.enableCycleMode(false);
              }
        }
    }

    setRandomVisualizerDefaults() {
          const pool = [
              this.visualizerCheckboxes.star,
              this.visualizerCheckboxes.waveform,
              this.visualizerCheckboxes.average,
              this.visualizerCheckboxes.bar,
              this.visualizerCheckboxes.rings,
              this.visualizerCheckboxes.spiral,
              this.visualizerCheckboxes.radial,
              this.visualizerCheckboxes.piano
          ].filter(Boolean);
        if (!pool.length) return;
        // Clear all first
        pool.forEach(cb => {
            cb.checked = false;
        });
        // Pick 1-4 random visualizers
        const count = 1 + Math.floor(Math.random() * Math.min(4, pool.length));
        const shuffled = pool.sort(() => Math.random() - 0.5);
        for (let i = 0; i < count; i++) {
            shuffled[i].checked = true;
        }
    }

    initEventListeners() {
        const markUserGesture = () => {
            this.userGestureSeen = true;
            window.removeEventListener('pointerdown', markUserGesture);
            window.removeEventListener('keydown', markUserGesture);
        };
        window.addEventListener('pointerdown', markUserGesture, { once: true });
        window.addEventListener('keydown', markUserGesture, { once: true });
                // Visualizer checkbox listeners
                Object.values(this.visualizerCheckboxes).forEach(cb => {
                    if (cb) cb.addEventListener('change', () => {
                        this.updateVisualizerModes();
                        // Update global reference to always reflect current state
                        if (typeof window !== 'undefined') {
                            window.layaiVisualizerCheckboxes = this.visualizerCheckboxes;
                        }
                    });
                });
        this.playBtn.addEventListener('click', () => this.handlePlay());
        this.convertBtn.addEventListener('click', () => this.handleConvert());
        this.startBtn.addEventListener('click', () => {
            this.handleStart().catch((e) => {
                this.addLog('Start failed: ' + (e && e.message ? e.message : e), 'error');
            });
        });
        this.generateBtn.addEventListener('click', () => {
            this.userGestureSeen = true;
            this.handleGenerate();
        });
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        if (this.exportVideoBtn) {
            this.exportVideoBtn.addEventListener('click', () => {
                this.handleExportVideo().catch((e) => {
                    this.addLog('Video export failed: ' + (e && e.message ? e.message : e), 'error');
                });
            });
        }
        this.rememberBtn.addEventListener('click', () => this.handleRemember());
        if (this.rerunBtn) {
            this.rerunBtn.addEventListener('click', () => this.handleRerun());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.handleReset());
        }
        this.stopBtn.addEventListener('click', () => this.handleStop());
        this.deleteBtn.addEventListener('click', () => this.handleDelete());
        // Manual vendor assets check button
        const vendorCheckBtn = document.getElementById('vendorCheckBtn');
        if (vendorCheckBtn) {
            vendorCheckBtn.addEventListener('click', async () => {
                try {
                    vendorCheckBtn.disabled = true;
                    const orig = vendorCheckBtn.textContent;
                    vendorCheckBtn.textContent = 'Checking...';
                    await this.checkVendorAssets();
                    vendorCheckBtn.textContent = orig;
                } catch (e) {
                    this.addLog('Manual vendor check failed: ' + (e && e.message ? e.message : e), 'error');
                } finally {
                    vendorCheckBtn.disabled = false;
                }
            });
        }
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

        if (this.tempoSlider) {
            this.tempoSlider.addEventListener('input', (e) => {
                this.tempodelta = parseInt(e.target.value) / 100; // Convert to multiplier (50-200 -> 0.5-2.0)
                if (this.tempoValue) this.tempoValue.textContent = this.tempodelta.toFixed(2) + 'x';
                if (this.bpmInput && !this.bpmUserSet) {
                    const nextBpm = Math.round(this.baseBpmDetected * this.tempodelta);
                    this.bpmInput.value = Math.max(20, Math.min(300, nextBpm));
                    if (this.bpmValue) this.bpmValue.textContent = `Auto (${this.bpmInput.value})`;
                }
            });
        }
    
        if (this.sampleNumber) {
            this.sampleNumber.addEventListener('input', (e) => {
                this.samplenum = parseInt(e.target.value);
                if (this.sampleValue) this.sampleValue.textContent = this.samplenum;
            });
        }
        if (this.bpmInput) {
            this.bpmInput.addEventListener('input', (e) => {
                const bpm = parseFloat(e.target.value);
                if (Number.isFinite(bpm)) {
                    this.bpmUserSet = true;
                    if (this.bpmValue) this.bpmValue.textContent = e.target.value;
                }
            });
        }
    }

    async handleStart() {
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
        this.songs = await this.ensureInputFilesReady(Array.from(songInput.files));
        if (!this.songs.length) {
            this.addLog('No valid audio files available after MIDI conversion.', 'error');
            return;
        }

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

    isMidiFile(file) {
        if (!file) return false;
        const name = (file.name || '').toLowerCase();
        const type = (file.type || '').toLowerCase();
        return name.endsWith('.mid') ||
            name.endsWith('.midi') ||
            type === 'audio/midi' ||
            type === 'audio/mid' ||
            type === 'audio/x-midi' ||
            type === 'application/x-midi' ||
            type === 'application/midi';
    }

    isCdaFile(file) {
        if (!file) return false;
        const name = (file.name || '').toLowerCase();
        const type = (file.type || '').toLowerCase();
        return name.endsWith('.cda') || type === 'application/x-cda' || type === 'audio/x-cda';
    }

    async convertMidiFileToWavFile(file) {
        const midiBuffer = await file.arrayBuffer();
        if (!this.midiVisualData) {
            try {
                this.midiVisualData = await this.parseMidiForVisualizer(midiBuffer, file.name);
                if (this.visualizerCheckboxes && this.visualizerCheckboxes.piano) {
                    const pool = [
                        this.visualizerCheckboxes.star,
                        this.visualizerCheckboxes.waveform,
                        this.visualizerCheckboxes.average,
                        this.visualizerCheckboxes.bar,
                        this.visualizerCheckboxes.rings,
                        this.visualizerCheckboxes.spiral,
                        this.visualizerCheckboxes.radial,
                        this.visualizerCheckboxes.glitch,
                        this.visualizerCheckboxes.piano
                    ].filter(Boolean);
                    const anyChecked = pool.some(cb => cb.checked);
                    if (!anyChecked) {
                        this.visualizerCheckboxes.piano.checked = true;
                        if (typeof window !== 'undefined') {
                            window.layaiVisualizerCheckboxes = this.visualizerCheckboxes;
                        }
                    }
                }
            } catch (e) {
                this.addLog(`MIDI visual parse failed for ${file.name}: ${e && e.message ? e.message : e}`, 'warning');
            }
        } else {
            this.addLog(`Multiple MIDI files detected; piano roll will use ${this.midiVisualData.sourceName || 'the first MIDI file'}.`, 'warning');
        }
        const wavBlob = await this.midiToWav(midiBuffer);
        const outputName = file.name.replace(/\.(mid|midi)$/i, '.wav') || 'midi.wav';
        return new File([wavBlob], outputName, { type: 'audio/wav' });
    }

    async parseMidiForVisualizer(midiArrayBuffer, sourceName = '') {
        const parser = new MIDIParser();
        await parser.loadFromArrayBuffer(midiArrayBuffer);
        const notes = [];
        for (let t = 0; t < parser.tracks.length; t++) {
            const track = parser.tracks[t];
            if (!track || !track.notes) continue;
            for (const note of track.notes) {
                if (note.time < 0 || note.duration <= 0) continue;
                notes.push({
                    time: note.time,
                    duration: note.duration,
                    midi: note.midi,
                    velocity: note.velocity,
                    track: t
                });
            }
        }
        notes.sort((a, b) => a.time - b.time);
        return {
            notes,
            duration: parser.duration || 0,
            sourceName
        };
    }

    applyMidiToVisualizer() {
        if (!this.visualizerObj || typeof this.visualizerObj.setMidiNotes !== 'function') return;
        if (this.midiVisualData && this.midiVisualData.notes && this.midiVisualData.notes.length) {
            this.visualizerObj.setMidiNotes(this.midiVisualData);
        } else {
            this.visualizerObj.setMidiNotes(null);
        }
    }

    async ensureInputFilesReady(files) {
        const converted = [];
        let midiCount = 0;
        let cdaCount = 0;
        let midiProgressShown = false;
        for (const file of files) {
            if (this.isCdaFile(file)) {
                cdaCount++;
                this.addLog(`CDA detected: ${file.name}. Audio CD tracks can't be read directly by the browser.`, 'error');
                this.addLog('Please rip the CD track to WAV/FLAC/MP3 and select that file instead.', 'info');
                continue;
            }
            if (this.isMidiFile(file)) {
                if (!midiProgressShown) {
                    midiProgressShown = true;
                    this.showProgress(true, 'Converting MIDI...');
                }
                midiCount++;
                this.addLog(`MIDI detected: ${file.name}. Converting to WAV...`, 'info');
                try {
                    const wavFile = await this.convertMidiFileToWavFile(file);
                    converted.push(wavFile);
                    this.addLog(`MIDI converted: ${file.name} -> ${wavFile.name}`, 'success');
                } catch (e) {
                    this.addLog(`MIDI conversion failed for ${file.name}: ${e && e.message ? e.message : e}`, 'error');
                }
            } else {
                converted.push(file);
            }
        }
        if (midiProgressShown) {
            this.showProgress(false);
        }
        if (midiCount > 0) {
            const suffix = midiCount === 1 ? '' : 's';
            this.addLog(`Auto-converted ${midiCount} MIDI file${suffix} to WAV for mixing.`, 'info');
        }
        if (cdaCount > 0) {
            const suffix = cdaCount === 1 ? '' : 's';
            this.addLog(`Skipped ${cdaCount} CDA file${suffix}. Rip them to audio files first.`, 'warning');
        }
        return converted;
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
            let shortBuffer = arrayBuffer;
            if (arrayBuffer.byteLength > 200000) {
                shortBuffer = arrayBuffer.slice(0, 200000);
            }
            try {
                const audioBuffer = await this.audioContext.decodeAudioData(shortBuffer);
                this.channels[this.count] = audioBuffer.numberOfChannels;
                this.totalchannels += audioBuffer.numberOfChannels;
                this.addLog(`Song ${this.count + 1}: ${song.name} (${audioBuffer.numberOfChannels} channels)`, 'info');
                this.count++;
            } catch (e) {
                try {
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.channels[this.count] = audioBuffer.numberOfChannels;
                    this.totalchannels += audioBuffer.numberOfChannels;
                    this.addLog(`Song ${this.count + 1}: ${song.name} (${audioBuffer.numberOfChannels} channels, fallback full decode)`, 'info');
                    this.count++;
                } catch (e2) {
                    this.addLog(`Error decoding ${song.name}: ${e2.message}`, 'error');
                }
            }
        }
        this.addLog('SONG COUNT DONE', 'success');
        this.addLog(`Total Channels: ${this.totalchannels}`, 'info');
        this.setupPans();
        // After channel count, start full decode with progress
        this.mixReadyToGenerate = false;
        this.generateBtn.disabled = true;
        setTimeout(() => this.decodeAllAudioFilesWithProgress(), 100);
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

        // Render per-track pan editor UI
        try { this.renderPanEditor(); } catch (e) { this.addLog('Pan editor render failed: ' + (e && e.message ? e.message : e), 'error'); }

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
        this.showProgress(true, 'Generating mix...');

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
            this.updateMixPlayback(blob, { preserveTime: true, autoPlay: null });
            if (!this.hasAutoPlayedFirstMix && this.userGestureSeen) {
                this.hasAutoPlayedFirstMix = true;
                this.handlePlay();
            }
            this.showProgress(false);
        } catch (e) {
            this.addLog(`Error generating mix: ${e.message}`, 'error');
            this.showProgress(false);
        }
    }

    async encodeMix(buffer) {
        if (window.layaiRenderer && window.layaiRenderer.encodeAudioBuffer) {
            return await window.layaiRenderer.encodeAudioBuffer(buffer, {
                extension: this.extension || 'wav',
                bitrate: this.getExportBitrate()
            });
        }
        const wavBlob = this.audioBufferToWav(buffer);
        if (this.extension === 'wav') {
            return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
        }

        // MP3 export using lamejs (dynamically loaded if needed)
        if (this.extension === 'mp3') {
            try {
                // Prefer local vendor copy to avoid CDN latency, fallback to CDN
                try {
                    await this.ensureScript('vendor/lame.min.js');
                } catch (e) {
                    await this.ensureScript('https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js');
                }
                const Mp3Encoder = (window.lamejs && window.lamejs.Mp3Encoder) || window.Mp3Encoder || (window.lame && window.lame.Mp3Encoder);
                if (!Mp3Encoder) {
                    this.addLog('Mp3 encoder not available; falling back to WAV', 'warning');
                    return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
                }

                const numChannels = Math.min(2, buffer.numberOfChannels || 1);
                const sampleRate = buffer.sampleRate || 44100;

                const leftData = buffer.getChannelData(0);
                const rightData = numChannels === 2 ? buffer.getChannelData(1) : null;

                const bitrate = Math.max(32, Math.min(320, Math.round(this.getExportBitrate() || 128)));
                const mp3enc = new Mp3Encoder(numChannels, sampleRate, bitrate);

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
                this.addLog('MP3 encoding failed: ' + (e && e.message ? e.message : e), 'error');
                return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
            }
        }

        // Opus export via MediaRecorder (records playback into an Opus container)
        if (this.extension === 'opus' || this.extension === 'ogg' || this.extension === 'webm') {
            const candidates = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus'];
            for (const mime of candidates) {
                if (!window.MediaRecorder || (MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mime))) continue;
                try {
                    const blob = await this.recordWithMediaRecorder(buffer, mime);
                    const ext = mime.includes('ogg') ? 'opus' : 'webm';
                    return { blob, extension: ext, mimeType: mime };
                } catch (err) {
                    // try next candidate
                }
            }
            this.addLog('Opus recording not supported; falling back to WAV', 'warning');
            return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
        }

        // FLAC support: try ffmpeg.wasm if available, otherwise fallback to WAV
        if (this.extension === 'flac') {
            try {
                // Prefer local vendor copy to avoid CDN latency, fallback to CDN
                try {
                    await this.ensureScript('vendor/ffmpeg.min.js');
                } catch (e) {
                    await this.ensureScript('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');
                }
                const createFFmpeg = window.createFFmpeg || (window.FFmpeg && window.FFmpeg.createFFmpeg) || null;
                const fetchFile = window.fetchFile || (window.FFmpeg && window.FFmpeg.fetchFile) || null;
                if (!createFFmpeg) throw new Error('ffmpeg.wasm createFFmpeg not found');

                // Prefer local ffmpeg core when vendored, otherwise fall back to CDN core
                let corePath = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js';
                try {
                    await this.ensureScript('vendor/ffmpeg-core.js');
                    corePath = 'vendor/ffmpeg-core.js';
                } catch (err) {
                    // try CDN core if local not available
                    try { await this.ensureScript(corePath); } catch (e) { /* ignore */ }
                }
                const ffmpeg = createFFmpeg({ log: false, corePath });
                await ffmpeg.load();
                // write input wav
                const inputName = 'input.wav';
                const outputName = 'output.flac';
                const arrayBuffer = await wavBlob.arrayBuffer();
                ffmpeg.FS('writeFile', inputName, new Uint8Array(arrayBuffer));
                await ffmpeg.run('-i', inputName, '-c:a', 'flac', '-compression_level', '5', outputName);
                const out = ffmpeg.FS('readFile', outputName);
                const flacBlob = new Blob([out.buffer], { type: 'audio/flac' });
                return { blob: flacBlob, extension: 'flac', mimeType: 'audio/flac' };
            } catch (e) {
                this.addLog('FLAC encoding via ffmpeg.wasm failed: ' + (e && e.message ? e.message : e), 'warning');
                this.addLog('Falling back to WAV for FLAC export', 'warning');
                return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
            }
        }

        // WavPack not implemented in-browser; fallback to WAV
        if (this.extension === 'wv') {
            this.addLog('WavPack export is not available in-browser; returning WAV fallback', 'warning');
            return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
        }

        // Default fallback
        this.addLog('Unknown extension requested; returning WAV', 'warning');
        return { blob: wavBlob, extension: 'wav', mimeType: 'audio/wav' };
    }

    // Helper: dynamically load a script if not already present
    ensureScript(url) {
        return new Promise((resolve, reject) => {
            if (!url) return reject(new Error('No script URL provided'));
            const already = Array.from(document.getElementsByTagName('script')).some(s => s.src && s.src.indexOf(url) !== -1);
            if (already) return resolve();
            const s = document.createElement('script');
            s.src = url;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load ' + url));
            document.head.appendChild(s);
        });
    }

    // Helper: convert Float32Array [-1..1] to Int16Array
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

    // Helper: interleave two Float32Array channels into a single Float32Array
    interleave(left, right) {
        const length = left.length + right.length;
        const result = new Float32Array(length);
        let index = 0, inputIndex = 0;
        while (index < length) {
            result[index++] = left[inputIndex];
            result[index++] = right[inputIndex];
            inputIndex++;
        }
        return result;
    }

    // Helper: play an AudioBuffer into a MediaStreamDestination and record with MediaRecorder
    recordWithMediaRecorder(buffer, mimeType) {
        return new Promise(async (resolve, reject) => {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioCtx();
                const src = ctx.createBufferSource();
                src.buffer = buffer;
                const dest = ctx.createMediaStreamDestination();
                src.connect(dest);
                // Also connect to destination so browser may pass audio (optional)
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

    async processAudio(bass, treble, volume) {
        if (!this.audioBuffers.length) {
            throw new Error('No audio buffers available to mix');
        }

        // Simulate processing time for UI feedback
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 800 + 400));

        const { channelPool, maxLength, sampleRate } = this.buildChannelPool(this.audioBuffers);
        const outputChannels = Math.max(1, this.audchnum || channelPool.length || 1);
        let mixBuffer = null;
        let attempts = 0;
        const maxRetries = 2;

        while (attempts <= maxRetries) {
            let panMapping = this.parsePanMapping(this.panfull, outputChannels, channelPool.length);
            if (this.sampleValue != null && this.sampleValue > -1) {
                const seed = this.remixSeed || this.sampleValue || 0;
                panMapping = this.rotatePanMapping(panMapping, outputChannels, channelPool.length, seed);
            }
            mixBuffer = this.applyPanMapping(channelPool, panMapping, outputChannels, maxLength, sampleRate);

            if (volume > 0 && this.isBufferSilent(mixBuffer, { peakThreshold: 1e-4, rmsThreshold: 1e-5, sampleStride: 128 })) {
                if (attempts < maxRetries) {
                    attempts++;
                    this.addLog('Mix appears silent (possible pan cancel). Regenerating pan configuration...', 'warning');
                    this.setupPans();
                    continue;
                }
                this.addLog('Mix still silent after retries; keeping latest render.', 'warning');
            }
            break;
        }
        //this.normalizeBuffer(mixBuffer);
        this.addLog(`Output Channels: ${mixBuffer.numberOfChannels}`, 'info');

        if (this.sampleValue != null && this.sampleValue > -1) {
            mixBuffer = await this.applyTimeSliceRemix(mixBuffer, {
                seed: this.remixSeed || this.sampleValue || 0,
                bass,
                treble,
                volume,
                tempo: this.tempo
            });
            this.applyPanDynamics(mixBuffer, this.remixSeed || this.sampleValue || 0);
        } else {
            mixBuffer = await this.applyToneShaping(mixBuffer, bass, treble);
            const volumeScale = Math.max(0, volume / 100);
            if (volumeScale !== 1) {
                this.applyGain(mixBuffer, volumeScale);
            }
            mixBuffer = await this.applyTempo(mixBuffer, this.tempo);
        }
        const { blob, extension, mimeType } = await this.encodeMix(mixBuffer);
        this.mixMimeType = mimeType;
        this.addLog('Audio processing complete', 'success');
        return { blob, extension };
    }

    isBufferSilent(buffer, options = {}) {
        if (!buffer) return true;
        const peakThreshold = Number.isFinite(options.peakThreshold) ? options.peakThreshold : 1e-4;
        const rmsThreshold = Number.isFinite(options.rmsThreshold) ? options.rmsThreshold : 1e-5;
        const sampleStride = Math.max(1, options.sampleStride || 64);
        const channels = buffer.numberOfChannels || 0;
        const length = buffer.length || 0;
        if (!channels || !length) return true;

        let peak = 0;
        let sumSq = 0;
        let count = 0;
        for (let ch = 0; ch < channels; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < length; i += sampleStride) {
                const v = data[i];
                const av = Math.abs(v);
                if (av > peak) {
                    peak = av;
                    if (peak >= peakThreshold) return false;
                }
                sumSq += v * v;
                count++;
            }
        }
        const rms = Math.sqrt(sumSq / Math.max(1, count));
        return peak < peakThreshold && rms < rmsThreshold;
    }

    applyPanDynamics(buffer, seed) {
        if (!buffer || buffer.numberOfChannels !== 2) return;
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);
        const sampleRate = buffer.sampleRate || 44100;
        const speed = 0.15 + this.seededRandomFloat(seed, 77) * 0.65;
        const depth = 0.15 + this.seededRandomFloat(seed, 117) * 0.35;
        const phaseOffset = this.seededRandomFloat(seed, 201) * Math.PI * 2;
        const frameCount = Math.min(left.length, right.length);

        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const pan = Math.sin(phaseOffset + t * Math.PI * 2 * speed) * depth;
            const angle = (pan + 1) * Math.PI / 4;
            const leftGain = Math.cos(angle);
            const rightGain = Math.sin(angle);
            left[i] = left[i] * leftGain;
            right[i] = right[i] * rightGain;
        }
    }

    async applyTimeSliceRemix(buffer, options) {
        if (!buffer) return buffer;
        const {
            seed,
            bass,
            treble,
            volume,
            tempo
        } = options || {};
        const sampleRate = buffer.sampleRate || 44100;
        const channels = buffer.numberOfChannels || 1;
        const length = buffer.length || 0;
        if (!length) return buffer;

        let baseBpm = this.baseBpmDetected || 120;
        if (this.bpmInput) {
            const parsed = parseFloat(this.bpmInput.value);
            if (Number.isFinite(parsed) && parsed > 0) baseBpm = parsed;
        }
        const beatsPerMeasure = 4;
        const tempoSafe = Math.max(0.5, Math.min(2.0, Number.isFinite(tempo) ? tempo : 1));
        let measureFrames = Math.floor(sampleRate * (60 / baseBpm) * beatsPerMeasure / tempoSafe);
        measureFrames = Math.max(1024, Math.min(measureFrames, length));
        const totalSlices = Math.ceil(length / measureFrames);

        const bassSpan = Math.max(3, Math.abs(bass) * 0.35);
        const trebleSpan = Math.max(3, Math.abs(treble) * 0.35);
        const volumeBase = Math.max(0, volume / 100);

        const introLimit = Math.min(
            totalSlices,
            Math.max(1, Math.floor(this.seededRandomFloat(seed, 733) * 32))
        );
        const introCount = Math.max(0, Math.floor(this.seededRandomFloat(seed, 777) * introLimit));
        const introLockChance = 0.9; // very uncommon to change the opening measures
        const lockIntro = introCount > 0 && this.seededRandomFloat(seed, 801) < introLockChance;
        const tailLength = lockIntro ? Math.max(0, totalSlices - introCount) : totalSlices;

        const intervalPlan = [];
        let cursorPlan = 0;
        let rollPlan = 0;
        const maxIntervalCap = Math.min(128, Math.max(1, tailLength));
        while (cursorPlan < tailLength) {
            const intervalBiasRoll = this.seededRandomFloat(seed, 901 + rollPlan * 23);
            let intervalMax = 0;
            if (intervalBiasRoll < 0.75) {
                const biasedMax = Math.min(32, maxIntervalCap);
                intervalMax = 4 + Math.floor(this.seededRandomFloat(seed, 977 + rollPlan * 29) * (biasedMax - 3));
            } else {
                intervalMax = 1 + Math.floor(this.seededRandomFloat(seed, 1049 + rollPlan * 31) * maxIntervalCap);
            }
            intervalMax = Math.max(1, Math.min(intervalMax, maxIntervalCap));
            const intervalLen = Math.min(intervalMax, tailLength - cursorPlan);
            intervalPlan.push(intervalLen);
            cursorPlan += intervalLen;
            rollPlan++;
        }

        const groupForTailIndex = new Array(tailLength);
        let groupOffset = 0;
        for (let group = 0; group < intervalPlan.length; group++) {
            const len = intervalPlan[group];
            for (let i = 0; i < len; i++) {
                groupForTailIndex[groupOffset + i] = group;
            }
            groupOffset += len;
        }
        const groupTempoJitter = intervalPlan.map((_, group) =>
            (this.seededRandomFloat(seed, 2000 + group * 37) - 0.5) * 0.04
        );

        const indices = Array.from({ length: totalSlices }, (_, i) => i);
        let order = indices.slice();
        const head = lockIntro ? order.slice(0, introCount) : [];
        const tail = lockIntro ? order.slice(introCount) : order.slice(0);
        const tailShuffled = [];
        let cursor = 0;
        for (let roll = 0; roll < intervalPlan.length; roll++) {
            const intervalLen = Math.min(intervalPlan[roll], tail.length - cursor);
            const chunk = tail.slice(cursor, cursor + intervalLen);
            const shuffledChunk = this.seededShuffle(chunk, seed, 1200 + roll * 31);
            tailShuffled.push(...shuffledChunk);
            cursor += intervalLen;
        }
        order = head.concat(tailShuffled);
        const output = this.audioContext.createBuffer(channels, length, sampleRate);
        let writePos = 0;
        for (const idx of order) {
            const sliceIndex = idx;
            const start = sliceIndex * measureFrames;
            if (start >= length) break;
            const sliceLen = Math.min(measureFrames, length - start);
            const sliceSeed = this.seededRandom(seed, sliceIndex + 11, 1000000);
            const bassJitter = (this.seededRandomFloat(seed, sliceIndex * 3 + 17) - 0.5) * bassSpan * 2;
            const trebleJitter = (this.seededRandomFloat(seed, sliceIndex * 3 + 31) - 0.5) * trebleSpan * 2;
            const volumeJitter = (this.seededRandomFloat(seed, sliceIndex * 3 + 43) - 0.5) * 0.2;

            const sliceBuffer = this.audioContext.createBuffer(channels, sliceLen, sampleRate);
            for (let ch = 0; ch < channels; ch++) {
                const src = buffer.getChannelData(ch).subarray(start, start + sliceLen);
                sliceBuffer.getChannelData(ch).set(src);
            }

            const sliceBass = bass + bassJitter;
            const sliceTreble = treble + trebleJitter;
            let processed = await this.applyToneShaping(sliceBuffer, sliceBass, sliceTreble);

            const sliceGain = Math.max(0, volumeBase * (1 + volumeJitter));
            if (sliceGain !== 1) {
                this.applyGain(processed, sliceGain);
            }

            let tempoJitter = 0;
            if (tailLength > 0) {
                if (lockIntro && sliceIndex < introCount) {
                    tempoJitter = (this.seededRandomFloat(seed, 1900 + sliceIndex * 11) - 0.5) * 0.04;
                } else {
                    const tailIndex = lockIntro ? sliceIndex - introCount : sliceIndex;
                    const groupIndex = groupForTailIndex[tailIndex] || 0;
                    tempoJitter = groupTempoJitter[groupIndex] || 0;
                }
            }
            const sliceTempo = Math.max(0.5, Math.min(2.0, tempoSafe * (1 + tempoJitter)));
            let tempoBuffer = await this.applyTempo(processed, sliceTempo);

            const fitted = this.audioContext.createBuffer(channels, sliceLen, sampleRate);
            for (let ch = 0; ch < channels; ch++) {
                const src = tempoBuffer.getChannelData(ch);
                const dst = fitted.getChannelData(ch);
                if (src.length >= sliceLen) {
                    dst.set(src.subarray(0, sliceLen));
                } else {
                    for (let i = 0; i < sliceLen; i++) {
                        dst[i] = src[i % src.length];
                    }
                }
            }

            if (channels > 1) {
                const shift = this.seededRandom(sliceSeed, sliceIndex + 101, channels);
                if (shift) {
                    const rotated = [];
                    for (let ch = 0; ch < channels; ch++) {
                        rotated[ch] = fitted.getChannelData(ch).slice();
                    }
                    for (let ch = 0; ch < channels; ch++) {
                        const target = (ch + shift) % channels;
                        fitted.getChannelData(target).set(rotated[ch]);
                    }
                }
            }

            if (this.seededRandomFloat(seed, idx * 13 + 903) < 0.35) {
                const segmentLen = Math.max(256, Math.floor(sliceLen * (0.1 + this.seededRandomFloat(seed, idx * 17 + 941) * 0.35)));
                const segmentStart = Math.min(sliceLen - segmentLen, Math.floor(this.seededRandomFloat(seed, idx * 19 + 977) * sliceLen));
                for (let ch = 0; ch < channels; ch++) {
                    const data = fitted.getChannelData(ch);
                    let i = segmentStart;
                    let j = segmentStart + segmentLen - 1;
                    while (i < j) {
                        const tmp = data[i];
                        data[i] = data[j];
                        data[j] = tmp;
                        i++;
                        j--;
                    }
                }
            }
            for (let ch = 0; ch < channels; ch++) {
                output.getChannelData(ch).set(fitted.getChannelData(ch), writePos);
            }
            writePos += sliceLen;
        }

        this.addLog('Time-slice remix applied (measure-based, shuffled slices)', 'info');
        return output;
    }

    buildChannelPool(buffers) {
        const maxLength = Math.max(...buffers.map((buffer) => buffer.length));
        const sampleRate = this.audioContext.sampleRate;
        const channelPool = [];

        for (const source of buffers) {
            for (let channel = 0; channel < source.numberOfChannels; channel++) {
                channelPool.push(source.getChannelData(channel));
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

        // If per-track pan values are present, apply them to each input channel
        if (this.trackPans && this.trackPans.length === channelPool.length) {
            if (outputChannels === 1) {
                const outputData = output.getChannelData(0);
                const entries = mapping[0] || [];
                for (const entry of entries) {
                    const inIdx = entry.index;
                    if (inIdx < 0 || inIdx >= channelPool.length) continue;
                    const inputData = channelPool[inIdx];
                    if (!inputData) continue;
                    const pan = typeof this.trackPans[inIdx] === 'number' ? this.trackPans[inIdx] : 0;
                    const angle = (pan + 1) * Math.PI / 4;
                    const monoGain = (Math.cos(angle) + Math.sin(angle)) * 0.5;
                    const gain = (entry.gain || 1) * monoGain;
                    for (let i = 0; i < inputData.length; i++) {
                        outputData[i] += inputData[i] * gain;
                    }
                }
                return output;
            }

            // Create panned versions of all input channels
            const pannedChannels = [];
            
            for (let inIdx = 0; inIdx < channelPool.length; inIdx++) {
                const pan = typeof this.trackPans[inIdx] === 'number' ? this.trackPans[inIdx] : 0; // -1 .. 1
                const inputData = channelPool[inIdx];
                if (!inputData) {
                    pannedChannels.push(inputData);
                    continue;
                }

                // Apply equal-power panning across output channels
                if (outputChannels === 1) {
                    // Mono: average the panned gains
                    const angle = (pan + 1) * Math.PI / 4;
                    const monoGain = (Math.cos(angle) + Math.sin(angle)) * 0.5;
                    const pannedData = new Float32Array(maxLength);
                    for (let i = 0; i < maxLength; i++) {
                        pannedData[i] = inputData[i] * monoGain;
                    }
                    pannedChannels.push(pannedData);
                } else if (outputChannels === 2) {
                    // Stereo: standard left/right panning
                    const angle = (pan + 1) * Math.PI / 4;
                    const leftGain = Math.cos(angle);
                    const rightGain = Math.sin(angle);
                    
                    // Store gains for later application via mapping
                    pannedChannels.push({
                        data: inputData,
                        gains: [leftGain, rightGain]
                    });
                } else {
                    // Surround sound: distribute pan across all channels
                    // Pan is primarily front L/R, with side/surround channels getting the signal equally
                    const angle = (pan + 1) * Math.PI / 4;
                    const frontLeft = Math.cos(angle);
                    const frontRight = Math.sin(angle);
                    
                    const gains = new Array(outputChannels).fill(0);
                    gains[0] = frontLeft;  // Front Left
                    if (outputChannels > 1) gains[1] = frontRight;  // Front Right
                    
                    // Distribute to surround channels at lower volume
                    const surroundGain = (frontLeft + frontRight) * 0.5 * 0.7; // slightly lower
                    for (let ch = 2; ch < outputChannels; ch++) {
                        if (ch === outputChannels - 1 && outputChannels > 2) {
                            // LFE channel gets low mix
                            gains[ch] = surroundGain * 0.5;
                        } else {
                            // Side/Rear channels
                            gains[ch] = surroundGain;
                        }
                    }
                    
                    pannedChannels.push({
                        data: inputData,
                        gains: gains
                    });
                }
            }
            
            // Apply mapping with panned gains
            for (let outChannel = 0; outChannel < outputChannels; outChannel++) {
                const outputData = output.getChannelData(outChannel);
                const entries = mapping[outChannel] || [];
                
                for (const entry of entries) {
                    const inIdx = entry.index;
                    const basegain = entry.gain || 1;
                    
                    if (inIdx < 0 || inIdx >= pannedChannels.length) continue;
                    const pannedInput = pannedChannels[inIdx];
                    if (!pannedInput) continue;
                    
                    if (pannedInput.gains) {
                        // Panned channel with per-output gains
                        const panGain = pannedInput.gains[outChannel] || 0;
                        const inputData = pannedInput.data;
                        for (let i = 0; i < inputData.length; i++) {
                            outputData[i] += inputData[i] * basegain * panGain;
                        }
                    } else {
                        // Already panned mono data
                        for (let i = 0; i < pannedInput.length; i++) {
                            outputData[i] += pannedInput[i] * basegain;
                        }
                    }
                }
            }
            
            return output;
        }

        // Default mapping behavior (no per-track pans)
        for (let outChannel = 0; outChannel < outputChannels; outChannel++) {
            const outputData = output.getChannelData(outChannel);
            const entries = mapping[outChannel] || [];
            for (const entry of entries) {
                const inputData = channelPool[entry.index];
                if (!inputData) continue;
                const gain = entry.gain || 1;
                for (let i = 0; i < inputData.length; i++) {
                    outputData[i] += inputData[i] * gain;
                }
            }
        }
        return output;
    }

    rotatePanMapping(mapping, outputChannels, inputChannels, seed) {
        if (!Array.isArray(mapping) || !mapping.length) return mapping;
        const outShift = this.seededRandom(seed, 1337, outputChannels);
        const inShift = this.seededRandom(seed, 7331, Math.max(1, inputChannels));
        const rotated = [];
        for (let out = 0; out < outputChannels; out++) {
            const srcIdx = (out + outShift) % outputChannels;
            const entries = mapping[srcIdx] || [];
            const nextEntries = entries.map(entry => {
                const nextIndex = ((entry.index + inShift) % inputChannels + inputChannels) % inputChannels;
                return { index: nextIndex, gain: entry.gain };
            });
            rotated[out] = nextEntries;
        }
        return rotated;
    }

    // Render the per-track pan editor UI based on detected input channels
    renderPanEditor() {
        const container = document.getElementById('panEditor');
        const message = document.getElementById('panEditorMessage');
        if (!container) return;
        container.innerHTML = '';
        const total = this.totalchannels || 0;
        if (total === 0) {
            if (message) message.textContent = 'Load files and click Start to show per-track panning controls.';
            return;
        }

        this.trackPans = new Array(total).fill(0);

        for (let i = 0; i < total; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'pan-track';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.marginBottom = '6px';

            const label = document.createElement('label');
            label.textContent = `Track ${i}`;
            label.style.width = '80px';
            wrapper.appendChild(label);

            const input = document.createElement('input');
            input.type = 'range';
            input.min = -100;
            input.max = 100;
            input.value = 0;
            input.dataset.index = String(i);
            input.style.flex = '1';
            input.addEventListener('input', (e) => {
                const idx = Number(e.target.dataset.index);
                const val = Number(e.target.value) / 100; // normalize to -1..1
                this.trackPans[idx] = val;
                const out = wrapper.querySelector('.pan-value');
                if (out) out.textContent = val.toFixed(2);
            });
            wrapper.appendChild(input);

            const span = document.createElement('span');
            span.className = 'pan-value';
            span.style.width = '48px';
            span.style.textAlign = 'right';
            span.textContent = '0.00';
            wrapper.appendChild(span);

            container.appendChild(wrapper);
        }

        if (message) message.textContent = '';

        // Wire control buttons
        const autoBtn = document.getElementById('autoSpreadPans');
        const resetBtn = document.getElementById('resetPans');
        if (autoBtn) autoBtn.onclick = () => this.autoSpreadPans();
        if (resetBtn) resetBtn.onclick = () => this.resetPansUI();
    }

    autoSpreadPans() {
        const n = this.trackPans.length;
        if (n <= 1) return;
        for (let i = 0; i < n; i++) {
            const val = -1 + (2 * i) / (n - 1);
            this.trackPans[i] = val;
            const input = document.querySelector(`#panEditor input[data-index=\"${i}\"]`);
            const out = input && input.parentNode ? input.parentNode.querySelector('.pan-value') : null;
            if (input) input.value = Math.round(val * 100);
            if (out) out.textContent = val.toFixed(2);
        }
        this.addLog('Auto-spread pans applied', 'info');
    }

    resetPansUI() {
        for (let i = 0; i < this.trackPans.length; i++) {
            this.trackPans[i] = 0;
            const input = document.querySelector(`#panEditor input[data-index=\"${i}\"]`);
            const out = input && input.parentNode ? input.parentNode.querySelector('.pan-value') : null;
            if (input) input.value = 0;
            if (out) out.textContent = '0.00';
        }
        this.addLog('Per-track pans reset', 'info');
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

    highestPowerof2(N) {
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
        view.setUint16(34, this.bytespersample * 8, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);
        if (this.sampleValue == null) {
            // no-op
        } else if (this.sampleValue < 0) {
            this.addLog("Generating full song", 'success');
        } else if (this.sampleValue > -1) {
            this.addLog(`Generating Sample: ${this.sampleValue}`, 'success');
            const remixSeed = this.computeRemixSeedFromBuffer(buffer, this.sampleValue);
            this.remixSeed = remixSeed;
            this.addLog(`Remix seed: ${remixSeed} (sample ${this.sampleValue})`, 'info');
        }

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
                        off += this.bytespersample;
                    }
                }
            }
            parts.push(chunkBuffer);
        }

        return new Blob(parts, { type: 'audio/wav' });
    }

    async useSamples(buffer, view, numFrames, numChannels, offset) {   
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

    async getSample(buffer, view, numFrames, numChannels, offset) {
        let off=offset;
        const remixSeed = this.computeRemixSeedFromBuffer(buffer, this.sampleValue);
        this.remixSeed = remixSeed;
        this.addLog(`Remix seed: ${remixSeed} (sample ${this.sampleValue})`, 'info');
        
        for (let i = 0; i < numFrames; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                // Keep sequential order; time-slice remix handles ordering
                const sample = buffer.getChannelData(channel)[i];
                const clamped = Math.max(-1, Math.min(1, sample));
                view.setInt16(off, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
                off += this.bytespersample;
            }
        }
    }

    computeRemixSeedFromBuffer(buffer, baseSeed) {
        const seedBase = Number.isFinite(baseSeed) ? baseSeed : 0;
        let hash = (2166136261 ^ seedBase) >>> 0;
        const channels = buffer.numberOfChannels || 1;
        const length = buffer.length || 0;
        if (!length) return hash;
        const samplePoints = 2048;
        const step = Math.max(1, Math.floor(length / samplePoints));
        for (let channel = 0; channel < channels; channel++) {
            const data = buffer.getChannelData(channel);
            let count = 0;
            for (let i = 0; i < length && count < samplePoints; i += step, count++) {
                const v = data[i] || 0;
                const n = Math.floor((v + 1) * 1000000);
                hash ^= n;
                hash = Math.imul(hash, 16777619);
            }
        }
        return hash >>> 0;
    }

    seededRandom(seed, iteration, max) {
        // Non-linear seeded random using multiple mathematical functions
        // Combines sine, cosine, and power operations for non-linear distribution
        const s1 = Math.sin(seed * 12.9898) * 43758.5453;
        const s2 = Math.cos(seed * 78.233 + iteration) * 94384.2948;
        const combined = Math.sin(s1) * Math.cos(s2);
        const nonLinear = Math.pow(Math.abs(combined), 1.5); // Non-linear power scaling
        const normalized = (nonLinear % 1 + 1) % 1; // Ensure value is between 0-1
        return Math.floor(normalized * max) % max; // Ensure result is within valid range
    }

    seededRandomFloat(seed, iteration) {
        const s1 = Math.sin((seed + 11.7) * 12.9898) * 43758.5453;
        const s2 = Math.cos((seed + 3.1) * 78.233 + iteration * 0.33) * 94384.2948;
        const combined = Math.sin(s1) * Math.cos(s2);
        return (combined % 1 + 1) % 1;
    }

    seededShuffle(indices, seed, salt = 0) {
        const arr = indices.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const r = this.seededRandomFloat(seed, salt + i);
            const j = Math.floor(r * (i + 1));
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    estimateBpmFromBuffer(buffer) {
        if (!buffer) return this.baseBpmDetected || 120;
        const channel = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate || 44100;
        if (!channel || !channel.length) return this.baseBpmDetected || 120;

        const targetRate = 200;
        const hop = Math.max(1, Math.floor(sampleRate / targetRate));
        const envelope = [];
        for (let i = 0; i < channel.length; i += hop) {
            let sum = 0;
            const end = Math.min(channel.length, i + hop);
            for (let j = i; j < end; j++) {
                const v = channel[j];
                sum += v * v;
            }
            envelope.push(sum / (end - i));
        }

        const mean = envelope.reduce((a, b) => a + b, 0) / envelope.length;
        for (let i = 0; i < envelope.length; i++) {
            envelope[i] = Math.max(0, envelope[i] - mean);
        }

        const minBpm = 60;
        const maxBpm = 180;
        const minLag = Math.floor((60 * targetRate) / maxBpm);
        const maxLag = Math.floor((60 * targetRate) / minBpm);
        let bestLag = 0;
        let bestScore = -Infinity;

        for (let lag = minLag; lag <= maxLag; lag++) {
            let sum = 0;
            for (let i = 0; i < envelope.length - lag; i++) {
                sum += envelope[i] * envelope[i + lag];
            }
            if (sum > bestScore) {
                bestScore = sum;
                bestLag = lag;
            }
        }

        if (!bestLag) return this.baseBpmDetected || 120;
        const bpm = (60 * targetRate) / bestLag;
        return Math.max(minBpm, Math.min(maxBpm, bpm));
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

  handleReset() {
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
        this.addLog('Sliders reset', 'warning');
    }

    handleRerun() {
        if (!this.running) return;

        this.resetDownload();
        // Reset sliders
        this.handleReset();
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
        try { localStorage.removeItem('layai_knowledgeBase'); } catch (e) {}
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

    showProgress(show, label = '', options = {}) {
        const { animate = true } = options;
        if (show) {
            this.progressLabel = label || this.progressLabel || 'Processing...';
            if (this.progressText) {
                this.progressText.textContent = this.progressLabel;
            }
            this.progressOverlay.classList.remove('hidden');
            if (animate) {
                this.animateProgress();
            }
        } else {
            this.progressOverlay.classList.add('hidden');
            this.progressLabel = '';
            if (this.progressText) {
                this.progressText.textContent = '0%';
            }
        }
    }

    animateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 100) progress = 100;
            this.progressFill.style.width = progress + '%';
            const label = this.progressLabel ? this.progressLabel + ' ' : '';
            this.progressText.textContent = label + Math.floor(progress) + '%';
            
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
        if (this.generatedFilenameDisplay) this.generatedFilenameDisplay.textContent = '(none)';
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
        // Update UI: filename and button text to show extension
        const ext = filename.split('.').pop();
        if (this.generatedFilenameDisplay) this.generatedFilenameDisplay.textContent = filename;
        this.downloadBtn.textContent = `Download Mix (.${ext})`;
        this.playBtn.textContent = `Play Mix (.${ext})`;
        this.downloadBtn.classList.remove('hidden');
        this.downloadBtn.removeAttribute('aria-disabled');
        this.playBtn.classList.remove('hidden');
        this.playBtn.removeAttribute('aria-disabled');
        this.addLog(`Ready to download: ${filename} (${this.getMimeType(ext)})`, 'info');
    }

    changeAudio(newSrc, options = {}) {
        const { deferPlay = false } = options;
        // Pause current playback
        this.player.pause();
        // Prefer updating the <source> element when available to keep structure
        if (this.audioSource) {
            this.audioSource.src = newSrc;
            try { this.audioSource.type = this.mixMimeType || this.getMimeType(this.extension || 'wav'); } catch (e) {}
            this.player.load();
            if (!deferPlay) this.player.play().catch(() => {});
            return;
        }
        // Fallback: Change the source directly on the <audio> element
        this.player.src = newSrc;
        this.player.load();
        if (!deferPlay) this.player.play().catch(() => {});
    }

    updateMixPlayback(blob, options = {}) {
        if (!blob || !this.player) return;
        const { preserveTime = true, autoPlay = null } = options;
        const wasPlaying = !this.player.paused;
        const savedTime = preserveTime ? (this.player.currentTime || 0) : 0;
        const shouldPlay = autoPlay === null ? wasPlaying : autoPlay;
        const url = URL.createObjectURL(blob);
        if (this.currentObjectUrl) {
            try { URL.revokeObjectURL(this.currentObjectUrl); } catch (e) {}
        }
        this.currentObjectUrl = url;
        this.changeAudio(url, { deferPlay: true });
        const applyTime = () => {
            const duration = this.player.duration;
            let target = savedTime;
            if (Number.isFinite(duration) && duration > 0) {
                target = Math.min(savedTime, Math.max(0, duration - 0.01));
            }
            try { this.player.currentTime = target; } catch (e) {}
            if (shouldPlay) this.player.play().catch(() => {});
            this.player.removeEventListener('loadedmetadata', applyTime);
        };
        if (this.player.readyState >= 1) {
            applyTime();
        } else {
            this.player.addEventListener('loadedmetadata', applyTime);
        }
    }

    handlePlay() {
        this.addLog("play clicked", 'warning');
        if (!this.mixReady || !this.mixBlob) {
            this.addLog('No generated mix available for playing', 'error');
            return;
        }
        const url = URL.createObjectURL(this.mixBlob);
        if (this.currentObjectUrl) {
            try { URL.revokeObjectURL(this.currentObjectUrl); } catch (e) {}
        }
        this.currentObjectUrl = url;
        this.changeAudio(url);
        // Always use the <audio> element for the visualizer (never <source>)
        // Only create one visualizer instance per play
        if (!this.visualizerObj || this.visualizerObj.audio !== this.player) {
            this.visualizerObj = new Visualizer(this.player);
            if (this.visualizerObj && typeof this.visualizerObj.init === 'function') {
                this.visualizerObj.init(this.player);
            }
            if (this.visualizerObj && typeof this.visualizerObj.draw === 'function') {
                this.visualizerObj.draw();
            }
        }
        this.applyMidiToVisualizer();
        this.updateVisualizerModes();
    }

    handleDownload() {
        if (!this.mixReady || !this.mixBlob) {
            this.addLog('No generated mix available for download', 'error');
            return;
        }
        const url = URL.createObjectURL(this.mixBlob);
        const link = document.createElement('a');
        link.href = url;
        // Ensure filename has correct extension; use mixFilename but ensure it matches blob type when possible
        let filename = this.mixFilename || ('mix.' + (this.extension || 'wav'));
        // If blob has type, and filename extension mismatches, adjust
        try {
            const blobType = this.mixBlob.type || '';
            const extFromName = (filename.split('.').pop() || '').toLowerCase();
            const expectedExt = Object.keys({ mp3: 'audio/mpeg', opus: 'audio/opus', flac: 'audio/flac', wv: 'audio/wavpack', wav: 'audio/wav' }).find(k => this.getMimeType(k) === blobType);
            if (expectedExt && expectedExt !== extFromName) {
                filename = filename.replace(/\.[^.]+$/, '') + '.' + expectedExt;
            }
        } catch (e) {}
        link.download = filename;
        if (this.mixMimeType) link.type = this.mixMimeType;
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    getSupportedVideoMimeType() {
        if (!window.MediaRecorder) return '';
        const candidates = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        if (!MediaRecorder.isTypeSupported) {
            return candidates[candidates.length - 1];
        }
        for (const mime of candidates) {
            if (MediaRecorder.isTypeSupported(mime)) return mime;
        }
        return '';
    }

    buildVideoFilename() {
        const base = (this.mixFilename || 'mix').replace(/\.[^.]+$/, '');
        const stamp = new Date().toISOString().replace(/[:.]/g, '');
        return `${base}_${stamp}.webm`;
    }

    async handleExportVideo() {
        if (!this.mixReady || !this.mixBlob) {
            this.addLog('No generated mix available for video export', 'error');
            return;
        }
        if (!this.visualizer || !this.visualizer.captureStream) {
            this.addLog('Canvas captureStream is not supported in this browser.', 'error');
            return;
        }
        if (!window.MediaRecorder) {
            this.addLog('MediaRecorder is not supported in this browser.', 'error');
            return;
        }

                    this.showProgress(true, 'Converting MIDI...');
        const url = URL.createObjectURL(this.mixBlob);
        if (this.currentObjectUrl) {
            try { URL.revokeObjectURL(this.currentObjectUrl); } catch (e) {}
        }
        this.currentObjectUrl = url;
        this.changeAudio(url, { deferPlay: true });

        if (!this.visualizerObj || this.visualizerObj.audio !== this.player) {
            this.visualizerObj = new Visualizer(this.player);
            if (this.visualizerObj && typeof this.visualizerObj.init === 'function') {
                this.visualizerObj.init(this.player);
            }
            if (this.visualizerObj && typeof this.visualizerObj.draw === 'function') {
                this.visualizerObj.draw();
            }
        }
        if (this.visualizerObj && this.visualizerObj.audioCtx && this.visualizerObj.audioCtx.state === 'suspended') {
            try { await this.visualizerObj.audioCtx.resume(); } catch (e) {}
        }
        this.applyMidiToVisualizer();

        const previousRandom = this.visualizerCheckboxes.random && this.visualizerCheckboxes.random.checked;
        await this.updateVisualizerModes();

        const onscreenCanvas = this.visualizer;
        const prevMuted = !!this.player.muted;
        const prevVolume = this.player.volume;
        this.player.muted = true;
        this.player.volume = 0;
        const prevCanvasVisibility = onscreenCanvas.style.visibility;
        const prevCanvasOpacity = onscreenCanvas.style.opacity;
        onscreenCanvas.style.visibility = 'hidden';
        onscreenCanvas.style.opacity = '0';

        const exportCanvas = document.createElement('canvas');
        const perfHz = this.visualizerObj && this.visualizerObj.vsyncHz ? this.visualizerObj.vsyncHz : 60;
        let exportW = 3840;
        let exportH = 2160;
        if (perfHz >= 120) {
            exportW = 7680;
            exportH = 4320;
        } else if (perfHz >= 90) {
            exportW = 3840;
            exportH = 2160;
        } else if (perfHz >= 45) {
            exportW = 1920;
            exportH = 1080;
        } else {
            exportW = 1280;
            exportH = 720;
        }
        exportCanvas.width = exportW;
        exportCanvas.height = exportH;

        if (this.visualizerObj && typeof this.visualizerObj.setRenderTarget === 'function') {
            this.visualizerObj.setRenderTarget(exportCanvas, { lockSize: true });
        }

        const prevVsync = perfHz || 60;
        const fpsBoost = exportH <= 720 ? 10 : (exportH <= 1080 ? 5 : (exportH >= 4320 ? -10 : 0));
        const exportFps = Math.min(60, Math.max(30, Math.round(prevVsync + fpsBoost)));
        if (this.visualizerObj) {
            this.visualizerObj.vsyncHz = exportFps;
        }
        const canvasStream = exportCanvas.captureStream(exportFps);
        const mixedStream = new MediaStream();
        canvasStream.getVideoTracks().forEach(track => mixedStream.addTrack(track));

        let audioStream = null;
        let exportAudioDest = null;
        let exportAudioConnected = false;
        if (this.visualizerObj && this.visualizerObj.audioCtx && this.visualizerObj.source) {
            try {
                exportAudioDest = this.visualizerObj.audioCtx.createMediaStreamDestination();
                this.visualizerObj.source.connect(exportAudioDest);
                exportAudioConnected = true;
                audioStream = exportAudioDest.stream;
            } catch (e) {
                exportAudioDest = null;
                audioStream = null;
            }
        }
        if (!audioStream && this.player && typeof this.player.captureStream === 'function') {
            audioStream = this.player.captureStream();
        }

        const analyserWasDisconnected = !!(this.visualizerObj && this.visualizerObj.analyser);
        if (analyserWasDisconnected) {
            try { this.visualizerObj.analyser.disconnect(); } catch (e) {}
        }

        if (audioStream) {
            audioStream.getAudioTracks().forEach(track => mixedStream.addTrack(track));
        } else {
            this.addLog('Could not attach audio track to video; exporting silent video.', 'warning');
        }

        const mimeType = this.getSupportedVideoMimeType();
        const recorderOptions = mimeType ? { mimeType } : undefined;
        const recorder = new MediaRecorder(mixedStream, recorderOptions);
        const chunks = [];

        recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size) chunks.push(ev.data);
        };
        recorder.onerror = (ev) => {
            const err = ev && ev.error ? ev.error : new Error('Recording error');
            this.addLog('Video recording error: ' + (err.message || err), 'error');
            this.showProgress(false);
        };

        const stopRecording = () => {
            if (recorder.state === 'recording') {
                try { recorder.stop(); } catch (e) {}
            }
        };

        const onEnded = () => {
            stopRecording();
            this.player.removeEventListener('ended', onEnded);
        };
        this.player.addEventListener('ended', onEnded);

        const finalize = () => {
            const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = this.buildVideoFilename();
            document.body.appendChild(link);
            link.click();
            link.remove();
            if (exportAudioConnected && exportAudioDest && this.visualizerObj && this.visualizerObj.source) {
                try { this.visualizerObj.source.disconnect(exportAudioDest); } catch (e) {}
            }
            if (analyserWasDisconnected && this.visualizerObj && this.visualizerObj.analyser && this.visualizerObj.audioCtx) {
                try { this.visualizerObj.analyser.connect(this.visualizerObj.audioCtx.destination); } catch (e) {}
            }
            if (this.visualizerObj && typeof this.visualizerObj.restoreRenderTarget === 'function') {
                this.visualizerObj.restoreRenderTarget();
            }
            if (this.visualizerObj) {
                this.visualizerObj.vsyncHz = prevVsync;
            }
            this.player.muted = prevMuted;
            this.player.volume = prevVolume;
            onscreenCanvas.style.visibility = prevCanvasVisibility;
            onscreenCanvas.style.opacity = prevCanvasOpacity;
            this.updateVisualizerModes();
            this.showProgress(false);
            this.addLog('Video export complete.', 'success');
        };

        recorder.onstop = finalize;

        this.addLog('Recording video from visualizer...', 'info');
        try { this.player.pause(); } catch (e) {}
        try { this.player.currentTime = 0; } catch (e) {}
        if (this.visualizerObj) {
            this.visualizerObj._lastFrameTime = 0;
            this.visualizerObj._lastFrameNow = 0;
        }
        const startRecording = () => {
            try { recorder.start(); } catch (e) {}
        };
        const onPlaying = () => {
            startRecording();
            this.player.removeEventListener('playing', onPlaying);
        };
        this.player.addEventListener('playing', onPlaying);
        this.player.play().catch(() => {
            this.player.removeEventListener('playing', onPlaying);
            startRecording();
        });
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
        this.showProgress(true, 'Exporting video...');
        downloadLink.style.display = "none";

        try {
            const midiFile = fileInput.files[0];
            // Example: convert MIDI to WAV using FFmpeg WASM
            // You may need to adjust ffmpegArgs for your use case
            const outputFilename = midiFile.name.replace(/\.(mid|midi)$/i, '.wav') || 'output.wav';
            const ffmpegArgs = [
                '-i', midiFile.name,
                outputFilename
            ];
            const wavData = await this.convertAudioWithFFmpeg(midiFile, midiFile.name, outputFilename, ffmpegArgs);
            const wavBlob = new Blob([wavData], { type: 'audio/wav' });
            // Create download link
            downloadLink.href = URL.createObjectURL(wavBlob);
            downloadLink.download = outputFilename;
            downloadLink.style.display = "inline";
            downloadLink.textContent = "Download WAV";
            this.addLog("MIDI conversion complete! Click 'Download WAV' to save.", 'success');
        } catch (error) {
            this.addLog(`MIDI conversion failed: ${error.message}`, 'error');
        } finally {
            this.showProgress(false);
        }
    }
   
    // Convert audio using FFmpeg WASM
    async convertAudioWithFFmpeg(inputBlob, inputFilename, outputFilename, ffmpegArgs) {
        // Get FFmpeg instance
        const ffmpeg = await getFFmpegInstance();
        // Read input file as Uint8Array
        const inputData = new Uint8Array(await inputBlob.arrayBuffer());
        // Run FFmpeg command
        const outputs = await runFFmpegCommand(
            ffmpeg,
            ffmpegArgs,
            { [inputFilename]: inputData },
            [outputFilename]
        );
        return outputs[outputFilename];
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.layai = new LayAI();
});
