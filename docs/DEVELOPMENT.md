# Lokale Entwicklung

## Kanonischer Arbeitsordner

- Quellcode: `/Users/flo/Developer/bliss`
- Der frühere iCloud-Ordner ist nur noch die Migrationsquelle und kein Entwicklungsordner.
- GitHub-Remote: `https://github.com/extrawelt1210/bliss.git`
- `develop`: Quellcode und laufende Entwicklung.
- `main`: bisheriger statischer GitHub-Pages-Stand.

`node_modules` gehört nicht in iCloud Drive. Native Pakete wie Rollup werden dort durch Synchronisation und macOS-Signaturprüfungen langsam oder unbrauchbar. Im lokalen Arbeitsordner bleiben Quellcode, Abhängigkeiten und Build-Dateien auf derselben lokalen Festplatte.

## Einmalig

```bash
cd /Users/flo/Developer/bliss
./scripts/check-toolchain.sh
./scripts/pnpm.sh install --frozen-lockfile
```

Der Wrapper verwendet eine normale Node-Installation, wenn sie vorhanden ist. In Codex findet er automatisch die mitgelieferte Node-Laufzeit und setzt den Pfad auch für Vite-, Vitest- und TypeScript-Unterprozesse.

## Alltag

```bash
./scripts/pnpm.sh dev
./scripts/pnpm.sh test
./scripts/pnpm.sh build
./scripts/pnpm.sh preview
```

Alternativ `start-local.command` doppelklicken. Mit installierten Abhängigkeiten startet es den Vite-Entwicklungsserver. Ohne Abhängigkeiten stellt es nur einen bereits vorhandenen Produktionsbuild bereit.

## Vor einem Commit

```bash
./scripts/pnpm.sh test
./scripts/pnpm.sh build
git status --short
```

Der Build-Ordner `dist/` bleibt ignoriert. Die bestehende Veröffentlichung auf `main` wird erst in einem getrennten Deploy-Schritt aktualisiert; Entwicklung und Veröffentlichung überschreiben sich dadurch nicht versehentlich.

## In Codex

- Für neue Arbeit `/Users/flo/Developer/bliss` als Projekt beziehungsweise Workspace öffnen.
- Normale Änderungen auf `develop` beginnen.
- Separate Worktrees ebenfalls von `develop` starten, nicht vom statischen `main`.
- Der alte iCloud-Pfad soll nicht mehr als Workspace verwendet werden.
