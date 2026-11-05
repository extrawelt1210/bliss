# Manuelle Testcheckliste – Bliss Roadmap

Vor dem Test die Systemlautstärke niedrig einstellen. Nicht mit hoher Lautstärke oder empfindlichen Kopfhörern beginnen.

## macOS – Safari und Chrome

- [ ] Seite frisch öffnen: Es ist kein Klang zu hören und kein AudioContext startet ohne Klick.
- [ ] **Starten** anklicken: braunes Rauschen setzt sanft und leise ein.
- [ ] Rosa Rauschen wählen: der Übergang erfolgt ohne hörbaren Klick oder Pegelsprung.
- [ ] Lautstärke langsam verändern: der Pegel folgt ohne abrupten Sprung.
- [ ] **Pausieren** anklicken: der Klang blendet aus und stoppt hörbar.
- [ ] **Fortsetzen** anklicken: derselbe Klang blendet sanft wieder ein.
- [ ] **Sofort stoppen** anklicken: Klang endet zügig und der Status wechselt zu „Bereit“.
- [ ] Zehnmal Start/Stop wiederholen: keine Verlangsamung, kein mehrfaches Audio und keine wachsende Zahl aktiver AudioContexts in den Browser-Entwicklerwerkzeugen.
- [ ] Tab neu laden: Lautstärke startet wieder konservativ bei 18 %.
- [ ] Tastaturprüfung: alle Bedienelemente per Tab erreichen; Fokus ist gut sichtbar; Auswahl per Enter/Leertaste möglich.
- [ ] Browser-Audio blockieren oder AudioWorklet künstlich verhindern: verständliche Fehlermeldung erscheint, Oberfläche bleibt bedienbar.

## Mixer und Timer

- [ ] Ebene 2 einschalten: die Auswahl allein startet kein Audio.
- [ ] Zwei unterschiedliche Klänge starten und beide Ebenen getrennt regeln; kein abrupter Pegelsprung oder Clipping.
- [ ] Jede Ebene während der Wiedergabe unabhängig wechseln und deaktivieren; die andere Ebene spielt unverändert weiter.
- [ ] White Noise in beiden Ebenen prüfen; der Klang bleibt gleichmäßig und enthält keine hörbaren Loops.
- [ ] 5/10/20/30 Minuten auswählen: Restzeit wird angezeigt und der Timer stoppt vollständig.
- [ ] Während eines laufenden Timers manuell stoppen: Restzeit und Audio werden zurückgesetzt.
- [ ] Master-Pegel und beide Ebenen hoch einstellen: Limiter greift ohne offensichtliche Verzerrung; trotzdem mit niedriger Hardware-Lautstärke beginnen.

## Ruhemodus und lokale Daten

- [ ] Atemkreis ein-/ausschalten: 4 Sekunden Einatmen und 6 Sekunden Ausatmen sind erkennbar; keine Eingabe ist verpflichtend.
- [ ] „Bewegung reduzieren“ aktivieren: Atemkreis und Klangvisualisierung bewegen sich nicht dauerhaft.
- [ ] Mischung als Favorit speichern, anwenden und entfernen; nach Neuladen bleibt der Favorit lokal erhalten.
- [ ] Belastung vorher/nachher freiwillig eintragen; die Werte verschwinden nach einem vollständigen Neuladen und werden nicht gespeichert.

## PWA und Offline

- [ ] Produktionsbuild über HTTP öffnen, einmal vollständig laden und danach Netzwerk trennen: Oberfläche, Manifest, Symbole und Audio-Worklet bleiben verfügbar.
- [ ] Auf dem Home-Bildschirm installieren: Name und Bliss-Symbol erscheinen; App startet im eigenständigen Fenster.
- [ ] Nach einem neuen Build erneut öffnen: die aktuelle Version ersetzt den alten Cache.
- [ ] Offline starten, Mischung wiedergeben, pausieren und stoppen; dafür wird kein externer Audiodienst benötigt.

## iPhone – echtes Gerät, Safari

