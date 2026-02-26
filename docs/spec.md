# Pulse BPM App - Product and Technical Spec

**Status:** Stabilization pass complete for v1.3.1  
**Type:** PWA (Progressive Web App)  
**Stack:** Vanilla JS + `realtime-bpm-analyzer` + Vite  
**Positioning:** Lightweight, one-button ambient BPM detection

---

## Concept

Pulse is built for fast ambient tempo checks:

1. Point the phone at a speaker
2. Press **LISTEN**
3. Read BPM and confidence in real time

No file import. No manual tap-tempo loop.

---

## Technical Direction

| Option | Verdict | Notes |
|--------|---------|-------|
| **PWA (Chosen)** | Yes | Single codebase, fast iteration, no app-store overhead |
| React Native | No | Higher complexity for current product scope |
| Flutter | No | Overkill for a single-screen BPM detector |

**Core dependency:** `realtime-bpm-analyzer` pinned to `5.0.0` for stable package entry resolution.

---

## Shipped Features (Current)

- [x] One-button listen/start-stop flow
- [x] Real-time rolling BPM display
- [x] Confidence bar with threshold-based color states
- [x] Tempo class badge (Largo to Prestissimo mapping)
- [x] PWA build/deploy pipeline
- [x] IndexedDB module scaffold for local history data

## Backlog / Not Yet Shipped

- [ ] In-app history surface
- [ ] Sparkline trend visualization
- [ ] History export workflow

---

## BPM and Confidence Behavior

| Category | BPM Range |
|----------|-----------|
| Largo | < 60 |
| Adagio | 60-75 |
| Andante | 76-107 |
| Moderato | 108-119 |
| House | 120-129 |
| Techno | 130-149 |
| DnB | 150-167 |
| Hardcore | 168-199 |
| Prestissimo | >= 200 |

**Display window in app:** 40-200 BPM  
**Confidence threshold:** fixed at `0.75` in current UI (no live slider in v1.3.1)

---

## Runtime Pipeline

```javascript
const audioContext = new AudioContext();
const analyzer = await createRealtimeBpmAnalyzer(audioContext);
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(stream);

source.connect(analyzer.node);

analyzer.on('bpm', (data) => {
  if (data.bpm && data.bpm.length > 0) {
    const top = data.bpm[0];
    updateDisplay(top.tempo, top.confidence);
  }
});
```

---

## Constraints and Known Limits

- Most reliable on clear percussive content
- Less reliable on ambient/noise-heavy material
- No guarantee of stable BPM lock in all acoustic conditions

---

## Improvement Philosophy

Pulse is intentionally minimal today and iterates in small, practical steps:

- Keep the main flow fast and dependable
- Add features only when they do not compromise listen-speed
- Prioritize stability and trust over scope expansion
