import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

test('clean CI bootstraps the exact private pin, reuses its receipt and fails closed', t => {
  const root = mkdtempSync(join(tmpdir(), 'gls-ci-pin-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const tools = join(root, 'tools');
  const temporary = join(root, 'temporary');
  mkdirSync(tools);
  mkdirSync(temporary);
  copyFileSync(resolve(import.meta.dirname, '../check.sh'), join(root, 'check.sh'));
  const pin = '10895acfbd79bfa21698c2ba4cd160e2410ac141';
  const tool = (name, content) => writeFileSync(join(tools, name), '#!/bin/sh\nset -eu\n' + content, { mode: 0o755 });
  tool('node', `case "$1" in -p) echo ${pin};; --input-type=module) test -f node_modules/siso-shell/package.json;; esac\n`);
  tool('gh', 'echo "$*" >> gh.calls\n[ "${FAIL_GH:-0}" = 0 ]\nprintf fixture-archive\n');
  tool('npm', 'echo "$*" >> npm.calls\nif [ "$1" = install ]; then mkdir -p node_modules/siso-shell; echo "{}" > node_modules/siso-shell/package.json; fi\n');
  const run = (extra = {}) => spawnSync('sh', ['check.sh'], {
    cwd: root,
    env: { ...process.env, PATH: tools + ':' + process.env.PATH, TMPDIR: temporary, ...extra },
    encoding: 'utf8',
  });
  assert.equal(run().status, 0);
  assert.equal(readFileSync(join(root, 'gh.calls'), 'utf8'), `api repos/sisodias/siso-shell/tarball/${pin}\n`);
  assert.match(readFileSync(join(root, 'npm.calls'), 'utf8'), /install --no-save --package-lock=false --ignore-scripts --omit=dev --no-audit --no-fund/);
  const receipt = join(root, 'node_modules/.siso-shell-source-revision');
  assert.equal(readFileSync(receipt, 'utf8').trim(), pin);
  assert.deepEqual(readdirSync(temporary), []);
  assert.equal(run().status, 0);
  assert.equal(readFileSync(join(root, 'gh.calls'), 'utf8').trim().split('\n').length, 1);
  writeFileSync(receipt, '0'.repeat(40));
  const before = readFileSync(join(root, 'npm.calls'), 'utf8');
  assert.notEqual(run({ FAIL_GH: '1' }).status, 0);
  assert.equal(readFileSync(join(root, 'npm.calls'), 'utf8'), before);
  assert.deepEqual(readdirSync(temporary), []);
});


test('monorepo CI installs the frozen workspace dependency before verification and fails closed', t => {
  const root = mkdtempSync(join(tmpdir(), 'gls-ci-workspace-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const library = join(root, 'library');
  const tools = join(root, 'tools');
  mkdirSync(library);
  mkdirSync(tools);
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: [library]\n');
  copyFileSync(resolve(import.meta.dirname, '../check.sh'), join(library, 'check.sh'));
  const tool = (name, body) => writeFileSync(join(tools, name), '#!/bin/sh\nset -eu\n' + body, { mode: 0o755 });
  tool('pnpm', 'echo "pnpm $*" >> calls\n[ "${FAIL_INSTALL:-0}" = 0 ]\n');
  tool('node', 'echo "node $*" >> calls\n');
  tool('npm', 'echo "npm $*" >> calls\n');
  tool('gh', 'exit 99\n');
  const run = (extra = {}) => spawnSync('sh', ['check.sh'], {
    cwd: library, encoding: 'utf8', env: { ...process.env, PATH: tools + ':' + process.env.PATH, ...extra },
  });
  assert.equal(run().status, 0);
  const calls = join(library, 'calls');
  const lines = readFileSync(calls, 'utf8').trim().split('\n');
  assert.equal(lines[0], 'pnpm --dir .. --filter great-library-of-siso... install --frozen-lockfile');
  assert.equal(lines.at(-1), 'npm run verify');
  writeFileSync(calls, '');
  assert.notEqual(run({ FAIL_INSTALL: '1' }).status, 0);
  assert.equal(readFileSync(calls, 'utf8').trim(), lines[0]);
});
