import { createRealtimeBpmAnalyzer } from 'realtime-bpm-analyzer';
import { getHistory, saveHistory } from './db.js';

// State variables
let isListening = false;
let audioContext = null;
let source = null;
let realtimeAnalyzer = null;
let history = [];

// DOM Elements
const bpmDisplay = document.getElementById('bpm-display');
const confidenceFill = document.getElementById('confidence-fill');
const statusText = document.getElementById('status-text');
const listenBtn = document.getElementById('listen-btn');
const btnText = document.getElementById('btn-text');
const historyList = document.getElementById('history-list');
const exportBtn = document.getElementById('export-btn');
const genreBadge = document.getElementById('genre-badge');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const digitStrips = [
    document.querySelector('#digit-1 .digit-strip'),
    document.querySelector('#digit-2 .digit-strip'),
    document.querySelector('#digit-3 .digit-strip')
];
const sparklineCanvas = document.getElementById('sparkline');
const sparklineCtx = sparklineCanvas?.getContext('2d') ?? null;

let currentSensitivity = 0.8;

// Initialize
async function init() {
    try {
        history = await getHistory();
    } catch (e) {
        console.warn('IndexedDB unavailable, using memory only');
        history = [];
    }
    if (historyList) renderHistory();
    if (sparklineCtx) setTimeout(drawSparkline, 100);
}
init();

if (sensitivitySlider) {
    sensitivitySlider.addEventListener('input', (e) => {
        currentSensitivity = e.target.value / 100;
    });
}

// Toggle Button Click Handler
listenBtn.addEventListener('click', async () => {
    if (!isListening) {
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        await startListening();
    } else {
        stopListening();
    }
});

async function startListening() {
    try {
        statusText.innerText = 'Requesting Microphone...';

        // Setup Audio Context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Setup Analyzer Node v5
        realtimeAnalyzer = await createRealtimeBpmAnalyzer(audioContext);

        realtimeAnalyzer.on('bpm', (data) => {
            if (data.bpm && data.bpm.length > 0) {
                const topBpm = data.bpm[0];
                updateDisplay(topBpm.tempo, topBpm.confidence);
            }
        });

        // Connect source to analyzer
        source = audioContext.createMediaStreamSource(stream);
        source.connect(realtimeAnalyzer.node);
        // Removed destination connection to prevent feedback loop

        isListening = true;
        listenBtn.classList.add('active');
        btnText.innerText = 'STOP';
        statusText.innerText = 'Listening for BPM...';

        if (bpmDisplay) bpmDisplay.innerText = '--';
        if (confidenceFill) confidenceFill.style.width = '0%';

        // Handle background state
        audioContext.onstatechange = () => {
            if (audioContext.state === 'suspended' && isListening) {
                stopListening();
                statusText.innerText = 'Paused (tab inactive)';
            }
        };

    } catch (err) {
        console.error('Error starting audio:', err);
        statusText.innerText = 'Microphone access denied';
    }
}

function stopListening() {
    if (audioContext) {
        audioContext.close();
    }

    isListening = false;
    listenBtn.classList.remove('active');
    btnText.innerText = 'LISTEN';
    statusText.innerText = 'Ready to listen';

    // Reset display
    resetRollingDigits();
    if (confidenceFill) confidenceFill.style.width = '0%';
}

function resetRollingDigits() {
    if (!digitStrips[0]) return;
    digitStrips.forEach(strip => {
        strip.style.transform = 'translateY(-1000%)';
    });
}

function updateRollingDigits(bpm) {
    if (!digitStrips[0]) return;
    const digits = bpm.toString().padStart(3, '0').split('');

    digits.forEach((digit, i) => {
        const val = parseInt(digit);
        const y = (val / 11) * 100;
        digitStrips[i].style.transform = `translateY(-${y}%)`;

        // Hide leading zero if it's the first digit
        if (i === 0 && val === 0) {
            digitStrips[i].parentElement.style.opacity = '0';
        } else {
            digitStrips[i].parentElement.style.opacity = '1';
        }
    });
}

