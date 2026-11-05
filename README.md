# Bliss

Bliss ist eine private, deutschsprachige Web-App für sanfte Klangbereicherung. Rauschen, Klangwelten und binaurale Sinustöne entstehen vollständig lokal im Browser – ohne Konto, Cloud, Tracking, Audio-Samples oder externes Audio-Streaming.

> Bliss ist kein Medizinprodukt und ersetzt keine ärztliche Abklärung. Klänge angenehm leise einstellen und Tinnitus nicht aggressiv überdecken.

## Enthaltene Funktionen

- Brown, Pink und White Noise aus einem lokalen AudioWorklet
- vollständig synthetisches Meer, offene Küste, geschützte Bucht, leichter Wind, sanfter Regen, fernes Gewitter, Nachtluft, warmer Drone und schwebende Fläche
- warmer Drone mit acht leisen Oszillatoren, langsamem LFO sowie Tiefpass-, Bandpass- und Hochpassfilter
- optionaler, sehr leiser Frequenzvergleich und globaler Notch-Filter für tonale Wahrnehmungen (experimentell, keine Diagnose oder Therapie)
- binaurale Sinustöne mit 4, 8 oder 12 Hz Abstand sowie leisen Teiltonpaaren bei 300, 400 und 600 Hz links
- zwei unabhängige Mixerebenen mit eigenem Pegel und allen Klängen
- konservativer Master-Pegel, Ebenen-Headroom, sanfte Fades und nachgeschalteter Limiter
- Start, Pause, Fortsetzen, Timer für 5/10/20/30 Minuten und zentraler Stop
- Sitzungsabläufe mit stummem Ankommen, Klangzeit und langem Ausblenden; stilles Ende ist Standard
- begrenzte Klang-Makros für Wärme, Weichheit, Luftigkeit und Bewegung
- kurzer, diffuser Stereo-Raumhall und sanfte Tape-Sättigung mit leichter Kompression
- optionale Atembegleitung mit 4 Sekunden ein / 6 Sekunden aus
- lokale Favoriten mit Namen, Sortierung, Kopien, drei Schnellplätzen und JSON-Import/-Export
- Wiederherstellung und Direktstart der letzten Mischung sowie ein reduzierter Kompaktmodus
- freiwillige, nur sitzungsbezogene Check-ins
- installierbare Offline-PWA mit lokalen App-Symbolen
- bewusster Pausenzustand nach erkannten Audio-Unterbrechungen

## Lokal öffnen

Der aktive Entwicklungsordner ist `/Users/flo/Developer/bliss`. Er liegt bewusst außerhalb von iCloud Drive, weil synchronisierte `node_modules` native Build-Werkzeuge stark ausbremsen oder deren macOS-Signatur beschädigen können. Git beziehungsweise GitHub übernehmen Versionsstand und Veröffentlichung; iCloud wird für die Entwicklung nicht benötigt.

Der vollständige Ablauf und die Branch-Trennung stehen in [Lokale Entwicklung](docs/DEVELOPMENT.md).

Die projektinterne Startschicht `scripts/pnpm.sh` findet sowohl eine normale Node-Installation als auch die von Codex bereitgestellte Laufzeit und setzt den Pfad für alle Unterprozesse korrekt. Die erwartete Laufzeit ist Node 22.12 bis kleiner 25 und pnpm 10 oder 11.

Einmalig im Terminal:

```bash
cd /Users/flo/Developer/bliss
./scripts/check-toolchain.sh
./scripts/pnpm.sh install --frozen-lockfile
```

`index.html` nicht per Doppelklick als `file://`-Adresse öffnen. Vite, JavaScript-Module, AudioWorklet und die Offline-PWA benötigen einen lokalen HTTP-Server.