- [ ] Auf einem kleinen iPhone-Viewport ist alles ohne Zoomen erreichbar; der Stopp-Button bleibt sichtbar.
- [ ] Vor dem ersten Tippen startet kein Audio.
- [ ] Nach **Starten** setzt der Klang sanft ein und bleibt bei niedriger Hardware-Lautstärke angenehm leise.
- [ ] Brown/Pink-Wechsel, Pause, Fortsetzen und Stop funktionieren wiederholt ohne Klicks.
- [ ] Hardware-Lautstärketasten verhalten sich erwartbar; ein neuer Start ist nicht unerwartet laut.
- [ ] Kontrollzentrum öffnen und zurückkehren: Status und Audio verhalten sich nachvollziehbar.
- [ ] Eingehenden Anruf bzw. Siri-/Sprachassistent-Unterbrechung simulieren: anschließend lässt sich die Wiedergabe bewusst neu starten oder fortsetzen.
- [ ] Kopfhörer während der Wiedergabe trennen: kein unerwarteter lauter Wechsel zum Lautsprecher; danach bewusst neu starten.
- [ ] Bildschirm sperren und wieder entsperren: tatsächliches iOS-Verhalten dokumentieren. Hintergrund- und Sperrbildschirm-Audio sind in Phase 1 nicht garantiert.
- [ ] Safari in den Hintergrund schicken und zurückkehren: Audiozustand prüfen und eventuelle Unterbrechung dokumentieren.
- [ ] VoiceOver aktivieren: Überschriften, Status, Rauschauswahl, Lautstärke sowie Start/Pause/Stop werden sinnvoll angesagt.
- [ ] „Bewegung reduzieren“ aktivieren: keine dauerhaft bewegte Klangvisualisierung.

## Binaurale Erweiterung – zusätzlich mit Stereo-Kopfhörern

- [ ] **Binaurale Klänge** wählen: Hinweis zu Stereo-Kopfhörern und Mono-Audio sichtbar; Auswahl allein startet nichts.
- [ ] 4/8/12 Hz vor dem Start wählen; angezeigte Frequenzen stimmen mit 200 Hz links und 204/208/212 Hz rechts überein.
- [ ] Die leisen Teiltonpaare bei 300, 400 und 600 Hz links bleiben klar unter dem Grundton; rechts gilt für jedes Paar derselbe gewählte Abstand.
- [ ] Der reichere binaurale Klang wirkt weder scharf noch deutlich lauter als zuvor und erzeugt keinen zusätzlichen schnellen Schwebungsrhythmus.
- [ ] Mit leiser Gerätelautstärke starten; beide Seiten hören, der Wechsel vom Rauschen wirkt nicht unerwartet laut.
- [ ] Frequenzabstand und Klangart während Wiedergabe ändern: kurzer sanfter Übergang, kein Klicken, kein überlagerter alter Ton.
- [ ] Pausieren, Abstand ändern, fortsetzen: in der Pause bleibt es still, danach gilt die neue Auswahl.
- [ ] Sofort nach Start oder während eines Wechsels stoppen: kein verspäteter Neustart; erneuter Start beginnt bei 18 %.
- [ ] Binaural mindestens zehnmal starten/stoppen und zwischen beiden Rauscharten wechseln: keine zurückbleibenden Töne.
- [ ] Auswahl per Tab und Pfeiltasten bedienen; VoiceOver sagt Klang und gewählten Frequenzabstand an.
- [ ] iPhone: Stereo-Kopfhörer, Mono-Einstellung, Kopfhörerwechsel und Audio-Unterbrechungen manuell prüfen. Noch nicht am echten Gerät bestätigt.

## Synthetische Klangwelten