function updateDisplay(bpm, confidence) {
    // BPM Range Validation (40-200)
    if (bpm < 40 || bpm > 200) return;

    const roundedBpm = Math.round(bpm);
    updateRollingDigits(roundedBpm);
    lastUpdateTime = Date.now();

    // Update Genre
    if (genreBadge) genreBadge.innerText = getGenre(roundedBpm);

    const percentage = Math.min(100, Math.round(confidence * 100));
    if (confidenceFill) confidenceFill.style.width = `${percentage}%`;

    // Update color based on confidence
    if (confidence > currentSensitivity) {
        if (confidenceFill) confidenceFill.style.background = '#34c759';
        saveToHistory(roundedBpm, confidence);
        if (genreBadge) {
            genreBadge.style.color = '#fff';
            genreBadge.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
    } else if (confidence > currentSensitivity / 2) {
        if (confidenceFill) confidenceFill.style.background = '#ff9f0a';
        if (genreBadge) genreBadge.style.color = 'var(--text-secondary)';
    } else {
        if (confidenceFill) confidenceFill.style.background = '#ff3b30';
        if (genreBadge) genreBadge.style.color = 'var(--text-secondary)';
    }
}

function getGenre(bpm) {
    if (bpm < 40) return 'SLOWEST (GRAVE)';
    if (bpm < 60) return 'MEDITATIVE (LARGO)';
    if (bpm < 76) return 'CHILL (ADAGIO)';
    if (bpm < 108) return 'MID-TEMPO (ANDANTE)';
    if (bpm < 120) return 'POP / SWING (MODERATO)';
    if (bpm < 130) return 'HOUSE / DISCO';
    if (bpm < 150) return 'TECHNO / TRANCE';
    if (bpm < 168) return 'DNB / HARDSTYLE (ALLEGRO)';
    if (bpm < 200) return 'HARDCORE (PRESTO)';
    return 'EXTREME (PRESTISSIMO)';
}

let lastUpdateTime = Date.now();
function checkAutoReset() {
    if (!isListening) return;

    const now = Date.now();
    if (now - lastUpdateTime > 5000 && confidenceFill && confidenceFill.style.width !== '0%') {
        resetRollingDigits();
        confidenceFill.style.width = '0%';
        if (genreBadge) genreBadge.innerText = 'WAITING...';
    }
}
setInterval(checkAutoReset, 1000);

function saveToHistory(bpm, confidence) {
    const lastEntry = history[0];
    const now = new Date();

    if (!lastEntry || lastEntry.bpm !== bpm || (now - new Date(lastEntry.timestamp)) > 10000) {
        const entry = {
            id: Date.now(),
            bpm,
            confidence: confidence.toFixed(2),
            timestamp: now.toISOString()
        };

        history.unshift(entry);
        if (history.length > 50) history.pop();

        saveHistory(entry);
        if (historyList) renderHistory();
        if (sparklineCtx) drawSparkline();
    }
}

function drawSparkline() {
    if (!sparklineCtx || history.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = sparklineCanvas.getBoundingClientRect();
    sparklineCanvas.width = rect.width * dpr;
    sparklineCanvas.height = rect.height * dpr;
    sparklineCtx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    sparklineCtx.clearRect(0, 0, width, height);

    const bpms = history.map(h => h.bpm);
    const minBpm = Math.min(...bpms) - 10;
    const maxBpm = Math.max(...bpms) + 10;
    const range = maxBpm - minBpm;

    sparklineCtx.beginPath();
    sparklineCtx.strokeStyle = 'white';
    sparklineCtx.lineWidth = 2;
    sparklineCtx.lineJoin = 'round';
    sparklineCtx.lineCap = 'round';

    const data = [...history].reverse();
    data.forEach((item, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((item.bpm - minBpm) / range) * height;

        if (i === 0) {
            sparklineCtx.moveTo(x, y);
        } else {
            sparklineCtx.lineTo(x, y);
        }
    });

    sparklineCtx.stroke();

    sparklineCtx.lineTo(width, height);
    sparklineCtx.lineTo(0, height);
    const gradient = sparklineCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    sparklineCtx.fillStyle = gradient;
    sparklineCtx.fill();
}

// Initial draw
window.addEventListener('resize', drawSparkline);
setTimeout(drawSparkline, 100);

function renderHistory() {
    if (!historyList) return;
    const fragment = document.createDocumentFragment();

    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const confClass = item.confidence > 0.8 ? 'conf-high' : (item.confidence > 0.4 ? 'conf-med' : 'conf-low');
        const confLabel = item.confidence > 0.8 ? 'High' : (item.confidence > 0.4 ? 'Med' : 'Low');

        li.innerHTML = `
            <div class="left">
                <span class="bpm">${item.bpm} BPM</span>
                <span class="time">${time}</span>
            </div>
            <span class="conf ${confClass}">${confLabel}</span>
        `;

        fragment.appendChild(li);
    });

    historyList.innerHTML = '';
    historyList.appendChild(fragment);
}

// Export logic
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (history.length === 0) return;

        const csvContent = "data:text/csv;charset=utf-8,"
            + "Timestamp,BPM,Confidence\n"
            + history.map(e => `${e.timestamp},${e.bpm},${e.confidence}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `pulse_bpm_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
