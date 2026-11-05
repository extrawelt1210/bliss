# Bliss – Tech-Rundown im Caveman-Style

## Produkt in einem Satz

- Browser-App macht ruhige Klänge und lokale Reflexion.
- Alles lokal.
- Kein Konto.
- Kein Backend.
- Keine Audiosamples.
- Kein Tracking.
- Nutzer klickt zuerst. Dann Ton.

## Tech-Stack

- **React 19:** baut Oberfläche.
- **TypeScript 5.9:** hält Datentypen und Audio-Verträge sauber.
- **Vite 7:** Entwicklungsserver und Produktions-Build.
- **Web Audio API:** baut Audiograph im Browser.
- **AudioWorklet:** berechnet Noise, Soundscapes, Drone und Klangformung im Audiothread.
- **Vitest 3:** testet Logik und Audiowerte.
- **Testing Library + jsdom:** testet Bedienoberfläche und Nutzeraktionen.
- **CSS ohne UI-Framework:** dunkles, ruhiges, mobile-first Design.
- **Service Worker + Web App Manifest:** macht PWA und Offline-Start möglich.
- **GitHub Pages:** liefert fertigen `dist/`-Build aus.

## Architektur grob

- UI kennt nur `AudioEngine`-Interface.
- UI sagt: starten, pausieren, stoppen, Werte ändern.
- `WebAudioEngine` baut und kontrolliert echten Audiograph.
- Audioquellen leben getrennt von React-Komponenten.
- Generierte Monoquellen laufen im AudioWorklet.
- Binaurale Quellen laufen als echte Stereo-Oszillatorpaare im Haupt-Audiograph.
- Zwei Ebenen laufen unabhängig.
- Beide Ebenen treffen sich vor Tape und Raum.
- Master und Limiter sitzen ganz hinten.
- Stop räumt alles weg.
- Spätere native iOS-Engine kann hinter gleichem Interface sitzen.

## Signalweg

- **Generierter Klang:** Generator → Sound-Shaper → Worklet-Ausgang.
- **Binaural:** linke Oszillatoren + rechte Oszillatoren → Stereo-Merger.
- **Ebene 1/2:** Quelle → eigener Ebenenpegel.
- **Gemeinsamer Bus:** Ebenen → Tape-Kennlinie → sanfter Kompressor.
- **Trockener Weg:** Tape → Dry-Gain.
- **Raumweg:** Tape → 18 ms Pre-Delay → prozeduraler Stereo-Convolver → 5,6-kHz-Dämpfung → Wet-Gain.
- **Ausgang:** Dry + Wet → Master-Gain → optionaler Notch → Schutz-Limiter → Gerät.
- **Vergleichston:** sehr leiser Sinus → Schutz-Limiter → Gerät. Nur nach Tastendruck.

## Komponenten-Kurzprofile

### `src/App.tsx`

- Große UI-Schaltzentrale.
- Hält sichtbaren Zustand.
- Reicht Nutzeraktionen an `AudioEngine` weiter.
- Steuert Mixer, Timer, Sitzungen, Favoriten, Makros, Effekte, Drone-Regler, Frequenzwerkzeug und Reflexionsansicht.
- Startet Audio nie automatisch.
- Zentraler Stop bleibt immer erreichbar.

### `src/audio/types.ts`

- Gemeinsamer Vertrag.
- Definiert Klänge, Mix, Makros, Effekte, Drone-Werte, Notch-Werte und Playback-Zustände.
- Definiert `AudioEngine`-Interface.
- Enthält sichere Standardwerte.

### `src/audio/WebAudioEngine.ts`

- Baut Web-Audio-Knoten.
- Verwaltet AudioContext.
- Verwaltet zwei Ebenen.
- Lädt AudioWorklet nur bei Bedarf.
- Macht Fades bei Start, Wechsel, Pause und Stop.
- Baut Tape-, Raum- und Limiterstufe.
- Schließt Worklet-Ports und trennt Nodes beim Cleanup.
- Behandelt iOS-/Browser-Unterbrechungen als bewusste Pause.
- Baut optionalen Notch und den getrennten, sehr leisen Vergleichston.

### `src/audio/sound-processor.ts`

- Eingangspunkt des AudioWorklets.
- Wählt lokalen Generator.
- Rechnet Sample für Sample.
- Hängt Sound-Shaper hinter Generator.
- Nimmt Live-Nachrichten für Makros und Drone-Regler an.

