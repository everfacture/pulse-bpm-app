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

### Phase 1 (Weekend Build)
- [ ] Big red "LISTEN" button
- [ ] Real-time BPM display (updates every 1-2s)
- [ ] Confidence indicator (low/med/high)
- [ ] Simple history log: timestamp + BPM + confidence
- [ ] Export data as JSON/CSV

### Phase 2 (If Traction)
- [ ] Sparkline graph of BPM over time
- [ ] Genre guess from BPM range
- [ ] Use-case suggestions ("128 BPM = good for 8min/mile running")
- [ ] Dark mode
- [ ] IndexedDB persistence

---

## BPM Ranges (Ameen's Research)

| Genre/Use Case | BPM Range |
|----------------|-----------|
| Meditative | 40-60 |
| Light music | 60-80 |
| Jazz | 80-120 |
| Pop/Hip-hop | 90-130 |
| Techno/Trance | 120-150 |
| Drill/DnB | 150-180 |

**Detection limits:** Min 40 BPM, Max 200 BPM  
**Filter threshold:** Confidence >= 0.6

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

## Next Actions

- [ ] Scaffold Vite + PWA project structure
- [ ] Integrate realtime-bpm-analyzer
- [ ] Build single-screen UI
- [ ] Test on mobile (iOS Safari + Android Chrome)
- [ ] Ship MVP

---

_Research compiled: 2026-02-26_  
_Source: Session with Ameen (audio note), web research on BPM detection libraries_
