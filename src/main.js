import { createRealtimeBpmAnalyzer } from 'realtime-bpm-analyzer';
import { saveHistory, getHistory, clearHistory } from './db.js';

// State
let isListening = false;
let audioContext = null;
let micStream = null;
let source = null;
let gainNode = null;
let realtimeAnalyzer = null;
let analyserNode = null;
let waveformAnimationId = null;
let silentGainNode = null;
let lastUpdateTime = Date.now();
let lastStableBpm = null;
let lastStableConfidence = 0;
let displayedBpm = null;
let bpmCandidate = null;
let bpmCandidateCount = 0;
// Strict "Tempo Lock" for DJs: allow smooth fader changes (<= 4 BPM) but resist large jumps
const BPM_STABLE_THRESHOLD = 4;
let bpmHistoryPoints = [];
const MAX_HISTORY_POINTS = 50;

// Boost mic level so analyzer can find peaks (library needs peaks above ~0.2)
const MIC_GAIN = 10;

// Show "No beat" only after this long with no BPM events at all (music stopped)
const NO_BEAT_TIMEOUT_MS = 5000;
// Library: fire stable BPM sooner (default 20s is too long)
const STABILIZATION_TIME_MS = 6000;

// DOM Elements
const statusText = document.getElementById('status-text');
const listenBtn = document.getElementById('listen-btn');
const btnText = document.getElementById('btn-text');
const btnIcon = document.getElementById('btn-icon');
const genreBadge = document.getElementById('genre-badge');
const confidenceFill = document.getElementById('confidence-fill');
const digitStrips = [
    document.querySelector('#digit-1 .digit-strip'),
    document.querySelector('#digit-2 .digit-strip'),
    document.querySelector('#digit-3 .digit-strip')
];
const confidenceRing = document.getElementById('confidence-ring');
const waveformCanvas = document.getElementById('waveform-canvas');

// Button handler
listenBtn.addEventListener('click', async () => {
    console.log('Button clicked, isListening:', isListening);

    if (!isListening) {
        await startListening();
    } else {
        stopListening();
    }
});

