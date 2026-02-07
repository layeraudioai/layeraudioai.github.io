// DOM Elements
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileList = document.getElementById('fileList');
const masterBtn = document.getElementById('masterBtn');
const batchBtn = document.getElementById('batchBtn');
const outputFormat = document.getElementById('outputFormat');
const bitDepth = document.getElementById('bitDepth');
const sampleRate = document.getElementById('sampleRate');
const loudnessMode = document.getElementById('loudnessMode');
const targetLoudness = document.getElementById('targetLoudness');
const loudnessValue = document.getElementById('loudnessValue');
const loudnessDisplay = document.getElementById('loudnessDisplay');
const batchMode = document.getElementById('batchMode');
const progressContainer = document.getElementById('progressContainer');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const fileCounter = document.getElementById('fileCounter');
const statusMessage = document.getElementById('statusMessage');
const outputSection = document.getElementById('outputSection');
const outputList = document.getElementById('outputList');

// State
let uploadedFiles = [];
let processedFiles = [];

// Event Listeners
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
dropArea.addEventListener('dragover', handleDragOver);
dropArea.addEventListener('drop', handleDrop);
masterBtn.addEventListener('click', handleMaster);
batchBtn.addEventListener('click', handleBatch);
targetLoudness.addEventListener('input', updateLoudnessDisplay);

// Functions
function handleDragOver(e) {
    e.preventDefault();
    dropArea.classList.add('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function addFiles(files) {
    // Filter for audio files
    const audioFiles = files.filter(file => 
        file.type.startsWith('audio/') || 
        ['.wav', '.mp3', '.flac', '.ogg', '.aac', '.m4a'].some(ext => 
            file.name.toLowerCase().endsWith(ext)
        )
    );
    
    if (audioFiles.length === 0) {
        showStatus('Please upload audio files only (WAV, MP3, FLAC, OGG, etc.)', 'error');
        return;
    }
    
    audioFiles.forEach(file => {
        // Check if file already exists
        if (!uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
            uploadedFiles.push(file);
        }
    });
    
    updateFileList();
    updateButtons();
}

function updateFileList() {
    fileList.innerHTML = '';
    
    if (uploadedFiles.length === 0) {
        fileList.innerHTML = '<p style="text-align: center; color: #a5b4cb;">No files uploaded yet</p>';
        return;
    }
    
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileSize = formatFileSize(file.size);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="icon file-icon">music_note</span>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <button class="remove-file" data-index="${index}">
                <span class="icon">close</span>
            </button>
        `;
        
        fileList.appendChild(fileItem);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-file').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            uploadedFiles.splice(index, 1);
            updateFileList();
            updateButtons();
        });
    });
}

function updateButtons() {
    const hasFiles = uploadedFiles.length > 0;
    masterBtn.disabled = !hasFiles;
    batchBtn.disabled = !hasFiles;
}

function updateLoudnessDisplay() {
    const value = parseFloat(targetLoudness.value).toFixed(2);
    loudnessValue.textContent = value;
    loudnessDisplay.textContent = `${value} dB`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showStatus(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

async function handleMaster() {
    if (uploadedFiles.length === 0) {
        showStatus('Please upload at least one audio file', 'error');
        return;
    }
    
    if (batchMode.checked && uploadedFiles.length > 1) {
        // Batch processing
        await processBatch();
    } else {
        // Single file processing (use first file)
        await processFile(uploadedFiles[0]);
    }
}

async function handleBatch() {
    if (uploadedFiles.length === 0) {
        showStatus('Please upload audio files to process', 'error');
        return;
    }
    
    await processBatch();
}

async function processBatch() {
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Processing: 0%';
    
    const totalFiles = uploadedFiles.length;
    processedFiles = [];
    
    for (let i = 0; i < totalFiles; i++) {
        fileCounter.textContent = `File ${i + 1} of ${totalFiles}`;
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const file = uploadedFiles[i];
        const processedFile = await simulateProcessing(file, i);
        processedFiles.push(processedFile);
        
        // Update progress
        const progress = ((i + 1) / totalFiles) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Processing: ${Math.round(progress)}%`;
        
        // Small delay between files (simulating the sleep in original script)
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    progressContainer.style.display = 'none';
    showOutput();
    showStatus(`Successfully processed ${totalFiles} file(s)`, 'success');
}

async function processFile(file) {
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Processing: 0%';
    fileCounter.textContent = 'File 1 of 1';
    
    // Simulate processing steps
    for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        progressFill.style.width = `${i}%`;
        progressText.textContent = `Processing: ${i}%`;
    }
    
    const processedFile = await simulateProcessing(file, 0);
    processedFiles = [processedFile];
    
    progressContainer.style.display = 'none';
    showOutput();
    showStatus('File mastered successfully!', 'success');
}

