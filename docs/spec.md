# Pulse BPM App — Project Spec

**Status:** MVP Spec Complete  
**Type:** PWA (Progressive Web App)  
**Stack:** Vanilla JS + realtime-bpm-analyzer + Vite  
**Idea Source:** Shazam-like ambient BPM detector  

---

## Concept

Real-time BPM detection via phone microphone. One button. One number. Track changes over time.

**Differentiator:** Existing apps (Soundbrenner, Tempo) require file import or manual tapping. This is ambient detection — point phone at speaker, get BPM live.

---

## Tech Stack Decision

| Option | Verdict | Notes |
|--------|---------|-------|
| **PWA (Chosen)** | ✅ | Ship today, one codebase, no app store |
| React Native | ❌ | Heavier, native modules needed for audio |
| Flutter | ❌ | Dart learning curve, overkill for MVP |

**Core Library:** `realtime-bpm-analyzer` (TypeScript, zero deps, Web Audio API)

---

## MVP Features

### Phase 1 & 2 (Complete)
- [x] Big red "LISTEN" button
- [x] Odometer-style real-time BPM display
- [x] Confidence indicator (low/med/high)
- [x] Genre identification (Largo to Prestissimo)
- [x] Visual trends (Sparkline history)
- [x] Persistence (IndexedDB session logging)

---

## BPM Detection Standards

Pulse is calibrated to detect the full spectrum of global music tempos, from classical solemnity to high-energy electronic subgenres.

| Classification | BPM Range |
|----------------|-----------|
| Grave (Slowest) | < 40 |
| Meditative (Largo) | 40-60 |
| Chill (Adagio) | 60-76 |
| Mid-Tempo (Andante)| 76-108 |
| Pop/Swing (Moderato)| 108-120 |
| House/Disco | 120-130 |
| Techno/Trance | 130-150 |
| DnB/Hardstyle | 150-168 |
| Hardcore (Presto) | 168-200 |
| Extreme (Prestissimo)| > 200 |

**Detection limits:** 20-300 BPM (Software window optimized for 40-200 BPM)  
**Confidence threshold:** Adjustable via Studio Slider (Default 0.8)

---

## Technical Notes

```javascript
// Core audio pipeline
const audioContext = new AudioContext();
const analyzer = await createRealtimeBpmAnalyzer(audioContext);
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyzer.node);

analyzer.on('bpm', (data) => {
  displayBpm(data.bpm.tempo);
  logToHistory(data.bpm.tempo);
});
```

---

## Competitive Landscape

| App | How It Works | Ambient Detection? |
|-----|--------------|-------------------|
| Soundbrenner | Manual tap | ❌ No |
| Tempo | File import | ❌ No |
| BeatGauge | iTunes library | ❌ No |
| Live BPM | Microphone input | ✅ Yes (closest competitor) |
| **Pulse (this)** | Microphone + logging | ✅ Yes + history |

---

## Research Sources

1. **realtime-bpm-analyzer** — https://github.com/dlepaux/realtime-bpm-analyzer
2. **web-audio-beat-detector** — https://github.com/chrisguttandin/web-audio-beat-detector
3. **Essentia.js** — https://essentia.upf.edu/ (comprehensive but heavy)
4. **HN: BPM Finder** — Show HN post on advanced audio analysis toolkit

---

## Project Status

Pulse has graduated from the MVP phase to a professional-grade ambient detector.

### ✅ Completed Milestones
- [x] **Core Engine**: Integrated `realtime-bpm-analyzer`.
- [x] **Studio UI**: Single-screen, high-performance interface.
- [x] **PWA Layer**: Full offline support and mobile-first responsive design.
- [x] **Validated Standards**: 40-200 BPM window with granular genre intelligence.

---

_Research compiled: 2026-02-26_  
_Source: Web research on BPM detection libraries_