async function startListening() {
    console.log('Starting listening...');

    try {
        // Check for browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            statusText.innerText = 'Browser not supported';
            console.error('getUserMedia not supported');
            return;
        }

        statusText.innerText = 'Requesting mic...';

        // Create audio context (starts suspended in most browsers until user gesture)
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext created, state:', audioContext.state);

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('AudioContext resumed, state:', audioContext.state);
        }

        // Get microphone stream
        // Keep constraints explicit but lightweight for consistent mic capture.
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false
            }
        });
        console.log('Microphone access granted');

        // Create analyzer (faster stable BPM, more sensitive to peaks)
        realtimeAnalyzer = await createRealtimeBpmAnalyzer(audioContext, {
            stabilizationTime: STABILIZATION_TIME_MS,
            continuousAnalysis: true,
            muteTimeInIndexes: 5000
        });
        console.log('Analyzer created');

        lastStableBpm = null;
        displayedBpm = null;
        bpmCandidate = null;
        bpmCandidateCount = 0;

        const isHarmonic = (target, current) => {
            if (!current) return false;
            const ratios = [0.5, 0.6667, 0.75, 1.3333, 1.5, 2.0];
            for (const r of ratios) {
                if (Math.abs((target * r) - current) <= 3) return true;
                if (Math.abs((target / r) - current) <= 3) return true;
            }
            return false;
        };

        const onTempo = (data) => {
            if (data.bpm && data.bpm.length > 0) {
                const topBpm = data.bpm[0];
                const conf = normalizeConfidence(topBpm);
                const bpm = Math.round(topBpm.tempo);
                lastUpdateTime = Date.now();
                statusText.innerText = 'Listening...';
                if (bpm < 40 || bpm > 200) {
                    if (lastStableBpm != null) updateConfidenceUI(conf);
                    return;
                }
                lastStableBpm = bpm;
                // Stabilize: avoid jumping between e.g. 94 and 150 (half/double time)
                const current = displayedBpm ?? bpm;
                const diff = Math.abs(bpm - current);
                if (diff <= BPM_STABLE_THRESHOLD) {
                    displayedBpm = bpm;
                    bpmCandidate = null;
                    bpmCandidateCount = 0;
                    updateDisplay(bpm, conf);
                    addBpmToTrend(bpm);

                    // Save to IndexedDB if confidence is high
                    if (conf > 0.7) {
                        saveHistory({
                            id: Date.now(),
                            timestamp: new Date().toISOString(),
                            bpm: bpm,
                            confidence: conf,
                            genre: getGenre(bpm)
                        }).then(() => renderHistory()).catch(err => console.error('Failed to save history:', err));
                    }
                } else {
                    if (bpmCandidate === bpm || Math.abs(bpm - (bpmCandidate ?? 0)) <= 2) {
                        bpmCandidateCount = (bpmCandidate === bpm ? bpmCandidateCount : 0) + 1;
                        bpmCandidate = bpm;

                        // Require heavy consecutive readings if the jump is to a related harmonic
                        // or if we're making a huge jump (DJs rarely jump >4 BPM instantly).
                        // This prevents 94 -> 141 rapid flickering.
                        const requiredCount = isHarmonic(bpm, current) ? 20 : 10;

                        if (bpmCandidateCount >= requiredCount) {
                            displayedBpm = bpm;
                            bpmCandidateCount = 0;
                            updateDisplay(bpm, conf);
                        } else {
                            updateConfidenceUI(conf);
                        }
                    } else {
                        bpmCandidate = bpm;
                        bpmCandidateCount = 1;
                        updateConfidenceUI(conf);
                    }
                }
            }
        };

        // Use both streams: live candidates and stabilized tempo confirmations.
        realtimeAnalyzer.on('bpm', onTempo);
        realtimeAnalyzer.on('bpmStable', onTempo);

        realtimeAnalyzer.on('error', (err) => {
            console.error('Analyzer error:', err);
            statusText.innerText = 'Analyzer error';
        });

        // Connect audio graph: mic -> gain -> BPM analyzer (+ waveform tap)
        source = audioContext.createMediaStreamSource(micStream);
        gainNode = audioContext.createGain();
        gainNode.gain.value = MIC_GAIN;
        source.connect(gainNode);
        gainNode.connect(realtimeAnalyzer.node);
        // Run graph: some browsers only process worklets when connected to destination (silent)
        silentGainNode = audioContext.createGain();
        silentGainNode.gain.value = 0;
        realtimeAnalyzer.node.connect(silentGainNode);
        silentGainNode.connect(audioContext.destination);
        startWaveformVisualizer(gainNode);
        console.log('Audio connected (gain:', MIC_GAIN + 'x)');

        isListening = true;
        listenBtn.classList.add('active');
        const bpmContainer = document.getElementById('bpm-display-container');
        if (bpmContainer) bpmContainer.classList.add('active');

        statusText.innerHTML = 'Analyzing ambient audio...';
        if (btnText) btnText.innerText = 'STOP';
        if (btnIcon) {
            btnIcon.innerHTML = '';
            btnIcon.className = 'w-8 h-8 bg-black rounded-[4px] shadow-sm transition-all duration-300';
        }

        // Keep digits visible while waiting (show 000)
        updateRollingDigits(0);
        if (confidenceRing) confidenceRing.style.strokeDashoffset = '289';
        if (genreBadge) {
            genreBadge.innerText = 'LISTENING';
            genreBadge.style.color = 'var(--primary)';
        }

        // Handle tab switching
        audioContext.onstatechange = () => {
            if (audioContext.state === 'suspended' && isListening) {
                stopListening();
                statusText.innerText = 'Paused (tab inactive)';
            }
        };

    } catch (err) {
        console.error('Error starting audio:', err);
        if (err.name === 'NotAllowedError') {
            statusText.innerText = 'Mic permission denied';
        } else if (err.name === 'NotFoundError') {
            statusText.innerText = 'No microphone found';
        } else {
            statusText.innerText = 'Error: ' + err.message;
        }
        isListening = false;
    }
}

