#!/bin/sh
set -eu
cd "$(dirname "$0")"
python3 verify_imports.py
node --test tests/toolchain.test.mjs