- [ ] **Sanftes Meer**, **Offene Küste**, **Geschützte Bucht**, **Leichter Wind**, **Sanfter Regen**, **Fernes Gewitter**, **Nachtluft**, **Warmer Drone** und **Schwebende Fläche** lassen sich jeweils auswählen, ohne dass die Auswahl allein Audio startet.
- [ ] Jeder Klang startet bei 18 % sanft und ohne hörbaren Klick; keine Klangwelt wirkt gegenüber Brown/Pink unerwartet laut.
- [ ] Meer entwickelt langsame, überlagerte Wellenbewegungen ohne klar hörbaren Loop oder einzelne scharfe Gischtimpulse.
- [ ] Wind verändert Pegel und Klangfarbe langsam, ohne Pfeifen, harte Böen oder überraschende Einzelereignisse.
- [ ] Drone bleibt mit acht Oszillatoren tief und gleichmäßig; die langsame Drift erzeugt keinen rhythmischen Puls und keine auffälligen hohen Töne.
- [ ] Beim ausgewählten Drone ist das Panel **Oszillatoren & Multimode-Filter** sichtbar; bei Mischungen ohne Drone ist es ausgeblendet.
- [ ] LP, BP und HP nacheinander wählen: der Modus wechselt ohne Klick, Pegelsprung, Instabilität oder scharfe Resonanzspitze.
- [ ] Cutoff und Resonanz langsam über den gesamten Bereich bewegen; das Filter bleibt musikalisch begrenzt und der zentrale Stop jederzeit erreichbar.
- [ ] LFO-Tempo und LFO-Tiefe bei niedriger Hardware-Lautstärke verändern; die Bewegung bleibt langsam und wird nicht zu einem rhythmischen Puls.
- [ ] Drone als zweite Ebene wählen und alle Filter-/LFO-Regler prüfen; nur der Drone ändert sich hörbar, die andere Klangwelt läuft stabil weiter.
- [ ] Zwischen allen Klangwelten, Rauschen und binauralen Klängen wechseln: kurzer sanfter Übergang, kein überlagerter alter Klang.
- [ ] Pause, Fortsetzen und **Sofort stoppen** für jede Klangwelt prüfen; nach Stop bleibt kein Ton oder Worklet aktiv.
- [ ] Jede Klangwelt mindestens zehnmal starten/stoppen und auf einem kleinen iPhone-Viewport bedienen.
- [ ] Auf einem echten iPhone mit Lautsprecher und leisen Kopfhörern auf Verzerrung, Aussetzer und unerwartete Pegelwechsel hören. Noch nicht am echten Gerät bestätigt.

## Sitzungsabläufe und Klang-Makros

- [ ] Die Vorlagen 10/20/30 Minuten setzen nachvollziehbare Werte für Ankommen, Klangzeit und Ausblenden; freie Eingaben bleiben innerhalb 0–10/1–60/0–10 Minuten.
- [ ] Eine Sitzung mit Ankommensphase startet stumm; am Phasenwechsel blendet der gewählte Klang weich ein.
- [ ] Am Beginn der letzten Phase wird der Klang über die vollständige gewählte Dauer kontinuierlich bis auf null ausgeblendet.
- [ ] **Still beenden** ist standardmäßig aktiv. Bei deaktivierter Option ist nur ein sehr leiser, kurzer Abschlussklang zu hören.
- [ ] Pause in jeder Phase hält Uhr und Klangzustand an; Fortsetzen springt nicht in eine andere Phase und erzeugt keinen Pegelsprung.
- [ ] Zentraler Stop beendet jede Phase sofort und entfernt Restzeit und Phasenstatus.
- [ ] Wärme, Weichheit, Luftigkeit und Bewegung lassen sich während einer lokal erzeugten Klangwelt ohne Klick, harte Transienten oder unerwarteten Pegelsprung ändern.
- [ ] Die Makros verändern binaurale Klänge hörbar nicht und bleiben nach einem Neuladen als Teil der letzten Mischung erhalten.

## Erweiterte Favoriten und Schnellzugriff

- [ ] Favorit mit eigenem Namen speichern, inline umbenennen, duplizieren und mit Pfeiltasten-Schaltflächen neu sortieren; Reihenfolge und Namen bleiben nach Neuladen erhalten.
- [ ] Je einen Favoriten auf S1, S2 und S3 legen; ein Platz kann nie doppelt belegt sein und lässt sich durch erneuten Klick freigeben.
- [ ] Schnellfavorit und **Letzte Mischung starten** beginnen erst nach dem bewussten Klick und laden Klang, beide Ebenen, Pegel, Makros und Sitzungsablauf vollständig.
- [ ] JSON exportieren, Favoriten entfernen und die Datei wieder importieren; alle gültigen Daten werden ausschließlich lokal wiederhergestellt.
- [ ] Eine beschädigte oder fremde JSON-Datei zeigt eine verständliche Fehlermeldung und verändert die vorhandenen Favoriten nicht.
- [ ] Kompaktmodus zeigt nur aktuelle Mischung, Schnellplätze, Master-Pegel, Start/Pause und zentralen Stop; **Alle Einstellungen** stellt die vollständige Ansicht wieder her.
- [ ] Auf Browsern ohne Fullscreen-API funktioniert der Kompaktmodus trotzdem; auf unterstützten Browsern lässt sich Vollbild wieder verlassen.