Auf dem Mac am einfachsten [`start-local.command`](start-local.command) doppelklicken. Das Skript stellt den mitgelieferten Produktionsbuild über einen lokalen HTTP-Server bereit und öffnet automatisch eine freie lokale Adresse. Das Terminalfenster muss dabei geöffnet bleiben.

Alternativ im Terminal:

```bash
./scripts/pnpm.sh dev --host 127.0.0.1
```

Der Doppelklick-Starter verwendet bei installierten Abhängigkeiten den Vite-Entwicklungsserver. Ohne Abhängigkeiten kann er einen vorhandenen Produktionsbuild über den lokalen Python-HTTP-Server bereitstellen. Audio startet erst nach einem Klick auf **Starten**.

## Tests und Produktionsbuild

```bash
./scripts/pnpm.sh test
./scripts/pnpm.sh test:watch
./scripts/pnpm.sh build
./scripts/pnpm.sh preview --host 127.0.0.1
```

Bei einer normal installierten Node-/pnpm-Toolchain funktionieren auch direkte `pnpm`-Befehle. Der Wrapper ist für Codex und neue Rechner die zuverlässige Standardvariante. Der Produktionsbuild liegt in `dist/`. Nach dem ersten vollständigen Laden über HTTP speichert der Service Worker die Oberfläche, App-Symbole, Skripte und AudioWorklet-Dateien für den Offline-Start.

## Bedienung

Ebene 1 ist immer verfügbar. Ebene 2 lässt sich optional zuschalten; Klang und Pegel bleiben getrennt. Das Pegelmanagement reduziert jede Ebene vor dem Master, damit zwei Quellen nicht einfach ungebremst addiert werden. Trotzdem bestimmt die Hardware-Lautstärke den realen Schalldruck.

Für binaurale Klänge Stereo-Kopfhörer verwenden und Mono-Audio deaktivieren. Zum Grundtonpaar kommen deutlich leisere Quinten-, Oktav- und höhere Harmoniepaare. Jedes Paar behält denselben gewählten Links/Rechts-Abstand, damit kein zusätzlicher schneller Schwebungsrhythmus entsteht. Der summierte Teiltonpegel bleibt auf dem bisherigen konservativen Niveau. Bliss kann die tatsächliche Kopfhörer- oder Mono-Konfiguration nicht automatisch prüfen. Frequenzangaben sind Klangoptionen, keine therapeutischen Programme.

Die vier Klang-Makros wirken nur innerhalb konservativer Grenzen auf lokal generierte Monoquellen. Sie erzeugen keine Resonanzspitzen und verändern binaurale Sinustöne nicht. Sitzungsabläufe starten während der Ankommensphase stumm, blenden über vier Sekunden ein und fahren den Masterpegel über die gewählte Ausblendphase bis auf null.

**Raumgefühl** mischt einen kurzen, lokal berechneten Stereo-Raum hinzu; es werden keine Hall-Samples geladen. Die dichte, gedämpfte Hallfahne ist bewusst nicht als Federhall ausgelegt. **Tape-Sättigung** rundet Spitzen mit einer weichen Kennlinie ab und erhöht gleichzeitig nur leicht die Kompression. Beide Effekte sind konservativ begrenzt, Bestandteil von Favoriten und jederzeit auf null regelbar.

Der optionale **Frequenzvergleich** wird ausschließlich per Tastendruck gestartet und bleibt unabhängig vom Masterpegel fest sehr leise. Er dient nur dazu, bei einem gleichbleibenden tonalen Tinnitus eine subjektive Frequenz anzunähern. Die gewählte Frequenz kann anschließend mit 0,5, 1 oder 1,5 Oktaven Breite aus der lokal erzeugten Mischung abgesenkt werden. Das ist keine Messung, Diagnose oder nachgewiesene Therapie; bei pulsierender oder rauschender Wahrnehmung sowie bei Unbehagen oder Verstärkung soll das Werkzeug nicht verwendet beziehungsweise sofort gestoppt werden.