### `src/audio/noise-generators.ts`

- Macht Brown Noise.
- Macht Pink Noise.
- Macht White Noise.
- Kein Sample.
- Kein Netzwerk.
- Deterministisch testbar mit eingesetzter Zufallsquelle.

### `src/audio/soundscape-generators.ts`

- Macht Meer, Küste, Bucht, Wind, Regen, Gewitter, Nacht, Drone und Fläche.
- Nutzt Noise, Filterzustände, Hüllkurven und Oszillatoren.
- Vermeidet harte Einzelimpulse.
- Begrenzte Ausgabewerte.
- Drone nutzt acht Oszillatoren.

### `src/audio/sound-shaper.ts`

- Formt generierte Monoquellen.
- Makros: Wärme, Weichheit, Luftigkeit, Bewegung.
- Parameter bleiben begrenzt.
- Keine scharfen Resonanzspitzen.
- Binaurale Töne bleiben davon unberührt.

### `src/audio/drone-filter.ts`

- Eigenes zustandserhaltendes Multimode-Filter.
- Modi: Low Pass, Band Pass, High Pass.
- Cutoff: 80 bis 6.000 Hz.
- Resonanz: bewusst begrenzt.
- LFO: 0,025 bis 0,35 Hz.
- Filterzustand bleibt beim Moduswechsel erhalten.
- Elektron-artiger Direktzugriff als Bedienidee.
- Keine Digitakt-/Syntakt-Schaltungsemulation.

### `src/audio/binaural-source.ts`

- Baut vier Stereo-Oszillatorpaare.
- Linker Grundton: 200 Hz.
- Rechte Seite: +4, +8 oder +12 Hz.
- Zusätzliche linke Teiltöne: 300, 400 und 600 Hz.
- Jedes Teiltonpaar behält gleichen Links/Rechts-Abstand.
- Teilpegel zusammen bleiben bei konservativen 0,16.
- Stereo-Kopfhörer nötig für vorgesehenen Effekt.

### `src/audio/spatial-effects.ts`

- Erzeugt Tape-Kennlinie lokal.
- Erzeugt Stereo-Raumimpuls lokal.
- Raum: kurz, diffus, gedämpft.
- Kein Federhall-Modell.
- Kein geladenes Impuls-Sample.
- Feste Energie-Normalisierung hält Wet-Pegel berechenbar.

### `src/audio/tinnitus-tools.ts`

- Begrenzt Frequenzen auf 250 bis 12.000 Hz.
- Übersetzt den Regler logarithmisch in Frequenzen.
- Begrenzt Notch-Breite auf 0,5 bis 1,5 Oktaven.
- Berechnet den passenden Biquad-Q-Wert.
- Keine automatische Messung. Keine Diagnose.

### `src/favorites.ts`

- Speichert Favoriten und letzte Mischung in `localStorage`.
- Speichert Mix, Pegel, Timer, Makros, Raum, Tape, Drone, Notch und Sitzung.
- Favoritenschema: Version 4.
- Letzte Mischung: Version 3.
- Absichtlich keine Abwärtskompatibilität zu alten Testdaten.
- JSON-Import akzeptiert nur aktuelles Format.

### `src/session-plan.ts`

- Beschreibt Ankommen, Klangzeit und Ausblenden.
- Rechnet Gesamtdauer und aktive Phase.
- Begrenzt freie Eingaben.
- Stilles Ende ist Standard.

### `src/reflection.ts`

- Eigenständiges lokales Datenmodell für Reflexionsnotizen.
- Prüft gespeicherte Daten defensiv vor dem Laden.
- Begrenzt Notizen auf 4.000 Zeichen und die Historie auf 200 Einträge.
- Speichert Leitfrage, Text, Zeitpunkt und optionalen Belastungswert.
- Erstellt einen versionierten JSON-Export.
- Kennt weder Audio-Engine noch KI-Anbieter.

### `src/sound-catalog.ts`

- Zentrale Liste aller auswählbaren Klänge.
- Liefert deutsche Namen und Kurzbeschreibungen.
- Übersetzt UI-Auswahl in Audio-`Sound`.

### `src/registerServiceWorker.ts`

