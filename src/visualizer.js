//Browser Music Visualizer
import { Star } from './star.js';
import { Point } from './point.js';
import { AvgCircle } from './avgcircle.js';
export class Visualizer 
{
    constructor(source)    {
        // Optimize settings based on PC specs, but set a bit lower than expected
        const cpuCores = navigator.hardwareConcurrency || 4;
        const deviceMemory = navigator.deviceMemory || 4;
        // Conservative base values
        let vsyncHz = 60;
        let TOTAL_STARS = 800;
        let fftSize = 512;
        let TOTAL_AVG_POINTS = 32;
        // Adjust based on detected specs, but always a bit lower
        if (cpuCores >= 8 && deviceMemory >= 8) {
            vsyncHz = 60;
            TOTAL_STARS = 1200;
            fftSize = 1024;
            TOTAL_AVG_POINTS = 48;
        } else if (cpuCores >= 4 && deviceMemory >= 4) {
            vsyncHz = 45;
            TOTAL_STARS = 900;
            fftSize = 512;
            TOTAL_AVG_POINTS = 32;
        } else {
            vsyncHz = 30;
            TOTAL_STARS = 500;
            fftSize = 256;
            TOTAL_AVG_POINTS = 16;
        }
        // Set the values
        this.vsyncHz = Math.min(120, Math.round(vsyncHz * 1.5));
        this.TOTAL_STARS = TOTAL_STARS;
        this.fftSize = fftSize;
        this.TOTAL_AVG_POINTS = TOTAL_AVG_POINTS;
        // Optionally, run the old benchmark but set values lower than result
        // this._benchmarkAndSetVsync();
        this.audio = source;
        this.media = this.audio ? this.audio.src : null;
        // [32, 64, 128, 256, 512, 1024, 2048]

        this.background_color = "rgba(0, 0, 1, 0.1)";
        this.background_gradient_color_1 = "#000011";
        this.background_gradient_color_2 = "#060D1F";
        this.background_gradient_color_3 = "#02243F";

        this.stars_color = "#465677";
        this.stars_color_2 = "#B5BFD4";
        this.stars_color_special = "#F451BA";
        this.TOTAL_STARS = 150;
        this.STARS_BREAK_POINT = 140;
        this.stars = [];
        this.waveform_color = "rgba(29, 36, 57, 0.05)";
        this.waveform_color_2 = "rgba(0,0,0,0)";
        this.waveform_line_color = "rgba(157, 242, 157, 0.11)";
        this.waveform_line_color_2 = "rgba(157, 242, 157, 0.8)";
        this.waveform_tick = 0.075;
        this.TOTAL_POINTS = this.fftSize / 2;
        this.points = [];
        this.avg_circle = new AvgCircle();

        this.bubble_avg_color = "rgba(29, 36, 57, 0.1)";
        this.bubble_avg_color_2 = "rgba(29, 36, 57, 0.05)";
        this.bubble_avg_line_color = "rgba(77, 218, 248, 1)";
        this.bubble_avg_line_color_2 = "rgba(77, 218, 248, 1)";
        this.bubble_avg_tick = 0.001;
        this.TOTAL_AVG_POINTS = 64;
        this.AVG_BREAK_POINT = 100;
        this.avg_points = [];

        // Visualizer effect flags
        this.SHOW_STAR_FIELD = false;
        this.SHOW_WAVEFORM = false;
        this.SHOW_AVERAGE = false;
        this.SHOW_BAR_GRAPH = false;

        // For rotating effects
        this.visualizerModes = [
            'SHOW_STAR_FIELD',
            'SHOW_WAVEFORM',
            'SHOW_AVERAGE',
            'SHOW_BAR_GRAPH'
        ];
        // Track indices for active visualizers
        this.currentVisualizerIndices = [
            Math.floor(Math.random() * this.visualizerModes.length),
            Math.floor(Math.random() * this.visualizerModes.length)
        ];
        // Ensure indices are different
        if (this.currentVisualizerIndices[0] === this.currentVisualizerIndices[1]) {
            this.currentVisualizerIndices[1] = (this.currentVisualizerIndices[1] + 1) % this.visualizerModes.length;
        }
        this.setVisualizerModes(this.currentVisualizerIndices);
        this.visualizerRotateInterval = null;
        this._source = source;

        // Ensure only one canvas is created and shared
        let sharedCanvas = document.getElementById('visualizer');
        if (!sharedCanvas) {
            sharedCanvas = document.createElement('canvas');
            sharedCanvas.id = 'visualizer';
            sharedCanvas.style.display = 'block';
            sharedCanvas.style.width = '100%';
            sharedCanvas.style.height = window.innerHeight + 'px';
            const mixingSection = document.getElementById('mixingSection');
            if (mixingSection) {
                mixingSection.insertBefore(sharedCanvas, mixingSection.firstChild);
            } else {
                document.body.appendChild(sharedCanvas);
            }
        }
        this.canvas = sharedCanvas;
        this.ctx = this.canvas.getContext('2d');

        this.PI_HALF = Math.PI / 2;
        this.PI_TWO = Math.PI * 2;
        this.sin = Math.sin;
        this.cos = Math.cos;
        this.rotation = 0;
        this.avg = 0;
        this.AVG_BREAK_POINT_HIT = false;
        this._clearCounter = 0;
        this._nextClearAt = 120;
        this._drawLoopStarted = false;
        this._lastFrameTime = 0;
        this._lastGlitchTime = 0;
        this.resizeCanvas();
        this.createPoints();
        this.createStarField();

        this.canvas.style.opacity = '0.5';

        this.startVisualizerRotation();

    }
    
