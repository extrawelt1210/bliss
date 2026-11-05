# Entwicklungsfahrplan

## Phase 1 – funktionierendes Fundament ✓
Vite + React + TypeScript, UI, Audio-Engine mit Brown/Pink Noise, Play/Pause/Stop, Lautstärke, sanfte Fades, Tests, README.

## Phase 2 – Klangmischung ✓

### Vorgezogene, ausdrücklich beauftragte Erweiterung

Binaurale Klänge: getrennte Sinustonpaare für Grundton, Quinte, Oktave und höhere Harmonie, durchgängig 4/8/12 Hz Abstand, Stereo-Kopfhörerhinweis, sanfte Wechsel und Tests für Kanalrouting sowie Ressourcen-Cleanup.

### Weitere ausdrücklich beauftragte Erweiterung

Sanftes Meer, leichter Wind und warmer Drone als vollständig lokal synthetisierte Klangarten; sanfte Modulation, konservative Pegel, Fades, Cleanup und Generator-Tests gelten wie bei den bestehenden Klängen.

### Abgeschlossen

Zwei unabhängige Audioebenen, White Noise, Einbindung aller vorhandenen Klänge in den Mixer, Timer für 5/10/20/30 Minuten und Pegelmanagement mit Ebenen-Headroom und Master-Limiter.

## Phase 3 – Ruhemodus ✓
Optionale Atemvisualisierung, Favoriten, lokale Check-ins; keine verpflichtenden Eingaben.

## Phase 4 – iPhone-Alltag ✓ (Software), Geräteprüfung ausstehend

PWA-Manifest, App-Symbole, Offline-Verfügbarkeit nach dem ersten Laden, mobile Bedienbarkeit, Behandlung von Audio-Unterbrechungen und manuelle Prüfprotokolle sind umgesetzt. Das Verhalten bei Hardware-Lautstärke, Routing, Sperrbildschirm und realen Systemunterbrechungen muss noch auf einem echten iPhone protokolliert werden. Die Kriterien für eine mögliche native Lösung stehen in `docs/IOS_NATIVE_EVALUATION.md`.

## Phase 5 – persönliche Klangpraxis ✓

Die ausdrücklich beauftragten Punkte 1–5 sind umgesetzt:

1. Konfigurierbare Sitzungsphasen für Ankommen, Klangzeit und langes Ausblenden, standardmäßig mit stillem Ende.
2. Sichere Klang-Makros für Wärme, Weichheit, Luftigkeit und Bewegung.
3. Sechs zusätzliche, vollständig lokal synthetisierte Klangwelten: offene Küste, geschützte Bucht, sanfter Regen, fernes Gewitter, Nachtluft und schwebende Fläche.
4. Favoriten mit eigenen Namen, Duplizieren, Sortieren, drei Schnellplätzen und lokalem JSON-Import/-Export sowie Wiederherstellung der letzten Mischung.
5. Schnellzugriff auf letzte Mischung und Schnellfavoriten plus Kompakt-/Vollbildmodus.

Automatisierte Tests decken Generatorgrenzen, Makro-Normalisierung, Phasenwechsel, lokale Speicherung im aktuellen Schema, UI-Steuerung und Fehlerfälle ab. Die Hörprüfung und iOS-Hardwarefälle bleiben reale Gerätetests.

## Phase 6 – Raum und Tape ✓

Ein kurzer, prozedural erzeugter Stereo-Raum ergänzt die gemeinsame Mischung ohne externe Impulsantwort oder Federhall-Charakter. Eine getrennt regelbare Tape-Sättigung nutzt eine weiche Kennlinie und sanfte Kompression. Beide Effekte sind konservativ begrenzt, Bestandteil lokaler Favoriten und vollständig in Pause, Stop, Cleanup und Clipping-Schutz eingebunden.

Automatisierte Tests prüfen Begrenzung, Tape-Kennlinie, Raumimpuls, Signalrouting, Live-Regelung, Speicherung im aktuellen Schema und Node-Cleanup. Die klangliche Beurteilung sowie iPhone-Ausgabe bleiben reale Hör- und Gerätetests.

## Phase 7 – erweiterte Drone-Synthese ✓

Der warme Drone nutzt acht lokale Oszillatoren, einen langsam regelbaren LFO und ein eigenständiges Multimode-Filter mit Tiefpass, Bandpass und Hochpass. Cutoff, Resonanz, LFO-Tempo und LFO-Tiefe werden live in das AudioWorklet übertragen, konservativ begrenzt und im aktuellen lokalen Schema gespeichert. Das Schema ist auf ausdrücklichen Auftrag nicht abwärtskompatibel zu früheren Testdaten.

Automatisierte Tests prüfen Parameternormalisierung, alle Filtermodi, endliche und begrenzte Samples, Live-Änderungen, UI-Steuerung und Worklet-Nachrichten. Die endgültige Klangabstimmung und CPU-Stabilität auf dem iPhone bleiben Hör- und Gerätetests.

## Phase 8 – experimenteller Frequenzvergleich und Notch ✓

Ein bewusst sehr leiser, manuell gestarteter Sinuston ermöglicht eine subjektive Frequenzannäherung von 250 bis 12.000 Hz. Ein globaler Biquad-Notch kann diese Frequenz mit drei begrenzten Oktavbreiten aus der lokalen Mischung absenken. Vergleichston, Filter und gespeicherte Einstellung bleiben vollständig lokal; der zentrale Stop räumt auch den Tuner und seinen AudioContext auf.

Die Funktion wird ausdrücklich nicht als Messung, Diagnose oder Therapie bezeichnet. Hinweise grenzen sie auf gleichbleibende tonale Wahrnehmungen ein, fordern zum sehr leisen und kurzen Vergleich auf und benennen die ungesicherte Evidenz personalisierter Notch-Verfahren. Automatisierte Tests prüfen Frequenzabbildung, Begrenzung, Filterrouting, expliziten Start, Live-Regelung, Speicherung und Cleanup. Die subjektive Frequenzzuordnung, Hochfrequenzwiedergabe und Verträglichkeit müssen auf einem realen iPhone und mit den verwendeten Kopfhörern geprüft werden.

## Phase 9 – mobile Navigation und unterbrechungsfreie Bearbeitung ✓

Die bisherige lange Seite ist in fünf mobile Aufgabenbereiche gegliedert. Eine ruhige Startansicht bietet Wiedergabe und Schnellzugriff; Klangauswahl, Klangformung, Sitzungswerkzeuge und Favoriten sind getrennt erreichbar. Feste Navigation, zentraler Stop und Safe-Area-Abstände sind für die Breiten von iPhone 11 bis iPhone 16 ausgelegt.

Klangparameter bleiben beim Wechsel zwischen Ansichten aktiv und werden ohne Neustart des AudioContext live übertragen. Ein Quellenwechsel verwendet einen parallelen Crossfade statt einer Fade-out-Lücke. Auch der sehr leise Vergleichston kann über einer laufenden Mischung gestartet werden. Automatisierte Tests prüfen Navigation, Live-Parameter, Crossfade-Routing, Cleanup und den unterbrechungsfreien Tuner-Start. Tatsächliche Touch-Ergonomie, Hardware-Lautstärke, thermische Stabilität und Hörwahrnehmung bleiben auf realen iPhones zu prüfen.

## Später: Reflexionsassistent
Nur nach Architekturvergleich prüfen, ob Module gemeinsame Design-Komponenten oder lokale Datenmodelle nutzen sollten. Bis dahin strikt getrennte Projekte und Repositories.
