# Produktbrief – Bliss

## Zielgruppe und Zweck
Eine private App für zwei Alltagssituationen: (1) Tinnitus ist gerade störend und angenehme Klangbereicherung kann helfen, weniger darauf zu fokussieren; (2) innere Unruhe und Stress, bei denen ruhige Klangwelten und freiwillige Atembegleitung angenehm sein können.

## Prinzipien
- Ruhige, nicht wertende Sprache, kein Leistungsdruck, keine Gamification.
- Keine Heilversprechen; keine Tinnitusdiagnose oder Therapie.
- Klänge so leise wie angenehm und nicht zur vollständigen Überdeckung des Tinnitus zwingen.
- Offline-first und Privatsphäre: lokal generierte Audiosignale; Nutzerdaten nur auf dem Gerät.
- Keine täglichen Streaks, Push-Benachrichtigungen oder erschreckenden Audioeffekte.

## MVP-Funktionen (umgesetzt)

1. Grundsound: Brown, Pink und White Noise; Start, Pause, Stop, Gesamtlautstärke, Fade und mobile UI.
2. Klangmixer: zwei unabhängige Ebenen, eigene Pegel, alle vorhandenen Klänge und Timer für 5/10/20/30 Minuten.
3. Ruhemodus: optionale Atemvisualisierung mit 4 s ein / 6 s aus, lokale Favoriten und freiwillige Belastungs-Check-ins (0–10) vor/nach Sitzungen.
4. Offline-PWA mit Manifest, Home-Screen-Symbolen und bewusstem Pausenzustand nach Audio-Unterbrechungen.
5. Ruhige Sitzungsabläufe, konservative Klang-Makros, erweiterte synthetische Klangwelten, ausbaubare lokale Favoriten und kompakter Schnellzugriff.

Die reale iPhone-Prüfung für Hardware-Lautstärke, Routing, Sperrbildschirm und Systemunterbrechungen ist als Geräteprotokoll vorbereitet, aber nicht durch Desktop-Automatisierung ersetzbar.

## Beauftragte Erweiterung – binaurale Klänge

Auf ausdrücklichen Nutzerauftrag nach Phase 1 werden binaurale Klänge ergänzt (ursprünglich nicht im MVP):
- Als eigenständiger Klang in jeder der beiden Mixerebenen auswählbar.
- Lokal erzeugte Sinustöne: links 200 Hz, rechts 204/208/212 Hz; Frequenzabstand 4/8/12 Hz, Standard 8 Hz.
- Zusätzliche leise Teiltonpaare bei 300, 400 und 600 Hz links; rechts jeweils derselbe gewählte Abstand. Grundton und Teiltöne teilen sich den bisherigen konservativen Gesamtpegel.
- Stereo-Kopfhörerhinweis und Hinweis auf deaktiviertes Mono-Audio.
- Dieselben leisen Starts, Fades, Pause-/Stopp- und Cleanup-Regeln wie für Rauschen.
- Neutrale Frequenzangaben ohne Schlaf-, Konzentrations-, Gehirnwellen- oder Heilversprechen.

## Beauftragte Erweiterung – synthetische Klangwelten

Auf ausdrücklichen Nutzerauftrag werden vor dem Klangmixer drei weitere eigenständige Klänge ergänzt:
- **Sanftes Meer** aus gefiltertem Rauschen und langsamen, überlagerten Wellenbewegungen.
- **Leichter Wind** aus tief gefiltertem Rauschen mit ruhigen, unregelmäßigen Pegelbewegungen.
- **Warmer Drone** aus acht leisen Oszillatoren mit sehr langsamer Tonhöhendrift.
- Alle Klangwelten werden vollständig lokal und ohne Audio-Samples oder externes Streaming synthetisiert.
- In beiden Mixerebenen auswählbar und mit Timer nutzbar.
- Keine scharfen Einzelimpulse; dieselben leisen Starts, Fades, Schutz- und Cleanup-Regeln wie für die bestehenden Klänge.

## Beauftragte Erweiterung – persönliche Klangpraxis

Die fünf gemeinsam ausgewählten Erweiterungen sind umgesetzt:

- **Sitzungsabläufe:** Vorlagen für 10, 20 und 30 Minuten sowie freie, begrenzte Eingaben für stummes Ankommen, Klangzeit und langes Ausblenden. Sitzungen enden standardmäßig still; ein sehr leiser Abschlussklang ist bewusst optional.
- **Klang-Makros:** Wärme, Weichheit, Luftigkeit und Bewegung formen ausschließlich lokal erzeugte Mono-Klänge in konservativ begrenzten Bereichen. Binaurale Sinustöne bleiben neutral.
- **Weitere Syntheseklänge:** offene Küste, geschützte Bucht, sanfter Regen, fernes Gewitter, Nachtluft und schwebende Fläche ergänzen Meer, Wind und Drone. Es werden weiterhin keine Audiosamples geladen.
- **Favoritenverwaltung:** eigene Namen, Umbenennen, Duplizieren, Sortieren, drei Schnellplätze sowie lokaler JSON-Export und -Import.
- **Schnellzugriff:** die letzte Mischung und drei Schnellfavoriten lassen sich direkt starten. Ein Kompaktmodus zeigt nur Wiedergabe, Pegel und Schnellplätze und versucht auf unterstützten Browsern den Vollbildmodus.

Mischung, Master-Pegel, Timer, Makros und Sitzungsablauf werden als letzte lokale Konfiguration wiederhergestellt. Es gibt weiterhin kein Konto und keine Synchronisation.

## Beauftragte Erweiterung – Raum und Tape

