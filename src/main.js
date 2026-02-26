import { createRealtimeBpmAnalyzer } from 'realtime-bpm-analyzer';

// State variables
let isListening = false;
let audioContext = null;
let source = null;
let realtimeAnalyzer = null;
let history = JSON.parse(localStorage.getItem('pulse_history') || '[]');

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
const sparklineCanvas = document.getElementById('sparkline');
const sparklineCtx = sparklineCanvas.getContext('2d');

let currentSensitivity = 0.8;

sensitivitySlider.addEventListener('input', (e) => {
    currentSensitivity = e.target.value / 100;
});

// Initialize history display
renderHistory();

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

        bpmDisplay.innerText = '--';
        confidenceFill.style.width = '0%';

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
    bpmDisplay.innerText = '--';
    confidenceFill.style.width = '0%';
}

function updateDisplay(bpm, confidence) {
    // BPM Range Validation (40-200)
    if (bpm < 40 || bpm > 200) return;

    const roundedBpm = Math.round(bpm);
    bpmDisplay.innerText = roundedBpm;

    // Update Genre
    genreBadge.innerText = getGenre(roundedBpm);

    const percentage = Math.min(100, Math.round(confidence * 100));
    confidenceFill.style.width = `${percentage}%`;

    // Update color based on confidence
    if (confidence > currentSensitivity) {
        confidenceFill.style.background = '#34c759'; // High
        saveToHistory(roundedBpm, confidence);
        genreBadge.style.color = '#fff';
        genreBadge.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    } else if (confidence > currentSensitivity / 2) {
        confidenceFill.style.background = '#ff9f0a'; // Med
        genreBadge.style.color = 'var(--text-secondary)';
    } else {
        confidenceFill.style.background = '#ff3b30'; // Low
        genreBadge.style.color = 'var(--text-secondary)';
    }
}

function getGenre(bpm) {
    if (bpm < 60) return 'MEDITATIVE';
    if (bpm < 80) return 'LIGHT';
    if (bpm < 120) return 'JAZZ / SLOW POP';
    if (bpm < 140) return 'POP / HIP-HOP';
    if (bpm < 160) return 'TECHNO / HOUSE';
    if (bpm < 180) return 'DRILL / DNB';
    return 'HARDCORE';
}

function saveToHistory(bpm, confidence) {
    // Only save if BPM is significantly different from last entry or after some time
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

        // Keep only last 50 entries
        if (history.length > 50) history.pop();

        localStorage.setItem('pulse_history', JSON.stringify(history));
        renderHistory();
        drawSparkline();
    }
}

function drawSparkline() {
    if (history.length < 2) return;

    // Resize canvas to its display size
    const dpr = window.devicePixelRatio || 1;
    const rect = sparklineCanvas.getBoundingClientRect();
    sparklineCanvas.width = rect.width * dpr;
    sparklineCanvas.height = rect.height * dpr;
    sparklineCtx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    sparklineCtx.clearRect(0, 0, width, height);

    // Get min/max for scaling
    const bpms = history.map(h => h.bpm);
    const minBpm = Math.min(...bpms) - 10;
    const maxBpm = Math.max(...bpms) + 10;
    const range = maxBpm - minBpm;

    // Drawing settings
    sparklineCtx.beginPath();
    sparklineCtx.strokeStyle = 'white';
    sparklineCtx.lineWidth = 2;
    sparklineCtx.lineJoin = 'round';
    sparklineCtx.lineCap = 'round';

    // Move to the first point (oldest is at the end of history if unshifted)
    // Actually history is unshifted, so index 0 is newest.
    // Let's draw newest on the right.
    const padding = 2;
    const data = [...history].reverse(); // oldest to newest

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

    // Fill under the line
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
    historyList.innerHTML = '';

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

        historyList.appendChild(li);
    });
}

// Export logic
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
