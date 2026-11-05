#!/bin/zsh

set -e

PROJECT_DIR="${0:A:h}"
cd "$PROJECT_DIR"

if [[ -x "$PROJECT_DIR/scripts/pnpm.sh" && -x "$PROJECT_DIR/node_modules/.bin/vite" ]]; then
  exec "$PROJECT_DIR/scripts/pnpm.sh" dev --host 127.0.0.1 --open
fi

if [[ -f "$PROJECT_DIR/dist/index.html" ]] && command -v python3 >/dev/null 2>&1; then
  LOCAL_PORT=4173
  while lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; do
    LOCAL_PORT=$((LOCAL_PORT + 1))
  done

  (sleep 1; open "http://127.0.0.1:$LOCAL_PORT/") &
  echo "Bliss läuft unter http://127.0.0.1:$LOCAL_PORT/"
  echo "Dieses Fenster geöffnet lassen. Mit Ctrl-C wird der Server beendet."
  exec python3 -m http.server "$LOCAL_PORT" --bind 127.0.0.1 --directory "$PROJECT_DIR/dist"
fi

echo "Weder installierte Projektabhängigkeiten noch ein Produktionsbuild wurden gefunden."
echo "Führe im Terminal zuerst ./scripts/pnpm.sh install aus."
read -k 1
