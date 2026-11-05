# Entscheidungshilfe: Web-PWA oder native iOS-Audioebene

Bliss bleibt zunächst eine lokale PWA. Eine native iOS-Variante wird nicht allein wegen einzelner Browserunterschiede begonnen, sondern nach den Ergebnissen des echten Gerätetests bewertet.

## Native Lösung näher prüfen, wenn

- ein für die Nutzung notwendiger Audiozustand bei Sperrbildschirm oder Hintergrund reproduzierbar nicht erreichbar ist,
- Routenwechsel oder Systemunterbrechungen trotz sicherem Web-Lifecycle zu unkontrollierbaren oder unerwartet lauten Zuständen führen,
- ein zuverlässiger, vom Betriebssystem integrierter Audio-Lifecycle zum Kernbedarf wird,
- Offline-Installation oder Wiederaufnahme der PWA auf den Zielgeräten unzuverlässig bleibt,
- die Probleme auf mehreren unterstützten Geräten reproduzierbar sind und nicht durch eine sichere PWA-Anpassung gelöst werden können.

## Bei der Evaluation beibehalten

- `AudioEngine` bleibt die Grenze zwischen UI und Audioimplementierung.
- Klangparameter und Generatorlogik bleiben testbar und unabhängig von React.
- Konservative Pegel, Fades, Limiter, zentraler Stop und explizite Benutzeraktion bleiben verpflichtend.
- Es entstehen keine Accounts, Telemetrie, Cloud-Audio- oder Streaming-Abhängigkeiten.
- Eine native App ist ein eigener technischer Ausgabepfad; sie wird nicht mit dem Reflexionsassistenten oder dessen Repository zusammengelegt.

## Entscheidungsvorlage nach Gerätetest

1. Fehler aus `IOS_TEST_PROTOCOL.md` nach Sicherheitsrelevanz und Nutzungshäufigkeit ordnen.
2. Für jeden Fehler eine PWA-Korrektur und eine native Alternative mit Aufwand und Restrisiko festhalten.
3. Native Entwicklung nur empfehlen, wenn ein wesentlicher Anwendungsfall sonst nicht zuverlässig und sicher erfüllt werden kann.
4. Die Entscheidung mit getesteten Geräten und iOS-Versionen dokumentieren; ungetestete Annahmen ausdrücklich kennzeichnen.
