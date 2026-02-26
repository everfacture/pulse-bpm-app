# Pulse

**Instant, lightweight, one-button ambient BPM detection.**

[Live Demo](https://everfacture.github.io/pulse-bpm-app/) | [MIT License](./LICENSE)

Pulse is built for one job: point your phone at a speaker, press **LISTEN**, get BPM quickly.

Built to ship fast, then improve continuously.

## Quick Start

```bash
git clone https://github.com/everfacture/pulse-bpm-app.git
cd pulse-bpm-app
npm ci
npm run dev
```

Open `http://localhost:5173`, allow microphone access, then press **LISTEN**.

## How It Works

```text
Mic -> AudioContext -> realtime-bpm-analyzer -> Live BPM display
```

- One-button flow: start/stop listening from a single control
- Real-time BPM + confidence feedback
- Privacy-first: no audio leaves your device
- PWA-ready deployment via Vite + vite-plugin-pwa

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Core detection | `realtime-bpm-analyzer` | Pinned to `5.0.0` for stable package entry resolution |
| Build tooling | Vite 7 + vite-plugin-pwa | Fast dev/build and static deploy support |
| UI | Vanilla JS + CSS | Minimal runtime overhead |
| Local data | IndexedDB module | Foundation for future session history UX |

## Current Limits

- Works best with clear rhythmic material (EDM, hip-hop, pop)
- Less reliable with low-percussion or highly ambient audio
- Practical detection window in this app is tuned to roughly `40-200 BPM`

## What's Next (Always Improving)

No hard promises or fixed release dates. Near-term improvement areas:

- Lightweight history surface and export flow
- Better stability in noisy or inconsistent environments
- Additional UX polish for confidence and tempo transitions

## Troubleshooting

- If Vite reports `Failed to resolve entry for package "realtime-bpm-analyzer"`:
  - run `npm ci`
  - ensure `realtime-bpm-analyzer` is pinned to `5.0.0` in `package.json` and lockfile

## License

MIT.
