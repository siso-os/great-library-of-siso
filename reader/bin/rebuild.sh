#!/bin/bash
# Hourly (launchd com.siso.library-reader): rebuild the laptop Library that Agent Base shows at /library-site/, then the
# cloud copy and the private Worker siso-library. Log: ~/.local/state/library/rebuild.log. --no-cloud skips the Worker.
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
log="$HOME/.local/state/library/rebuild.log"; mkdir -p "$(dirname "$log")"
echo "Library rebuild: $log"
say() { echo "$(date '+%F %T') $*" >> "$log"; }
say "start"
# its own deps: the live tree (decisions/0028) carries no node_modules, and from 10 Oct every build failed on a missing markdown-it
[ -d node_modules/markdown-it ] || npm ci --ignore-scripts --no-audit --no-fund >> "$log" 2>&1 || { say "npm ci FAILED"; exit 1; }
# This reader consumes this laptop's shelves and writes assets deployed below.
# Automatic cross-host routing separates those inputs from their dependencies/output.
heavy --on laptop -- node build.mjs >> "$log" 2>&1 || { say "local build FAILED"; exit 1; }
[ "${1:-}" = "--no-cloud" ] && exit 0
wrangler=../node_modules/.bin/wrangler
[ -x "$wrangler" ] || wrangler="$HOME/SISO_Workspace/Great_Library_of_SISO/node_modules/.bin/wrangler"
heavy --on laptop -- node build.mjs --cloud >> "$log" 2>&1 || { say "cloud build FAILED"; exit 1; }
"$wrangler" deploy -c deploy/wrangler.toml --assets "$HOME/SISO_Workspace/_data/great-library/reader-dist-cloud" >> "$log" 2>&1 || { say "deploy FAILED"; exit 1; }
say "done"