    enableCycleMode(enabled) {
        if (enabled) {
            if (!this.visualizerRotateInterval) this.startVisualizerRotation();
        } else {
            if (this.visualizerRotateInterval) {
                clearTimeout(this.visualizerRotateInterval);
                this.visualizerRotateInterval = null;
            }
        }
    }

    setVisualizerMode(index) {
        // Reset all
        this.SHOW_STAR_FIELD = false;
        this.SHOW_WAVEFORM = false;
        this.SHOW_AVERAGE = false;
        this.SHOW_BAR_GRAPH = false;
        // Enable only the selected one
        const mode = this.visualizerModes[index];
        this[mode] = true;
    }

    setVisualizerModes(indices) {
        // Reset all
        this.SHOW_STAR_FIELD = false;
        this.SHOW_WAVEFORM = false;
        this.SHOW_AVERAGE = false;
        this.SHOW_BAR_GRAPH = false;
        // Enable all selected indices (allow any combination)
        for (const idx of indices) {
            const mode = this.visualizerModes[idx];
            this[mode] = true;
        }
        // Log the user's visualizer performance settings using addLog
        if (typeof this.addLog === 'function') {
            this.addLog('[Visualizer Settings] ' + JSON.stringify({
                vsyncHz: this.vsyncHz,
                TOTAL_STARS: this.TOTAL_STARS,
                fftSize: this.fftSize,
                TOTAL_POINTS: this.TOTAL_POINTS,
                TOTAL_AVG_POINTS: this.TOTAL_AVG_POINTS,
                SHOW_STAR_FIELD: this.SHOW_STAR_FIELD,
                SHOW_WAVEFORM: this.SHOW_WAVEFORM,
                SHOW_AVERAGE: this.SHOW_AVERAGE,
                SHOW_BAR_GRAPH: this.SHOW_BAR_GRAPH
            }), 'info');
        }
        // Do not show any visualizer if none are checked
        // ...existing code...
    }

