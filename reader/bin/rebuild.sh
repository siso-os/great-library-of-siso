#!/bin/bash
# Hourly (launchd com.siso.library-reader): rebuild the laptop Library that Agent Base shows at /library-site/, then the
# cloud copy and the private Worker siso-library. Log: ~/.local/state/library/rebuild.log. --no-cloud skips the Worker.
set -u
cd "$(dirname "$0")/.." || exit 1
log="$HOME/.local/state/library/rebuild.log"; mkdir -p "$(dirname "$log")"
say() { echo "$(date '+%F %T') $*" >> "$log"; }
heavy -- node build.mjs >> "$log" 2>&1 || { say "local build FAILED"; exit 1; }
[ "${1:-}" = "--no-cloud" ] && exit 0
wrangler=../node_modules/.bin/wrangler
[ -x "$wrangler" ] || wrangler="$HOME/SISO_Workspace/Great_Library_of_SISO/node_modules/.bin/wrangler"
heavy -- node build.mjs --cloud >> "$log" 2>&1 || { say "cloud build FAILED"; exit 1; }
"$wrangler" deploy -c deploy/wrangler.toml --assets "$HOME/SISO_Workspace/_data/great-library/reader-dist-cloud" 2>&1 | grep -E 'Uploaded [0-9]+ files|Current Version|ERROR' >> "$log" || say "deploy FAILED"
say "done"