function stopListening() {
    console.log('Stopping listening...');

    if (source) {
        source.disconnect();
        source = null;
    }
    if (realtimeAnalyzer?.node) {
        try { realtimeAnalyzer.node.disconnect(); } catch (_) { }
    }
    if (silentGainNode) {
        try { silentGainNode.disconnect(); } catch (_) { }
        silentGainNode = null;
    }
    realtimeAnalyzer = null;
    stopWaveformVisualizer();
    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }

    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    isListening = false;
    listenBtn.classList.remove('active');
    if (btnText) btnText.innerText = 'LISTEN';
    statusText.innerText = 'Ready to listen';
    displayedBpm = null;
    bpmCandidate = null;
    bpmCandidateCount = 0;

    resetRollingDigits();
    if (confidenceRing) confidenceRing.style.strokeDashoffset = '289';

    if (btnIcon) {
        btnIcon.innerHTML = '<span class="material-symbols-outlined text-4xl pr-1">play_arrow</span>';
        btnIcon.className = 'w-10 h-10 bg-black rounded-full shadow-sm transition-all duration-300 flex items-center justify-center text-white';
    }
    const bpmContainer = document.getElementById('bpm-display-container');
    if (bpmContainer) bpmContainer.classList.remove('active');

    statusText.innerHTML = 'Ready to listen';
    if (genreBadge) {
        genreBadge.innerText = 'READY';
        genreBadge.style.color = 'var(--text-muted)';
    }
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

        if (i === 0 && val === 0) {
            digitStrips[i].parentElement.style.opacity = '0.3';
        } else {
            digitStrips[i].parentElement.style.opacity = '1';
        }
    });
}

function updateDisplay(bpm, confidence) {
    if (bpm < 40 || bpm > 200) return;
    const roundedBpm = Math.round(bpm);
    updateRollingDigits(roundedBpm);
    if (genreBadge) genreBadge.innerText = getGenre(roundedBpm);
    updateConfidenceUI(confidence);
}

function updateConfidenceUI(confidence) {
    const percentage = Math.min(100, Math.round(confidence * 100));
    if (confidenceFill) confidenceFill.style.width = `${percentage}%`;
    if (confidenceRing) {
        const circumference = 289;
        const offset = circumference - (percentage / 100) * circumference;
        confidenceRing.style.strokeDashoffset = String(offset);
    }
    if (confidence > 0.6) {
        if (confidenceFill) confidenceFill.style.background = 'var(--accent-orange)';
        if (genreBadge) genreBadge.style.color = '#fff';
    } else if (confidence > 0.3) {
        if (confidenceFill) confidenceFill.style.background = '#ff9f0a';
        if (genreBadge) genreBadge.style.color = 'var(--text-secondary)';
    } else {
        if (confidenceFill) confidenceFill.style.background = 'rgba(255,255,255,0.2)';
        if (genreBadge) genreBadge.style.color = 'var(--text-secondary)';
    }
}

function normalizeConfidence(topBpm) {
    if (Number.isFinite(topBpm.confidence) && topBpm.confidence > 0) {
        return Math.max(0, Math.min(1, topBpm.confidence));
    }

    if (Number.isFinite(topBpm.count) && topBpm.count > 0) {
        // Library primarily exposes "count"; normalize to [0,1] for UI.
        return Math.max(0, Math.min(1, topBpm.count / 24));
    }

    return 0;
}

function getGenre(bpm) {
    if (bpm < 60) return 'LARGO';
    if (bpm < 76) return 'ADAGIO';
    if (bpm < 108) return 'ANDANTE';
    if (bpm < 120) return 'MODERATO';
    if (bpm < 130) return 'HOUSE';
    if (bpm < 150) return 'TECHNO';
    if (bpm < 168) return 'DNB';
    if (bpm < 200) return 'HARDCORE';
    return 'PRESTISSIMO';
}

// When no BPM events for a while: show "No beat", dim confidence, keep last BPM on screen
setInterval(() => {
    if (!isListening) return;
    const now = Date.now();
    const elapsed = now - lastUpdateTime;
    if (elapsed > 8000 && statusText?.innerText === 'Listening...') {
        statusText.innerText = 'No beat yet — move closer to speaker';
    } else if (elapsed > NO_BEAT_TIMEOUT_MS) {
        statusText.innerText = 'No beat';
        updateConfidenceUI(0);
        if (genreBadge) genreBadge.innerText = '—';
    }
}, 1000);

