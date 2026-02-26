# Changelog

## 1.3.1 — 2026-02-26

**Fixed:**
- Build failure caused by `realtime-bpm-analyzer@5.0.1` package entry mismatch.
- Dependency now pinned to `realtime-bpm-analyzer@5.0.0` for stable resolution.

**Changed:**
- Version alignment: `package.json` and changelog now both track `1.3.1`.
- CI and deploy workflows updated to Node 22 and `npm ci`.
- README messaging updated for lightweight one-button positioning and iterative roadmap.
- Spec updated to separate shipped functionality from backlog items.

## 1.3.0 — 2026-02-26

**Fixed:**
- Listen button now works properly (removed double await, added better error handling)
- Digit display no longer cut off (fixed overflow and sizing)
- Console logging added for debugging

**Changed:**
- Removed sensitivity slider — fixed at 75% (reasonable default)
- Simplified genre labels (shorter, cleaner)
- Reduced button size and display scale for better proportions
- Cleaner CSS, removed unused styles

## 1.2.0 — 2026-02-26

**Fixed:**
- Sparkline canvas null checks
- CSP relaxed for mic permissions

## 1.1.0 — 2026-02-26

**Added:**
- Genre detection
- BPM validation (40-200)
- Odometer-style digits

## 1.0.0 — 2026-02-26

**Shipped:**
- Real-time BPM detection
- PWA support
- Dark mode UI