- Registriert Service Worker nur im Produktionsmodus.
- App läuft auch weiter, wenn Registrierung fehlschlägt.
- Offline-Nutzung beginnt nach erfolgreichem ersten Laden.

### `src/styles.css`

- Komplettes Erscheinungsbild.
- Mobile-first.
- Dunkel und reizarm.
- Große Touch-Ziele.
- Sichtbare Tastatur-Fokusse.
- Reduzierte Animation bei `prefers-reduced-motion`.

## Pegel und Schutz

- Standard-Master: 18 %.
- Maximaler interner Master-Gain: 0,28.
- Ebenen-Headroom: Faktor 0,7.
- Start-Fade: 1,2 Sekunden.
- Klangwechsel-Fade: 0,18 Sekunden.
- Stop-Fade: 0,35 Sekunden.
- Master-Limiter: letzte Schutzstufe.
- Tape-Kompressor: nur leichtes Verdichten.
- Raum bleibt deutlich unter Direktsignal.
- App kann reale Kopfhörerlautstärke nicht messen.
- Hardware-Lautstärke bleibt Verantwortung des Geräts und Nutzers.

## Daten und Privatsphäre

- Audio entsteht lokal.
- Einstellungen bleiben lokal.
- Favoriten bleiben lokal.
- Check-ins bleiben nur im geöffneten React-Zustand.
- Reflexionsnotizen und freiwillig dazu gespeicherte Belastungswerte bleiben im lokalen Browser-Speicher.
- Reflexionen werden nie automatisch an einen Dienst übertragen.
- Kein Login.
- Keine Cloud-Synchronisation.
- Keine Telemetrie.
- Keine Analytics.
- Kein externes Audio-Streaming.
- Kein Medizinprodukt.
- Keine Heil- oder Hörversprechen.

## Tests

- Generatoren: endlich, begrenzt, nicht stumm.
- Generatoren: keine harten Sample-Sprünge.
- Drone: LP/BP/HP, LFO und Live-Änderungen.
- Binaural: Frequenzen und exklusives Links/Rechts-Routing.
- Engine: Start, Pause, Stop, Wechsel und Cleanup.
- Effekte: Tape-Kurve, Raumimpuls und Node-Routing.
- Frequenzwerkzeug: logarithmische Abbildung, Grenzen, Notch-Routing, expliziter Start und Cleanup.
- UI: Nutzeraktionen, zentrale Stop-Taste und Fehlerfälle.
- Speicher: aktuelles Schema und absichtlich abgewiesene Altdaten.
- Reflexion: Speichern, Datenvalidierung, Speicherfehler, UI-Ablauf und bestätigte Löschung.
- PWA: Service-Worker-Registrierung.
- 129 automatisierte Tests im vollständigen lokalen Lauf.

## Build und Betrieb

- Aktiver Arbeitsordner: `/Users/flo/Developer/bliss`, nicht iCloud Drive.
- Toolchain prüfen: `./scripts/check-toolchain.sh`.
- Abhängigkeiten: `./scripts/pnpm.sh install --frozen-lockfile`.
- Entwicklung: `./scripts/pnpm.sh dev`.
- Tests: `./scripts/pnpm.sh test`.
- Typprüfung + Build: `./scripts/pnpm.sh build`.
- Lokale Produktionsvorschau: `./scripts/pnpm.sh preview`.
- Node-Version: 22.12 bis kleiner 25; Projektvorgabe in `.node-version`, `.nvmrc` und `package.json`.
- Fertige Dateien: `dist/`.
- Öffentliche PWA: `https://extrawelt1210.github.io/bliss/`.
- iPhone-Installation: Safari → Teilen → Zum Home-Bildschirm.

## Bewusste Grenzen

- Kein echter iPhone-Hardwaretest durch Desktop-Automatisierung.
- Sperrbildschirm-Verhalten muss am Gerät geprüft werden.
- Anruf-/Unterbrechungsverhalten muss am Gerät geprüft werden.
- Lautsprecher-/Kopfhörerwechsel muss am Gerät geprüft werden.
- CPU-Stabilität langer Sessions muss am Gerät geprüft werden.
- Klangurteil bleibt Hörtest.
- Subjektive Frequenzzuordnung und Hochfrequenzwiedergabe bleiben Geräte- und Hörtest.
- Kein KI-Dialog in Integrationsphase 1.
- Der vorhandene Python-Assistent bleibt ein separates, unverändertes Projekt.

