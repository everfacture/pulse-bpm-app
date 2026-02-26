import { RealTimeBpmAnalyzer } from 'realtime-bpm-analyzer';

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

// Initialize history display
renderHistory();

// Toggle Button Click Handler
listenBtn.addEventListener('click', async () => {
    if (!isListening) {
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

        // Setup Analyzer Node
        realtimeAnalyzer = new RealTimeBpmAnalyzer({
            continuousAnalysis: true,
            stabilizationTime: 3000,
            onBpmEvent: (data) => {
                if (data.bpm && data.bpm.length > 0) {
                    const topBpm = data.bpm[0];
                    updateDisplay(topBpm.tempo, topBpm.confidence);
                }
            }
        });

        // Connect source to analyzer
        source = audioContext.createMediaStreamSource(stream);

        // Create an AudioWorklet or ScriptProcessor (RealTimeBpmAnalyzer uses this)
        // Note: RealTimeBpmAnalyzer handles the connection internal to its node if using newer version, 
        // but often we need to pipe the data through it.
        const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
        source.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        scriptProcessor.onaudioprocess = (e) => {
            realtimeAnalyzer.analyze(e.inputBuffer);
        };

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
    const roundedBpm = Math.round(bpm);
    bpmDisplay.innerText = roundedBpm;

    const percentage = Math.min(100, Math.round(confidence * 100));
    confidenceFill.style.width = `${percentage}%`;

    // Update color based on confidence
    if (confidence > 0.8) {
        confidenceFill.style.background = '#34c759'; // High
        saveToHistory(roundedBpm, confidence);
    } else if (confidence > 0.4) {
        confidenceFill.style.background = '#ff9f0a'; // Med
    } else {
        confidenceFill.style.background = '#ff3b30'; // Low
    }
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
    }
}

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
