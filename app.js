const { FFmpeg } = FFmpegWASM;
const { fetchFile, toBlobURL } = FFmpegUtil;

let ffmpeg = null;

// State variables matching the Bash script
let state = {
    maxnum: Math.floor(Math.random() * 314) + 1,
    totalchannels: 0,
    bass: Math.floor(Math.random() * 1000),
    treble: Math.floor(Math.random() * 666),
    volume: 0.5 + (Math.random() * 31420) / 20,
    aichannels: 0,
    aibass: 0,
    aitreble: 0,
    aivolume: 0,
    aimaxnum: 0,
    panfull: ""
};

const logElement = document.getElementById('log');
const logger = (msg) => {
    div = document.getElementById('log')
    div.textContent = `> ${msg}`;
    logElement.appendChild(div);
    logElement.scrollTop = logElement.scrollHeight;
};

async function initFFmpeg() {
    if (ffmpeg!=null) return;
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => logger(message));
    
    await ffmpeg.load({
        coreURL: await toBlobURL(`ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`ffmpeg-core.wasm`, 'application/wasm'),
    });
}

async function processAudio() {
    const files = document.getElementById('audioFiles').files;
    if (files.length === 0) return alert("Please select audio files first.");

    await initFFmpeg();
    document.getElementById('processBtn').disabled = true;
    logger("Starting Process...");

    // 1. Load AI Knowledge Base from LocalStorage
    if (document.getElementById('loadAI').checked) {
        const kb = localStorage.getItem('ai_knowledgebase') || "";
        const lines = kb.split('\n').filter(l => l.includes('--C--'));
        
        let count = 0;
        lines.forEach(line => {
            count++;
            const aichan = parseFloat(line.split('--C--')[1].split('--P--')[0]) || 0;
            const aibass = parseFloat(line.split('--B--')[1].split('--T--')[0]) || 0;
            const aitreb = parseFloat(line.split('--T--')[1].split('--V--')[0]) || 0;
            const aivol = parseFloat(line.split('--V--')[1].split('--N--')[0]) || 0;
            const aimax = parseFloat(line.split('--N--')[1].split('--')[0]) || 0;

            state.aichannels += aichan;
            state.aibass += aibass;
            state.aitreble += aitreb;
            state.aivolume += aivol;
            state.aimaxnum += aimax;
        });

        if (count > 0) {
            state.maxnum = (Math.floor(Math.random() * 128) - Math.floor(Math.random() * 128)) + state.aimaxnum;
            state.bass = ((Math.floor(Math.random() * 18) - Math.floor(Math.random() * 18)) + state.aibass / state.maxnum) / 20000000000;
            state.treble = ((Math.floor(Math.random() * 12) - Math.floor(Math.random() * 12)) + state.aitreble / state.maxnum) / 100000000000000000;
            state.volume = ((Math.floor(Math.random() * 2) - Math.floor(Math.random() * 5)) + state.aivolume / 250000000 / state.maxnum) / 100;
        }
    }

    logger(`Parameters: Bass:${state.bass} Treble:${state.treble} Vol:${state.volume}`);

    // 2. Prepare Files & Count Channels
    state.totalchannels = 0;
    const inputArgs = [];
    const filterInputs = [];
    
    for (let i = 0; i < files.length; i++) {
        const name = `input${i}.${files[i].name.split('.').pop()}`;
        await ffmpeg.writeFile(name, await fetchFile(files[i]));
        
        // Simulate ffprobe to get channels (FFmpeg can report this in logs)
        // For simplicity in JS, we assume stereo (2) if not detectable, 
        // but here we use a small trick to get info
        inputArgs.push('-stream_loop', '-1', '-i', name);
        filterInputs.push(`[${i}:a]`);
        state.totalchannels += 2; // Defaulting to 2 for logic, real script uses ffprobe
    }

    // 3. Pan Setup Logic
    const crayzz = parseInt(document.getElementById('crayzz').value);
    const panMode = document.getElementById('panfull').value;
    let audchnum = 2;
    if (panMode === "22.2") audchnum = 24;
    else if (panMode === "hexadecagonal") audchnum = 16;
    else if (panMode === "7.1") audchnum = 8;
    else if (panMode === "5.1") audchnum = 6;
    else if (panMode === "mono") audchnum = 1;

    let pans = [];
    for (let i = 0; i < state.maxnum * 64; i++) {
        let currentPan = "";
        let used = [];
        for (let x = 0; x < crayzz; x++) {
            let add = true;
            let oper = Math.random() > 0.5 ? "+" : "-";
            let opel = Math.random() > 0.5 ? "+" : "-";
            if (x === 0) { oper = ""; opel = ""; }

            let randomc = Math.floor(Math.random() * state.totalchannels);
            if (used.includes(randomc)) add = false;

            if (add) {
                used.push(randomc);
                currentPan = `c${randomc}${opel}${currentPan}`;
            }
        }
        pans[i] = currentPan || "c0";
    }

    let panfullStr = panMode;
    for (let i = 0; i < audchnum; i++) {
        const randomPanIdx = Math.floor(Math.random() * (state.maxnum * 4));
        panfullStr += `|c${i}=${pans[randomPanIdx]}`;
    }
    state.panfull = panfullStr;

    // 4. Run FFmpeg
    const ext = document.getElementById('extension').value;
    const br = document.getElementById('bitrate').value;
    const outputName = `output_${Date.now()}.${ext}`;

    const filterComplex = `amerge=inputs=${files.length},volume=${state.volume},treble=gain=${state.treble},bass=gain=${state.bass},pan=${state.panfull}`;

    logger("Executing FFmpeg command...");
    await ffmpeg.exec([
        ...inputArgs,
        '-filter_complex', filterComplex,
        '-b:a', `${br}k`,
        '-t', '30', // Limit to 30s for browser performance demo
        outputName
    ]);

    // 5. Output Result
    const data = await ffmpeg.readFile(outputName);
    const url = URL.createObjectURL(new Blob([data.buffer], { type: `audio/${ext}` }));
    
    const player = document.getElementById('audioPlayer');
    player.src = url;
    document.getElementById('downloadLink').href = url;
    document.getElementById('downloadLink').download = outputName;
    document.getElementById('outputArea').classList.remove('hidden');
    document.getElementById('feedbackArea').classList.remove('hidden');
    document.getElementById('processBtn').disabled = false;
    
    logger("MIX COMPLETE!");
}

// Feedback Loop Handlers
document.getElementById('processBtn').addEventListener('click', processAudio);

document.getElementById('rememberBtn').addEventListener('click', () => {
    const entry = `--C--${state.totalchannels}--P--${state.panfull}--B--${state.bass}--T--${state.treble}--V--${state.volume}--N--${state.maxnum}--`;
    const existing = localStorage.getItem('ai_knowledgebase') || "";
    localStorage.setItem('ai_knowledgebase', existing + "\n" + entry);
    alert("Knowledge saved to LocalStorage!");
});

document.getElementById('rerunBtn').addEventListener('click', () => {
    state.bass += (parseFloat(document.getElementById('bassdelta').value) || 0);
    state.treble += (parseFloat(document.getElementById('trebledelta').value) || 0);
    state.volume += (parseFloat(document.getElementById('volumedelta').value) || 0) / 100;
    processAudio();
});
