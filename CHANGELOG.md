# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-26

### Fixed
- Restored microphone access by relaxing CSP and removing redundant device enumeration checks.
- Perfected UI alignment: Reduced "LISTEN" button size by 15% and centered all primary components.

### Changed
- Refined "Studio" typography and container spacing.
- Moved History and Export features to the future roadmap to focus on core stability.

## [1.1.0] - 2026-02-26

### Added
- New high-fidelity "Studio" hero logo (v2).
- Scientifically validated BPM detection window (40-200 BPM).
- Expanded genre intelligence (Largo, Adagio, Andante, Moderato, etc.).

### Changed
- Scrubbed all personal and conversational references from `spec.md` and `README.md`.
- Updated architecture diagram to reflect IndexedDB session logging.

## [1.0.0] - 2026-02-26

### Added
- Initial implementation of Pulse BPM App.
- Real-time ambient BPM detection using `realtime-bpm-analyzer`.
- Progressive Web App (PWA) support.
- Local storage for history tracking.
- CSV export for historical data.
- Premium dark mode interface following established engineering standards.
- Re-structured repository using "Clean Root Pattern".
