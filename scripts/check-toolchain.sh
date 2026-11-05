#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"

echo "Bliss Toolchain"
"$SCRIPT_DIR/pnpm.sh" exec node --version
"$SCRIPT_DIR/pnpm.sh" --version

"$SCRIPT_DIR/pnpm.sh" exec node -e '
const [major, minor] = process.versions.node.split(".").map(Number)
if (major < 22 || major >= 25 || (major === 22 && minor < 12)) {
  console.error("Erwartet wird Node >=22.12 und <25.")
  process.exit(1)
}
console.log("Node-Version: kompatibel")
'

if [[ -x "$SCRIPT_DIR/../node_modules/.bin/vite" ]]; then
  echo "Abhängigkeiten: installiert"
else
  echo "Abhängigkeiten: fehlen – ./scripts/pnpm.sh install ausführen"
fi