    startVisualizerRotation() {
        // Clear any previous interval
        if (this.visualizerRotateInterval) {
            clearTimeout(this.visualizerRotateInterval);
        }
        // Only rotate among checked visualizers
        const rotate = () => {
            if (this.audio && !this.audio.paused && this.bufferLength > 0) {
                const checkboxes = window.layaiVisualizerCheckboxes;
                const enabledModes = [];
                if (checkboxes) {
                    if (checkboxes.star && checkboxes.star.checked) enabledModes.push('SHOW_STAR_FIELD');
                    if (checkboxes.waveform && checkboxes.waveform.checked) enabledModes.push('SHOW_WAVEFORM');
                    if (checkboxes.average && checkboxes.average.checked) enabledModes.push('SHOW_AVERAGE');
                    if (checkboxes.bar && checkboxes.bar.checked) enabledModes.push('SHOW_BAR_GRAPH');
                }
                let modes = enabledModes.length ? enabledModes : [];
                let indices = modes.map(mode => this.visualizerModes.indexOf(mode)).filter(i => i !== -1);
                if (indices.length === 0) {
                    this.setVisualizerModes([]);
                    // Do not return; keep rotating in case user re-enables
                } else {
                    const randomCheckbox = window.layaiVisualizerCheckboxes && window.layaiVisualizerCheckboxes.random;
                    if (randomCheckbox && randomCheckbox.checked) {
                        // Pick exactly one of the checked visualizers at random
                        const idx = indices[Math.floor(Math.random() * indices.length)];
                        this.currentVisualizerIndices = [idx];
                        this.setVisualizerModes(this.currentVisualizerIndices);
                    } else {
                        this.currentVisualizerIndices = indices;
                        this.setVisualizerModes(this.currentVisualizerIndices);
                    }
                }
            }
            // Next rotation in 400-900ms (faster feel)
            const nextDelay = 400 + Math.random() * 500;
            this.visualizerRotateInterval = setTimeout(rotate, nextDelay);
        };
        rotate();
    }
    // Resize canvas to fill window
    resizeCanvas() {
        if (!this.canvas) return;
        const nextW = window.innerWidth;
        const nextH = window.innerHeight;
        if (this.canvas.width !== nextW || this.canvas.height !== nextH) {
            this.canvas.width = nextW;
            this.canvas.height = nextH;
            this.w = nextW;
            this.h = nextH;
            this.cx = this.w / 2;
            this.cy = this.h / 2;
            if (this.avg_circle && typeof this.avg_circle.update === 'function') {
                this.avg_circle.update();
            }
            this.createPoints();
            this.stars = [];
            this.createStarField();
        }
    }

    init(source)
    {
        window.addEventListener('resize', () => this.resizeCanvas());

        // Stop previous audio if playing
        if (this.audioCtx) {
            this.audioCtx.close();
        }
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.frequencyData = new Uint8Array(this.bufferLength);
        this.TOTAL_POINTS = this.analyser.frequencyBinCount;
        this.timeData = new Uint8Array(this.TOTAL_POINTS);
        this.timeDomainData = new Uint8Array(this.bufferLength);


        // Connect audio to analyser
        try {
            this.source = this.audioCtx.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
        } catch (e) {
            // createMediaElementSource can throw if audio is already connected to another context
            console.warn('Visualizer: could not create media element source', e);
        }
        this.resizeCanvas();
        this.createPoints();
        this.createStarField();
        this.draw();
    }

    _benchmarkAndSetVsync() {
        // Run a quick benchmark to estimate frame rate
        const rates = [15, 20, 30, 35, 40, 60, 90, 120, 240, 480, 1000];
        let start = performance.now();
        let frames = 0;
        const testDuration = 300;
        const test = () => {
            frames++;
            if (performance.now() - start < testDuration) {
                requestAnimationFrame(test);
            } else {
                let fps = Math.round(frames / (testDuration / 1000));
                // Find closest supported rate
                let best = rates[0];
                for (let r of rates) {
                    if (fps >= r) best = r;
                }
                this.vsyncHz = best;
                // Adjust particle count based on vsync
                if (best <= 20) this.TOTAL_STARS = 500;
                else if (best <= 30) this.TOTAL_STARS = 900;
                else if (best <= 60) this.TOTAL_STARS = 1500;
                else if (best <= 120) this.TOTAL_STARS = 2200;
                else if (best <= 240) this.TOTAL_STARS = 3000;
                else this.TOTAL_STARS = 4000;
            }
        };
        test();
    }

