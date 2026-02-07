// Global state
let processing = false;
let currentMode = 'audio'; // 'audio' or 'video'
let generatedFiles = [];
let logEntries = [];

// DOM Elements
const modeAudioBtn = document.getElementById('mode-audio');
const modeVideoBtn = document.getElementById('mode-video');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const clearLogBtn = document.getElementById('clearLogBtn');
const logOutput = document.getElementById('logOutput');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const fileList = document.getElementById('fileList');

// Mode switching
modeAudioBtn.addEventListener('click', () => {
    currentMode = 'audio';
    modeAudioBtn.classList.add('active');
    modeVideoBtn.classList.remove('active');
    addLog('Switched to Audio Mode (playheryolo)', 'info');
});

modeVideoBtn.addEventListener('click', () => {
    currentMode = 'video';
    modeVideoBtn.classList.add('active');
    modeAudioBtn.classList.remove('active');
    addLog('Switched to Video Mode (playheryolov)', 'info');
});

// Start processing
startBtn.addEventListener('click', async () => {
    if (processing) {
        addLog('Processing already in progress', 'warning');
        return;
    }

    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        addLog('Please select a file first', 'error');
        return;
    }

    const hyperName = document.getElementById('hyperName').value;
    if (hyperName.toLowerCase() === 'exit') {
        addLog('Exiting as requested', 'info');
        return;
    }

    processing = true;
    startBtn.disabled = true;
    startBtn.textContent = 'Processing...';

    // Get all configuration values
    const config = {
        file: fileInput.files[0],
        quality: parseInt(document.getElementById('quality').value),
        runs: parseInt(document.getElementById('runs').value),
        bass: parseInt(document.getElementById('bass').value),
        treble: parseInt(document.getElementById('treble').value),
        volume: parseFloat(document.getElementById('volume').value),
        tempo: parseFloat(document.getElementById('tempo').value),
        extension: document.getElementById('extension').value,
        width: parseInt(document.getElementById('width').value),
        height: parseInt(document.getElementById('height').value),
        channels: parseInt(document.getElementById('channels').value),
        framerate: parseInt(document.getElementById('framerate').value),
        seed: parseInt(document.getElementById('seed').value),
        enableFhue: document.getElementById('enableFhue').checked,
        hyperName: hyperName,
        mode: currentMode
    };

    addLog(`Starting ${config.runs} runs in ${currentMode} mode...`, 'info');
    addLog(`File: ${config.file.name}`, 'info');
    addLog(`Seed: ${config.seed}`, 'info');

    // Process each run
    for (let run = 0; run < config.runs; run++) {
        if (!processing) break;

        const runNumber = run + 1;
        addLog(`Run ${runNumber} started`, 'info');

        // Update progress
        const progress = ((run) / config.runs) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}% Complete`;

        // Simulate processing delay
        await delay(1000);

        // Generate random values for this run
        const randomValues = generateRandomValues(config.seed + run, 32);

        // Calculate tempo values (simulating the original formula)
        const vtempo = calculateVtempo(config.tempo, randomValues[0]);
        const atempo = 1 / vtempo;

        addLog(`Run ${runNumber}: vtempo=${vtempo.toFixed(6)}, atempo=${atempo.toFixed(6)}`, 'info');

        // Generate output filename
        const outputFilename = generateOutputFilename(config, runNumber, randomValues);

        // Simulate FFmpeg command generation
        const ffmpegCommand = generateFfmpegCommand(config, randomValues, vtempo, atempo, outputFilename);
        addLog(`Run ${runNumber}: Generated command`, 'info');

        // Create simulated output file
        const simulatedFile = await createSimulatedOutput(config, outputFilename, randomValues);
        generatedFiles.push(simulatedFile);

        // Update file list
        updateFileList();

        addLog(`Run ${runNumber} finished`, 'success');

        // Small delay between runs
        if (run < config.runs - 1) {
            await delay(500);
        }
    }

    // Final progress update
    progressFill.style.width = '100%';
    progressText.textContent = '100% Complete';

    addLog('All processing complete!', 'success');
    addLog('REMEMBER KIDS', 'warning');

    processing = false;
    startBtn.disabled = false;
    startBtn.textContent = 'Start Processing';
});

// Reset button
resetBtn.addEventListener('click', () => {
    if (processing) {
        processing = false;
        addLog('Processing cancelled', 'warning');
        startBtn.disabled = false;
        startBtn.textContent = 'Start Processing';
    }

    progressFill.style.width = '0%';
    progressText.textContent = '0% Complete';
    generatedFiles = [];
    updateFileList();
    addLog('Reset complete', 'info');
});

// Clear log button
clearLogBtn.addEventListener('click', () => {
    logOutput.innerHTML = '';
    logEntries = [];
    addLog('Log cleared', 'info');
});

// Helper functions
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = document.createElement('div');
    logLine.className = `log-line ${type}`;
    logLine.textContent = `[${timestamp}] ${message}`;
    
    logOutput.appendChild(logLine);
    logOutput.scrollTop = logOutput.scrollHeight;
    logEntries.push({ timestamp, message, type });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRandomValues(seed, count) {
    const values = [];
    // Simple pseudo-random generator based on seed
    for (let i = 0; i < count; i++) {
        const x = Math.sin(seed + i * 1000) * 10000;
        values.push(Math.floor((x - Math.floor(x)) * 1000000));
    }
    return values;
}

function calculateVtempo(tempo, randomValue) {
    // Simulating the original formula: (((0.2+(((tempo*0.2+.6634206669))*((.00066*randomValue/500+0.2))))))
    return 0.2 + ((tempo * 0.2 + 0.6634206669) * (0.00066 * randomValue / 500 + 0.2));
}

function generateOutputFilename(config, runNumber, randomValues) {
    const baseName = config.file.name.split('.')[0];
    const randomPart = randomValues[1] % 10000;
    return `${baseName}_${config.bass}b_${config.treble}treble_${config.volume}volume_${config.tempo}tempo_${config.seed}seed_${randomPart}_${runNumber}.${config.extension}`;
}

function generateFfmpegCommand(config, randomValues, vtempo, atempo, outputFilename) {
    let command = 'ffmpeg -i "' + config.file.name + '" ';
    
    if (currentMode === 'audio') {
        // Audio mode command (simplified from original)
        command += `-q ${config.quality} `;
        command += `-ab ${config.bass}K `;
        command += `-filter_complex:a "atempo=${atempo.toFixed(6)},`;
        command += `volume=${config.volume}*0.0000666*${randomValues[3]},`;
        command += `bass=gain=${config.bass}*0.0000000000000001*${randomValues[4]},`;
        command += `treble=gain=${config.treble}*0.000000000000000000000000000001*${randomValues[5]}" `;
        
        // Hexadecagonal pan simulation (simplified)
        if (config.channels === 16) {
            command += '-ac 16 ';
        }
    } else {
        // Video mode command (simplified)
        command += `-vf "eq=brightness=${(randomValues[30] % 2) / 10}:`;
        command += `saturation=${(randomValues[31] % 100) / 10},`;
        command += `setpts=(${vtempo.toFixed(6)}*PTS)" `;
    }
    
    command += `-s ${config.width}x${config.height} `;
    command += `-ac ${config.channels} `;
    command += `-r ${config.framerate} `;
    command += `"${outputFilename}"`;
    
    return command;
}

