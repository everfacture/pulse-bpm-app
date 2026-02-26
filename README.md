# Pulse

**Real-time ambient BPM detection. No tapping, no imports—just listen.**

[Live Demo](https://everfacture.github.io/pulse-bpm-app/) · [MIT License](./LICENSE)

---

## What is this?

Point your phone at a speaker. Get the BPM. That's it.

Existing apps make you tap beats or import files. This doesn't. It uses your microphone and the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) to detect tempo in real-time.

Built in a weekend because I wanted a Shazam-for-BPM and couldn't find one that didn't suck.

## Quick Start

```bash
git clone https://github.com/everfacture/pulse-bpm-app.git
cd pulse-bpm-app
npm install
npm run dev
```

Open `http://localhost:5173`. Grant mic access. Press **LISTEN**.

## How it works

```
Mic → AudioContext → realtime-bpm-analyzer → Display
                    ↓
               IndexedDB (history)
```

- **Zero dependencies** except `realtime-bpm-analyzer` (which is excellent)
- **PWA-ready** — install to home screen, works offline
- **Privacy-first** — no audio leaves your device, ever

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Core | `realtime-bpm-analyzer` | Zero deps, Web Audio API, just works |
| Build | Vite | Fast, simple, handles the PWA manifest |
| UI | Vanilla JS + CSS | No framework bloat for a single-screen app |
| Storage | IndexedDB | Async, structured, survives refresh |

## The UI

- **Odometer digits** — rolling numbers like a vintage tape deck
- **Confidence bar** — green = trust it, red = maybe not
- **Genre badge** — translates BPM to musical terms (Largo → Prestissimo)
- **Dark mode only** — because light mode is for people who don't code at 2am

## Limitations

- Works best with clear rhythmic content (EDM, hip-hop, pop)
- Struggles with ambient/noise/free jazz (no clear beat)
- Max reliable detection: ~200 BPM
- Min reliable detection: ~40 BPM

## Roadmap (maybe)

- [ ] History persistence with export
- [ ] Acoustic fingerprinting for track ID
- [ ] Tap-to-sync for DJ software

## License

MIT. Fork it. Remix it. Ship it.

---

*Built with AI assistance because shipping > perfect.*
