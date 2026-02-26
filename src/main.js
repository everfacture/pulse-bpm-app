import { createRealtimeBpmAnalyzer, getBiquadFilter } from 'realtime-bpm-analyzer';

// State
let isListening = false;
let audioContext = null;
let micStream = null;
let source = null;
let filterNode = null;
let silentSink = null;
let realtimeAnalyzer = null;
let lastUpdateTime = Date.now();

// Fixed sensitivity - no slider needed
const SENSITIVITY = 0.75;

// DOM Elements
const statusText = document.getElementById('status-text');
const listenBtn = document.getElementById('listen-btn');
const btnText = document.getElementById('btn-text');
const genreBadge = document.getElementById('genre-badge');
const confidenceFill = document.getElementById('confidence-fill');
const digitStrips = [
    document.querySelector('#digit-1 .digit-strip'),
    document.querySelector('#digit-2 .digit-strip'),
    document.querySelector('#digit-3 .digit-strip')
];

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
        
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext created, state:', audioContext.state);
        
        // Get microphone stream
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false
            } 
        });
        console.log('Microphone access granted');
        
        // Create analyzer
        realtimeAnalyzer = await createRealtimeBpmAnalyzer(audioContext);
        console.log('Analyzer created');
        
        // Set up BPM callback
        realtimeAnalyzer.on('bpm', (data) => {
            console.log('BPM data:', data);
            if (data.bpm && data.bpm.length > 0) {
                const topBpm = data.bpm[0];
                updateDisplay(topBpm.tempo, normalizeConfidence(topBpm));
            }
        });

        realtimeAnalyzer.on('error', (err) => {
            console.error('Analyzer error:', err);
            statusText.innerText = 'Analyzer error';
        });
        
        // Connect audio graph
        source = audioContext.createMediaStreamSource(micStream);
        filterNode = getBiquadFilter(audioContext, { frequencyValue: 150, qualityValue: 1 });
        silentSink = audioContext.createGain();
        silentSink.gain.value = 0;

        source.connect(filterNode);
        filterNode.connect(realtimeAnalyzer.node);
        realtimeAnalyzer.node.connect(silentSink);
        silentSink.connect(audioContext.destination);
        console.log('Audio connected');
        
        // Update UI
        isListening = true;
        listenBtn.classList.add('active');
        btnText.innerText = 'STOP';
        statusText.innerText = 'Listening...';
        
        // Reset display
        resetRollingDigits();
        if (confidenceFill) confidenceFill.style.width = '0%';
        if (genreBadge) genreBadge.innerText = 'WAITING...';
        
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

    if (filterNode) {
        filterNode.disconnect();
        filterNode = null;
    }

    if (realtimeAnalyzer?.node) {
        realtimeAnalyzer.node.disconnect();
    }
    realtimeAnalyzer = null;

    if (silentSink) {
        silentSink.disconnect();
        silentSink = null;
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
    btnText.innerText = 'LISTEN';
    statusText.innerText = 'Ready to listen';
    
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
    lastUpdateTime = Date.now();
    
    if (genreBadge) genreBadge.innerText = getGenre(roundedBpm);
    
    const percentage = Math.min(100, Math.round(confidence * 100));
    if (confidenceFill) confidenceFill.style.width = `${percentage}%`;
    
    if (confidence > SENSITIVITY) {
        if (confidenceFill) confidenceFill.style.background = '#34c759';
        if (genreBadge) {
            genreBadge.style.color = '#fff';
            genreBadge.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }
    } else if (confidence > SENSITIVITY / 2) {
        if (confidenceFill) confidenceFill.style.background = '#ff9f0a';
        if (genreBadge) genreBadge.style.color = 'var(--text-secondary)';
    } else {
        if (confidenceFill) confidenceFill.style.background = '#ff3b30';
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

// Auto-reset display if no beat detected
setInterval(() => {
    if (!isListening) return;
    
    const now = Date.now();

    if (now - lastUpdateTime > 8000 && statusText && statusText.innerText === 'Listening...') {
        statusText.innerText = 'No beat yet, move closer to speaker';
    }

    if (now - lastUpdateTime > 5000 && confidenceFill && confidenceFill.style.width !== '0%') {
        resetRollingDigits();
        confidenceFill.style.width = '0%';
        if (genreBadge) genreBadge.innerText = 'WAITING...';
    }
}, 1000);

// Initialize display
resetRollingDigits();
console.log('Pulse initialized');
