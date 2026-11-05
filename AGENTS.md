# Codex-Anweisungen für Bliss

- Lies vor Änderungen `docs/PRODUCT.md` und `docs/ROADMAP.md`.
- Implementiere ausschließlich die ausdrücklich beauftragte Phase; starte mit Phase 1.
- Nutze React, TypeScript, Vite, Web Audio API und bei Bedarf AudioWorklet.
- Baue eine mobile-first, barrierearme deutschsprachige Oberfläche mit dunklem, reizarmem Design.
- Keine Accounts, Cloud-Dienste, Telemetrie, Analytics oder externes Audio-Streaming.
- Generiere Noise lokal. Kein externer Audio-Dienst.
- Audio erst nach ausdrücklicher Benutzerinteraktion starten, mit konservativer Anfangslautstärke und sanften Fade-ins/Fade-outs.
- Sorge für Pause, Stopp, AudioContext- und Node-Cleanup, sowie Schutz vor Clipping. Kein aggressives Tinnitus-Masking oder Hörversprechen.
- Baue einen zentralen, jederzeit zugänglichen Stop-Button ein.
- Kapsle die Audio-Engine unabhängig von UI-Komponenten; plane Austauschbarkeit für eine mögliche spätere native iOS-App.
- Liefere nachvollziehbare Tests für Audiogenerierung, UI-Steuerung und Fehlerfälle. Berichte ehrlich, welche iOS-Fälle nur am Gerät prüfbar sind.
- Keine Änderungen am vorhandenen Reflexionsassistenten, keine Zusammenlegung der Repositories ohne ausdrückliche Freigabe.
- Dokumentiere Befehle für Installation, Entwicklung, Tests und lokalen Build im README.
