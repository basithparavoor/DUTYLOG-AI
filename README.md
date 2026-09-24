# DUTYLOG AI
Daily Duty Report & Institutional Work Journal

A mobile-first, LocalStorage-based institutional duty reporting application for Muhammad Basith Adany, Thaiba Garden Group of Institutions.

## Run
Open `index.html` in a modern browser. No backend is required.

## Included
- Premium responsive dashboard
- Daily working-day / holiday / leave records
- Calendar with status indicators
- Demo AI report generator with tone options
- Draft auto-save and restore
- Searchable report archive
- Monthly report preview
- Analytics
- JSON backup/import and CSV export
- A4 print layout
- PDF and DOCX export using browser-loaded libraries

## AI architecture
`AI.generate(notes, style)` is deliberately isolated in `ai.js`. The current implementation is DEMO MODE and uses a conservative template transformer. Replace this function with a call to your own secure backend endpoint later. Never put a production AI secret directly in frontend JavaScript.

## Notes
PDF/DOCX libraries are loaded from CDNs. For fully offline deployment, download and self-host those libraries.
