#!/usr/bin/env bash
# Builds a self-contained API release (dist/, prompts/, production
# node_modules pinned by the workspace lockfile) and archives it.
# Usage: scripts/package-api.sh [output-directory]
set -euo pipefail

out="${1:-release/api}"
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

rm -rf "$out" "$out.tgz"
mkdir -p "$(dirname "$out")"
pnpm --filter @renvodesk/api build
pnpm --filter @renvodesk/api deploy --prod "$out"
# The server needs only compiled code, prompts and runtime dependencies.
rm -f "$out/pnpm-lock.yaml"
node -e 'process.exit(require(process.argv[1]).dependencies.fastify ? 0 : 1)' "$root/$out/package.json"
test -f "$out/dist/server.js" && test -f "$out/prompts/site-note-instructions.md"
git rev-parse --short HEAD > "$out/REVISION"
tar -C "$out" -czf "$out.tgz" .
echo "API release: $out.tgz ($(du -h "$out.tgz" | cut -f1), revision $(cat "$out/REVISION"))"
