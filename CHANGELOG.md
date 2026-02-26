# Changelog

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