## Raumgefühl und Tape-Sättigung

- [ ] **Raumgefühl** von 0 auf 100 % bewegen: der Übergang bleibt weich; die Hallfahne wirkt kurz, diffus und nicht metallisch oder federnd.
- [ ] Bei 0 % Raumgefühl ist das Direktsignal trocken; bei 100 % bleibt es klar und deutlich lauter als die begrenzte Hallfahne.
- [ ] **Tape-Sättigung** langsam erhöhen: Spitzen werden dezent runder und leicht komprimiert, ohne deutliches Pumpen, Kratzen oder Lautheitssprung.
- [ ] Beide Effekte während Brown Noise, Regen, Drone und binauralem Klang regeln; Stereoabbildung, Masterpegel und zentraler Stop bleiben nachvollziehbar.
- [ ] Beide Regler auf 100 %, zwei Ebenen und hohen App-Pegel einstellen, aber mit niedriger Hardware-Lautstärke beginnen: kein digitales Clipping oder instabiler Pegel.
- [ ] Favorit speichern, neu laden und per Schnellzugriff starten: Raum- und Tape-Werte werden lokal wiederhergestellt.
- [ ] Pause, Fortsetzen und zehnmal Stop/Start mit aktivem Raum prüfen: keine alte Hallfahne, kein Mehrfachsignal und keine zurückbleibenden AudioNodes.
- [ ] Auf einem echten iPhone mit Lautsprecher sowie leisen Stereo-Kopfhörern Klang, CPU-Aussetzer und Unterbrechungen prüfen. Noch nicht am echten Gerät bestätigt.

## Experimenteller Frequenzvergleich und Notch

- [ ] Auswahl und Frequenzregler bleiben vollständig still, bis **Vergleichston leise anhören** bewusst gedrückt wird.
- [ ] Vor dem Start Systemlautstärke niedrig setzen; Vergleichston bei 250, 1.000, 6.000 und 12.000 Hz kurz prüfen. Nicht lauter drehen, um hohe Frequenzen erzwingen zu wollen.
- [ ] Frequenz bei laufendem Vergleichston verändern: Änderung bleibt ohne Klick, Pegelsprung oder zweiten überlagerten Ton.
- [ ] **Vergleichston stoppen** und zentralen **Sofort stoppen** getrennt prüfen; danach bleibt kein Ton und kein AudioContext zurück.
- [ ] Eine normale Mischung starten, während zuvor der Vergleichston lief: Tuner endet vollständig, Mischung blendet normal ein.
- [ ] Notch bei Brown, Pink, White, Drone und Regen aktivieren; 0,5, 1 und 1,5 Oktaven vergleichen. Keine Verstärkung oder scharfe Resonanz darf entstehen.
- [ ] Frequenz und Notch in Favorit und letzter Mischung speichern und nach Neuladen wiederherstellen; der Vergleichston startet dabei niemals automatisch.
- [ ] VoiceOver benennt Frequenz, Notch-Schalter, Breite und beide Tuner-Schaltflächen verständlich.
- [ ] Auf echtem iPhone und den vorgesehenen Kopfhörern Frequenzbereich und Verträglichkeit prüfen. Bei Unbehagen oder subjektiver Verstärkung sofort stoppen.

## Grenzen der Verifikation

iOS kann Web-Audio je nach Version, Gerätezustand und Unterbrechung anders suspendieren. Hardware-Lautstärke, Audio-Routing, Stummschalter, Sperrbildschirm, Telefonanrufe und das Abziehen von Kopfhörern sind deshalb ausdrücklich reale Gerätetests. Automatisierte Browser-Tests können diese Fälle nicht belastbar bestätigen.

Die automatisierten Audiotests prüfen Frequenzen, exklusives Links-/Rechts-Routing, gedrosselten Pegel, Fades, Suspend/Resume, abgebrochene Starts/Wechsel und Node-/Context-Cleanup mit Web-Audio-Testdoubles. Sie ersetzen weder eine Hörprüfung noch eine Messung der realen Kopfhörerausgabe.

Für die konkrete Geräteerfassung ist zusätzlich [`IOS_TEST_PROTOCOL.md`](IOS_TEST_PROTOCOL.md) vorgesehen.