// Replace createSimulatedOutput with LayAI encodeMix for audio
async function createSimulatedOutput(config, outputFilename, randomValues) {
    const inputFile = config && config.file;
    if (inputFile && inputFile.type && inputFile.type.startsWith('audio/')) {
        const renderer = window.layaiRenderer;
        if (renderer) {
            const audioBuffer = await renderer.decodeFile(inputFile);
            const tempoRate = Math.max(0.1, Math.min(10, 1 / (calculateVtempo(config.tempo, randomValues[0]) || 1)));
            const gain = Math.max(0, Number.isFinite(config.volume) ? config.volume : 1);
            const rendered = await renderer.renderBuffer(audioBuffer, {
                gain,
                playbackRate: tempoRate
            });
            let outExt = config.extension || 'wav';
            if (!['mp3', 'opus', 'flac', 'wav', 'ogg', 'webm'].includes(outExt)) {
                outExt = 'wav';
            }
            const { blob, extension } = await renderer.encodeAudioBuffer(rendered, {
                extension: outExt
            });
            return {
                name: outputFilename.replace(/\.[^.]+$/, '') + '.' + extension,
                size: blob.size,
                blob: blob,
                url: URL.createObjectURL(blob),
                timestamp: new Date().toISOString(),
                randomSeed: randomValues[0]
            };
        }
    }
    const fileSize = Math.floor(inputFile.size * (0.8 + (randomValues[2] % 100) / 500));
    const blob = new Blob(['Simulated processed file: ' + outputFilename], { type: 'application/octet-stream' });
    return {
        name: outputFilename,
        size: fileSize,
        blob: blob,
        url: URL.createObjectURL(blob),
        timestamp: new Date().toISOString(),
        randomSeed: randomValues[0]
    };
}

function updateFileList() {
    fileList.innerHTML = '';
    
    if (generatedFiles.length === 0) {
        fileList.innerHTML = '<div class="log-line info">No files generated yet</div>';
        return;
    }
    
    generatedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        fileItem.innerHTML = `
            <div>
                <div class="file-name">${file.name}</div>
                <div class="file-status">Size: ${formatFileSize(file.size)} | Seed: ${file.randomSeed}</div>
            </div>
            <a href="${file.url}" download="${file.name}" class="download-btn">Download</a>
        `;
        
        fileList.appendChild(fileItem);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Initialize
addLog('YOLO Hyper Processor Web Edition Initialized', 'info');
addLog('Based on playheryolo.sh and yolohyper1juan.bat', 'info');
addLog('Select mode: Audio (with filters) or Video (visual effects)', 'info');