    draw() {
        if (this._drawLoopStarted) return;
        this._drawLoopStarted = true;
        const loop = (now) => {
            this._rafId = requestAnimationFrame(loop);
            if (!this.ctx || !this.analyser) return;
            const frameInterval = 1000 / this.vsyncHz;
            if (now - this._lastFrameTime < frameInterval) return;
            this._lastFrameTime = now;

            // Always update audio data
            this.analyser.getByteFrequencyData(this.frequencyData);
            this.analyser.getByteTimeDomainData(this.timeDomainData);
            for (let i = 0; i < this.TOTAL_POINTS; i++) {
                this.timeData[i] = this.timeDomainData[i] || 0;
            }
            this.avg = this.getAvg(this.frequencyData) * (this.gainNode ? this.gainNode.gain.value : 1);
            this.AVG_BREAK_POINT_HIT = (this.avg > this.AVG_BREAK_POINT);

            // Clear canvas (periodic hard clear + 50% alpha background)
            this._clearCounter += 1;
            const checkboxes = window.layaiVisualizerCheckboxes;
            const randomMode = !!(checkboxes && checkboxes.random && checkboxes.random.checked);
            if (randomMode) {
                if (this._clearCounter >= this._nextClearAt) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    this._clearCounter = 0;
                    this._nextClearAt = 60 + Math.floor(Math.random() * 181);
                }
            } else if (this._clearCounter % 120 === 0) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Update each visualizer independently
            if (this.SHOW_STAR_FIELD) this.drawStarField();
            if (this.SHOW_BAR_GRAPH) {
                const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
                this.x = 0;
                for (let i = 0; i < this.bufferLength; i++) {
                    const barHeight = (this.frequencyData[i] / 255) * (this.canvas.height - 10);
                    const r = Math.min(barHeight + 25, 255);
                    const g = 250 * (i / this.bufferLength);
                    const b = 50;
                    this.ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
                    this.ctx.fillRect(this.x, this.canvas.height - barHeight, barWidth, barHeight);
                    this.x += barWidth + 1;
                }
            }
            if (this.SHOW_WAVEFORM) this.drawWaveform();
            if (this.SHOW_AVERAGE) this.drawAverageCircle();

            // Glitch effect (frequent, still bounded)
            const checkboxes = window.layaiVisualizerCheckboxes;
            const glitchEnabled = !!(checkboxes && checkboxes.glitch && checkboxes.glitch.checked);
            if (glitchEnabled && !this.audio.paused && now - this._lastGlitchTime > 60) {
                this._lastGlitchTime = now;
                this.createGlitchLine();
            }
        };
        this._rafId = requestAnimationFrame(loop);
    }
    featureNotSupported() {
        hideStarter();
        return document.getElementById('no-audio').style.display = "block";
    }

    hideStarter() {
        startElement.style.display = 'none';
    }

    hideLoader() {
        return loadingElement.className = 'hide';
    }

    showToggleControls() {
        toggleElement.className = 'show';
        toggleElement.focus();

        toggleElement.addEventListener('click', function(e) {
            e.preventDefault();
            // this.textContent = playing ? "play" : "pause";
            toggleAudio();
        });
    }

    updateLoadingMessage(text) {
        msgElement.textContent = text;
    }

    initializeAudio() {
        asource = this.actx.createBufferSource();
        var xmlHTTP = new XMLHttpRequest();

        hideStarter();
        loadingElement.classList.add('show');
        updateLoadingMessage("- Loading Audio Buffer -");

        xmlHTTP.open('GET', media[0], true);
        xmlHTTP.responseType = "arraybuffer";

        xmlHTTP.onload = function(e) {
            updateLoadingMessage("- Decoding Audio File Data -");

            console.time('decoding audio data');
            this.actx.decodeAudioData(xmlHTTP.response, function(buffer) {
                console.timeEnd('decoding audio data');

                updateLoadingMessage("- Ready -");

                this.audio_buffer = buffer;

                this.analyser = this.actx.createAnalyser();
                this.gainNode = this.actx.createGain();
                this.gainNode.gain.value = 1;

                this.analyser.fftSize = this.fftSize;
                this.analyser.minDecibels = -100;
                this.analyser.maxDecibels = -30;
                this.analyser.smoothingTimeConstant = 0.8;

                this.gainNode.connect(this.analyser);
                this.analyser.connect(this.actx.destination);

                this.frequencyDataLength = this.analyser.frequencyBinCount;
                this.frequencyData = new Uint8Array(this.frequencyDataLength);
                this.timeData = new Uint8Array(this.frequencyDataLength);

                createStarField();
                createPoints();
                hideLoader();
                showToggleControls();
                playAudio();
            }, function(e) { alert("Error decoding audio data" + e); });
        };

        xmlHTTP.send();
    }

    toggleAudio(){
        playing ? pauseAudio() : playAudio();
    }

    playAudio() {
        playing = true;
        startedAt = pausedAt ? Date.now() - pausedAt : Date.now();
        asource = null;
        asource = this.actx.createBufferSource();
        asource.buffer = audio_buffer;
        asource.loop = true;
        asource.connect(gainNode);
        pausedAt ? asource.start(0, pausedAt / 1000) : asource.start();

        animate();
    }

    pauseAudio() {
        playing = false;
        pausedAt = Date.now() - startedAt;
        asource.stop();
    }

    getAvg(values) {
        var value = 0;

        values.forEach(function(v) {
            value += v;
        })

        return value / values.length;
    }

    // animate() is now unused; all effects are updated in draw()

    clearCanvas() {
        if (!this.ctx) return;
        var gradient = this.ctx.createLinearGradient(0, 0, 0, this.h);

        gradient.addColorStop(0, this.background_gradient_color_1);
        gradient.addColorStop(0.96, this.background_gradient_color_2);
        gradient.addColorStop(1, this.background_gradient_color_3);

        this.ctx.beginPath();
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.w, this.h);
        this.ctx.fill();
        this.ctx.closePath();

        gradient = null;
    }

    drawStarField() {
        var i, len, p, tick;
        if (!this.stars || this.stars.length === 0) this.createStarField();

        for (i = 0, len = this.stars.length; i < len; i++) {
            p = this.stars[i];
            tick = (this.AVG_BREAK_POINT_HIT) ? (this.avg/20) : (this.avg/50);
            p.x += p.dx * tick;
            p.y += p.dy * tick;
            p.z += p.dz;

            p.dx += p.ddx;
            p.dy += p.ddy;
            p.radius = 0.2 + ((p.max_depth - p.z) * .1);

            if (p.x < -this.cx || p.x > this.cx || p.y < -this.cy || p.y > this.cy) {
                this.stars[i] = new Star(this.w, this.h, this.cx, this.cy, this.avg, this.stars_color, this.stars_color_2, this.stars_color_special, this.STARS_BREAK_POINT, this.AVG_BREAK_POINT);
                continue;
            }

            this.ctx.beginPath();
            this.ctx.globalCompositeOperation = "lighter";
            this.ctx.fillStyle = p.color;
            this.ctx.arc(p.x + this.cx, p.y + this.cy, p.radius, this.PI_TWO, false);
            this.ctx.fill();
            this.ctx.closePath();
        }

        this.ctx.globalCompositeOperation = "source-over";
        i = len = p = tick = null;
    }

    drawAverageCircle() {
        if (this.AVG_BREAK_POINT_HIT) {
            this.ctx.strokeStyle = this.bubble_avg_line_color_2;
            this.ctx.fillStyle = this.bubble_avg_color_2;
        } else {
            this.ctx.strokeStyle = this.bubble_avg_line_color;
            this.ctx.fillStyle = this.bubble_avg_color;
        }

        this.ctx.beginPath();
        this.ctx.lineWidth = 1;

        this.ctx.arc(this.cx, this.cy, (this.avg + this.avg_circle.radius), 0, this.PI_TWO, false);

        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.closePath();
    }

    drawWaveform() {
        var i, len, p, value, xc, yc, drawHorizontal, percent, height, offset, barWidth;
        if (!this.points || this.points.length === 0) this.createPoints();

        if (this.AVG_BREAK_POINT_HIT) {
            this.rotation += this.waveform_tick;
            this.ctx.strokeStyle = this.waveform_line_color_2;
            this.ctx.fillStyle = this.waveform_color_2;
            drawHorizontal = true;
        } else {
            this.rotation += -this.waveform_tick;
            this.ctx.strokeStyle = this.waveform_line_color;
            this.ctx.fillStyle = this.waveform_color;
        }

        this.ctx.beginPath();
        this.ctx.lineWidth = 1;
        this.ctx.lineCap = "round";

        this.ctx.save();
        this.ctx.translate(this.cx, this.cy);
        this.ctx.rotate(this.rotation)
        this.ctx.translate(-this.cx, -this.cy);

        this.ctx.moveTo(this.points[0].dx, this.points[0].dy);

        for (i = 0, len = this.TOTAL_POINTS; i < len - 1; i ++) {
            p = this.points[i];
            value = this.timeData[i];
            p.dx = p.x + value * this.sin(this.PI_HALF * p.angle);
            p.dy = p.y + value * this.cos(this.PI_HALF * p.angle);
            xc = (p.dx + this.points[i+1].dx) / 2;
            yc = (p.dy + this.points[i+1].dy) / 2;

            this.ctx.quadraticCurveTo(p.dx, p.dy, xc, yc);
        }

        value = this.timeData[i];
        p = this.points[i];
        p.dx = p.x + value * this.sin(this.PI_HALF * p.angle);
        p.dy = p.y + value * this.cos(this.PI_HALF * p.angle);
        xc = (p.dx + this.points[0].dx) / 2;
        yc = (p.dy + this.points[0].dy) / 2;

        this.ctx.quadraticCurveTo(p.dx, p.dy, xc, yc);
        this.ctx.quadraticCurveTo(xc, yc, this.points[0].dx, this.points[0].dy);

        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.restore();
        this.ctx.closePath();


        if (drawHorizontal) {
            this.ctx.beginPath();

            for (i = 0, len = this.TOTAL_POINTS; i < len; i++) {
                value = this.timeData[i];
                percentt = (value / 256);
                height = (this.h * percentt);
                offset = (this.h - height - 1);
                barWidth = (this.w/this.TOTAL_POINTS);

                this.ctx.fillStyle = this.waveform_line_color_2;
                this.ctx.fillRect(i * barWidth, offset, 1, 1);
            }

            this.ctx.stroke();
            this.ctx.fill();
            this.ctx.closePath();
        }

        i = len = p = value = xc = yc = drawHorizontal = percent = height = offset = barWidth = null;
    }

    createStarField() {
        var i = -1;

        while(++i < this.TOTAL_STARS) {
            this.stars.push(new Star(Math.random() * this.w, Math.random() * this.h, Math.random() * this.cx, Math.random() * this.cy, Math.random() * this.avg, this.stars_color, this.stars_color_2, this.stars_color_special, this.STARS_BREAK_POINT, this.AVG_BREAK_POINT));
        }

        i = null;
    }

    createPoints() {
        this.points = [];
        for (let i = 0; i < this.TOTAL_POINTS; i++) {
            this.points.push(new Point({
                index: i+1,
                cx: this.cx,
                cy: this.cy,
                PI_HALF: this.PI_HALF,
                TOTAL_POINTS: this.TOTAL_POINTS,
                w: this.w,
                h: this.h
            }));
        }
    }

    resizeHandler() {
        this.resizeCanvas();
        if (this.points && this.points.length) {
            this.points.forEach((p) => {
                if (p && typeof p.updateDynamics === 'function') {
                    p.updateDynamics();
                }
            });
        }
    }

    createGlitchLine() {
        // Full-frame glitch pass without readbacks (fast, visible)
        if (!this.canvas || !this.ctx) return;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const regionW = Math.max(120, Math.floor(width * (0.2 + Math.random() * 0.45)));
        const regionH = Math.max(80, Math.floor(height * (0.2 + Math.random() * 0.45)));
        const regionX = Math.floor(Math.random() * Math.max(1, width - regionW));
        const regionY = Math.floor(Math.random() * Math.max(1, height - regionH));
        const shiftX = Math.floor((Math.random() - 0.5) * 140);
        const shiftY = Math.floor((Math.random() - 0.5) * 80);

        this.ctx.save();

        // Base full-frame shift
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.globalAlpha = 0.95;
        this.ctx.drawImage(
            this.canvas,
            regionX,
            regionY,
            regionW,
            regionH,
            regionX + shiftX,
            regionY + shiftY,
            regionW,
            regionH
        );

        // Color channel-style offsets
        this.ctx.globalCompositeOperation = "screen";
        this.ctx.globalAlpha = 0.45;
        this.ctx.drawImage(
            this.canvas,
            regionX,
            regionY,
            regionW,
            regionH,
            regionX + shiftX + 12,
            regionY + shiftY - 6,
            regionW,
            regionH
        );
        this.ctx.drawImage(
            this.canvas,
            regionX,
            regionY,
            regionW,
            regionH,
            regionX + shiftX - 12,
            regionY + shiftY + 6,
            regionW,
            regionH
        );

        // Scanline slices
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.globalAlpha = 0.95;
        const slices = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < slices; i++) {
            const sliceH = Math.max(6, Math.floor(Math.random() * 60));
            const y = regionY + Math.floor(Math.random() * Math.max(1, regionH - sliceH));
            const localShift = Math.floor((Math.random() - 0.5) * 220);
            this.ctx.drawImage(
                this.canvas,
                regionX,
                y,
                regionW,
                sliceH,
                regionX + localShift,
                y,
                regionW,
                sliceH
            );
        }

        // Slight luminance punch for visibility
        this.ctx.globalCompositeOperation = "screen";
        this.ctx.globalAlpha = 0.16;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(regionX, regionY, regionW, regionH);

        this.ctx.restore();
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