Beim **warmen Drone** formen acht leise Teiloszillatoren einen tiefen Akkord. Ein langsamer LFO moduliert Filter und minimale Tonhöhendrift. Das eigene Multimode-Filter bietet einen direkten LP/BP/HP-Workflow; Cutoff, Resonanz, Tempo und Tiefe sind für ruhige Bewegung begrenzt. Es handelt sich nicht um eine Schaltungs- oder Klangemulation bestimmter Hardware. Filter- und LFO-Werte werden im aktuellen lokalen Setup und in neuen Favoriten gespeichert. Das neue Speicherschema übernimmt absichtlich keine älteren Testfavoriten.

Favoriten und die zuletzt eingestellte Mischung werden ausschließlich im lokalen Browser-Speicher abgelegt. Export und Import verwenden eine lokale JSON-Datei; nichts wird hochgeladen. Die freiwilligen Belastungswerte bleiben nur im aktuellen Seitenzustand und werden nicht dauerhaft gespeichert. Es gibt keine verpflichtenden Eingaben.

## Architektur und Audio-Sicherheit

Die React-Oberfläche verwendet nur das Interface `AudioEngine`. `WebAudioEngine` kapselt Web Audio API, AudioWorklet, beide Ebenen, Pegelsteuerung, Unterbrechungsbehandlung und vollständiges Node-/AudioContext-Cleanup. Eine mögliche spätere native iOS-Audioimplementierung kann hinter derselben Grenze ergänzt werden.

Der kompakte, rein stichpunktartige Überblick steht in [Tech-Rundown im Caveman-Style](docs/TECH_RUNDOWN.md).

Monoquellen werden im AudioWorklet pro Sample synthetisiert und auf beide Ausgabekanäle verteilt. Ein unabhängiger, begrenzter Sound-Shaper setzt die Klang-Makros um. Die Drone-Synthese enthält zusätzlich ein zustandserhaltendes Multimode-Filter im Worklet; Regleränderungen werden live als sichere Parameterwerte übermittelt. Binaurale Klänge routen lokale Oszillatorpaare getrennt auf links und rechts. Die gemeinsame Effektstufe erzeugt die Raumimpulsantwort lokal, nutzt eine oversampelte Tape-Kennlinie und einen sanften Kompressor. Jede Ebene erhält einen Headroom-Faktor, der Master-Gain ist begrenzt, und ein nachgeschalteter Dynamics Compressor dient als zusätzliche Schutzstufe. Start, Pause, Stop, Phasen und Klangwechsel verwenden Pegelrampen. Stop verwirft ausstehende Operationen, stoppt Quellen, schließt Worklet-Ports, trennt einschließlich aller Effektnodes und schließt den AudioContext.

## PWA und iPhone

Das Manifest und die App-Symbole ermöglichen die Home-Screen-Installation. Offline-Verfügbarkeit beginnt nach einem erfolgreichen ersten Laden des Produktionsbuilds. Der Entwicklungsserver ist nicht der maßgebliche Offline-Test.

Automatisierte Tests können reale iPhone-Eigenschaften wie Hardware-Lautstärke, Audio-Routing, Stummschalter, Sperrbildschirm, Telefonanrufe und Kopfhörerwechsel nicht belastbar bestätigen. Dafür gibt es die [manuelle Checkliste](docs/MANUAL_TESTS.md) und das [iPhone-Testprotokoll](docs/IOS_TEST_PROTOCOL.md). Die [Entscheidungskriterien für eine native iOS-Audioebene](docs/IOS_NATIVE_EVALUATION.md) greifen erst nach diesen Gerätetests.

## Datenschutz und Projektgrenzen

Bliss sendet keine Nutzungs-, Gesundheits- oder Audiodaten und enthält keine Telemetrie oder Analytics. Der vorhandene Reflexionsassistent ist nicht Teil dieses Projekts und wurde nicht verändert oder zusammengeführt.