// Replace simulateProcessing with LayAI encodeMix for audio
async function simulateProcessing(file, index) {
    if (file.type.startsWith('audio/')) {
        const renderer = window.layaiRenderer;
        if (renderer) {
            const audioBuffer = await renderer.decodeFile(file);
            const targetSampleRate = parseInt(sampleRate.value, 10);
            const rendered = await renderer.renderBuffer(audioBuffer, {
                gain: 1,
                playbackRate: 1,
                sampleRate: Number.isFinite(targetSampleRate) ? targetSampleRate : audioBuffer.sampleRate
            });
            const outExt = outputFormat.value || 'wav';
            const { blob, extension } = await renderer.encodeAudioBuffer(rendered, {
                extension: outExt,
                bitrate: 192
            });
            return {
                originalName: file.name,
                processedName: `${file.name.split('.')[0]}_mastered.${extension}`,
                format: extension,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        }
    }
    // Fallback: original simulation
    const originalName = file.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
    const format = outputFormat.value;
    return {
        originalName: originalName,
        processedName: `${nameWithoutExt}_mastered.${format}`,
        format: format,
        size: file.size * 1.2,
        url: URL.createObjectURL(file)
    };
}

function showOutput() {
    outputSection.style.display = 'block';
    outputList.innerHTML = '';
    
    processedFiles.forEach((file, index) => {
        const outputItem = document.createElement('div');
        outputItem.className = 'output-item';
        
        const fileSize = formatFileSize(file.size);
        const icon = getFormatIcon(file.format);
        
        outputItem.innerHTML = `
            <span class="icon output-icon">${icon}</span>
            <div class="output-name">${file.processedName}</div>
            <div>${fileSize} - ${file.format.toUpperCase()}</div>
            <button class="download-btn" data-index="${index}">
                <span class="icon">download</span> Download
            </button>
        `;
        
        outputList.appendChild(outputItem);
    });
    
    // Add event listeners to download buttons
    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            downloadFile(index);
        });
    });
}

function getFormatIcon(format) {
    switch(format.toLowerCase()) {
        case 'wav': return 'audiotrack';
        case 'mp3': return 'music_note';
        case 'flac': return 'library_music';
        case 'ogg': return 'graphic_eq';
        default: return 'audio_file';
    }
}

function downloadFile(index) {
    const file = processedFiles[index];
    
    // In a real application, this would download the actual processed file
    // For simulation, we'll create a dummy download
    showStatus(`Downloading ${file.processedName}...`, 'success');
    
    // Create a temporary link to simulate download
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.processedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize
updateLoudnessDisplay();
updateFileList();
updateButtons();

// Log the simulated commands from original scripts
console.log('Original commands simulated:');
console.log('aimaster: aimastering master -i "${1}" -o "${1%%.*}_mastered.${2}" --output-format ${2} --bit-depth 32 --sample-rate ${3} --target-loudness-mode ${4} --target-loudness 1.6666666666');
console.log('aimasterbatch: for i in $*; do echo "$i" && sleep 0.05 && ((aimaster "${i}" wav 96000 "rms" && mv "${i%%.*}_mastered.wav" "output" && sleep 0.05)&); done;');
