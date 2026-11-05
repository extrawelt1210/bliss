#!/bin/zsh

set -euo pipefail

PNPM_BIN="$(command -v pnpm 2>/dev/null || true)"
NODE_BIN="$(command -v node 2>/dev/null || true)"

if [[ -z "$NODE_BIN" && -n "$PNPM_BIN" ]]; then
  PNPM_DIR="${PNPM_BIN:A:h}"
  CODEX_NODE="$PNPM_DIR/../../node/bin/node"
  if [[ -x "$CODEX_NODE" ]]; then
    NODE_BIN="${CODEX_NODE:A}"
  fi
fi

if [[ -z "$NODE_BIN" ]]; then
  CODEX_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
  if [[ -x "$CODEX_NODE" ]]; then
    NODE_BIN="$CODEX_NODE"
  fi
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Node.js wurde nicht gefunden. Installiere Node 22 oder öffne das Projekt in Codex." >&2
  exit 1
fi

if [[ -z "$PNPM_BIN" ]]; then
  echo "pnpm wurde nicht gefunden. Aktiviere es mit: corepack enable pnpm" >&2
  exit 1
fi

export PATH="${NODE_BIN:A:h}:$PATH"
exec "$PNPM_BIN" "$@"