Auf ausdrücklichen Nutzerauftrag wird die gemeinsame Mischung um zwei lokal berechnete Effekte ergänzt:
- **Raumgefühl:** kurzer, diffuser Stereo-Raum mit gedämpfter Hallfahne und ohne Federhall-Charakter; kein Hall-Sample und kein externer Abruf.
- **Tape-Sättigung:** weich begrenzte Kennlinie mit leichter, langsam reagierender Kompression statt hörbar aggressivem Verzerren.
- Beide Anteile sind getrennt regelbar, konservativ begrenzt und laufen vor dem bestehenden Master-Limiter.
- Änderungen erfolgen ohne Pegelsprung; Stop und Cleanup trennen auch alle Effektnodes und den lokal erzeugten Impulspuffer.
- Raum- und Tape-Anteil werden zusammen mit letzter Mischung und Favoriten ausschließlich lokal gespeichert.

## Beauftragte Erweiterung – Drone-Synthese und Multimode-Filter

Der warme Drone erhält eine eigenständige, vollständig lokale Syntheseebene:
- Acht konservativ gemischte Oszillatoren bilden Grundton, Quinte, Oktaven und leise Obertöne.
- Ein langsamer LFO moduliert den Filter-Cutoff, eine minimale Tonhöhendrift und einen kaum merklichen Atemanteil.
- Ein zustandserhaltendes Multimode-Filter bietet Tiefpass, Bandpass und Hochpass sowie begrenzte Cutoff- und Resonanzwerte.
- Die Bedienidee ist ein direkter LP/BP/HP-Workflow; es wird keine Elektron-Schaltung und kein Digitakt-/Syntakt-Klang emuliert.
- Filtertyp, Cutoff, Resonanz, LFO-Tempo und LFO-Tiefe sind live regelbar und Bestandteil neuer lokaler Setups und Favoriten.
- Das neue Speicherschema ist bewusst nicht abwärtskompatibel, da vorhandene Daten nur Testzustände waren.

## Beauftragte Erweiterung – Frequenzvergleich und Notch

Auf ausdrücklichen Nutzerauftrag wird ein optionales, experimentelles Werkzeug ergänzt:
- Ein nur nach Tastendruck hörbarer, sehr leiser Sinuston unterstützt die subjektive Annäherung an einen gleichbleibenden Tinnituston zwischen 250 und 12.000 Hz.
- Die gewählte Frequenz kann als globaler Notch auf die lokal erzeugte Mischung angewendet werden; die Breite ist konservativ auf 0,5, 1 oder 1,5 Oktaven begrenzt.
- Tuner und Notch sind keine Messung, Diagnose oder Therapie. Die Oberfläche weist ausdrücklich auf die ungesicherte Wirksamkeit personalisierter Notch-Verfahren hin.
- Das Werkzeug ist nicht für pulsierende oder rauschende Wahrnehmungen gedacht und fordert zum sofortigen Stoppen bei Unbehagen oder Verstärkung auf.
- Der Vergleichston läuft nie automatisch, bleibt fest sehr leise und wird durch den zentralen Stop sowie beim Start einer Mischung vollständig beendet.
- Frequenz und Notch-Einstellung bleiben ausschließlich lokal und sind Bestandteil des aktuellen Setups und neuer Favoriten.

## Weiterhin nicht im MVP
- Therapeutische Tonprogramme oder Aussagen über eine therapeutische Wirksamkeit.
- KI-Funktionen, Sprachmodelle, Backend, Benutzerkonto, Synchronisation, kostenpflichtige Abos.
- Verbindung mit dem bestehenden Reflexionsassistenten.

## Beauftragte Erweiterung – mobile App-Navigation und Live-Klangbearbeitung

- Die Oberfläche ist für iPhone 11 bis iPhone 16 in fünf kurze Bereiche gegliedert: Heute, Klänge, Formen, Sitzung und Favoriten.
- Die Startansicht beschränkt sich auf aktuelle Mischung, Schnellzugriff, Gesamtlautstärke und Wiedergabe. Eine feste untere Navigation ersetzt die frühere lange Einstellungsseite.
- Der zentrale Stop bleibt in jedem Bereich erreichbar; Safe-Area-Abstände schützen Navigation und Stop vor Home-Indikator und Displayrändern.
- Ansichtswechsel beeinflussen die Audio-Engine nicht. Pegel, Makros, Raum/Tape, Drone-Filter/LFO und Notch werden live aktualisiert.
- Klangwechsel innerhalb einer laufenden Ebene verwenden parallele 180-ms-Crossfades: Die neue Quelle wird vorbereitet, während die alte weiterläuft, und erst danach wird die alte Node freigegeben.
- Der sehr leise Vergleichston kann bewusst über einer laufenden Mischung gestartet werden; er erzwingt keinen Stop der Mischung und bleibt über den zentralen Stop abschaltbar.

## Akzeptanzkriterien Phase 1
- Mac Safari/Chrome und iOS Safari können Brown/Pink Noise per Benutzeraktion starten.
- Pause/Stop funktioniert reproduzierbar; keine hörbaren Klicks beim Wechsel.
- Wiederholter Start/Stop erzeugt keine wachsende Zahl von AudioContext-Instanzen.
- Einstellbarer Pegel beginnt konservativ und wird bei einer neuen Sitzung nicht unerwartet laut.
- Grundbedienung auf einem kleinen iPhone-Bildschirm ohne Zoom möglich.
- Automatisierte Tests sind dokumentiert und laufen, zusätzlich eine manuelle iOS-Testliste.