function startWaveformVisualizer(inputNode) {
    if (!inputNode?.context || !waveformCanvas) return;
    const ctx = inputNode.context;
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.6;
    inputNode.connect(analyserNode);
    const canvasCtx = waveformCanvas.getContext('2d');
    const w = waveformCanvas.width;
    const h = waveformCanvas.height;
    const timeData = new Uint8Array(analyserNode.fftSize);
    let rafId;
    function draw() {
        if (!isListening || !analyserNode) return;
        waveformAnimationId = rafId = requestAnimationFrame(draw);
        analyserNode.getByteTimeDomainData(timeData);
        canvasCtx.fillStyle = 'rgba(14, 14, 20, 0.98)';
        canvasCtx.fillRect(0, 0, w, h);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgba(255, 149, 10, 0.85)';
        canvasCtx.shadowColor = 'rgba(255, 149, 10, 0.5)';
        canvasCtx.shadowBlur = 6;
        canvasCtx.beginPath();
        const sliceWidth = w / timeData.length;
        let x = 0;
        for (let i = 0; i < timeData.length; i++) {
            const v = (timeData[i] - 128) / 128;
            const y = h / 2 + v * (h / 2) * 0.85;
            if (i === 0) canvasCtx.moveTo(x, y);
            else canvasCtx.lineTo(x, y);
            x += sliceWidth;
        }
        canvasCtx.stroke();
        canvasCtx.shadowBlur = 0;
    }
    draw();
}

function stopWaveformVisualizer() {
    if (waveformAnimationId) {
        cancelAnimationFrame(waveformAnimationId);
        waveformAnimationId = null;
    }
    if (analyserNode) {
        try { analyserNode.disconnect(); } catch (_) { }
        analyserNode = null;
    }
}

function addBpmToTrend(bpm) {
    bpmHistoryPoints.push(bpm);
    if (bpmHistoryPoints.length > MAX_HISTORY_POINTS) {
        bpmHistoryPoints.shift();
    }
    drawSparkline();
}

function drawSparkline() {
    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    if (bpmHistoryPoints.length < 2) return;

    const minBpm = 40;
    const maxBpm = 200;
    const range = maxBpm - minBpm;

    ctx.beginPath();
    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const stepX = w / (MAX_HISTORY_POINTS - 1);

    bpmHistoryPoints.forEach((bpm, i) => {
        const x = i * stepX;
        const y = h - ((bpm - minBpm) / range) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Gradient fill under the line
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(249, 115, 22, 0.4)');
    grad.addColorStop(1, 'rgba(249, 115, 22, 0)');

    ctx.lineTo((bpmHistoryPoints.length - 1) * stepX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
}

// Initialize display: show 000 so the circle is never empty
updateRollingDigits(0);
if (confidenceRing) confidenceRing.style.strokeDashoffset = '289';

// History UI logic
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

async function renderHistory() {
    if (!historyList) return;
    try {
        const history = await getHistory();
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">No sessions recorded yet</p>';
            return;
        }

        historyList.innerHTML = history.map(item => {
            const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="history-item">
                    <div class="history-bpm">${item.bpm} BPM</div>
                    <div class="history-info">
                        <span class="history-genre">${item.genre}</span>
                        <span class="history-time">${time}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load history:', err);
    }
}

clearHistoryBtn?.addEventListener('click', async () => {
    if (confirm('Clear all BPM history?')) {
        await clearHistory();
        renderHistory();
    }
});

// Refresh history every time we save a new one (wrapped saveHistory)
const originalSaveHistory = saveHistory;
const saveHistoryAndRefresh = async (entry) => {
    await originalSaveHistory(entry);
    renderHistory();
};

// Override the save call in the previously added section (or just call render after save)
// Actually, I'll just call renderHistory() after saveHistory in the onTempo callback.

renderHistory();
console.log('Pulse initialized');
