import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('held collection source is separate; public output and explicit scans still fail closed', t => {
  const root = mkdtempSync(join(tmpdir(), 'library-publication-boundary-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'people-watch'));
  mkdirSync(join(root, 'site', 'people-watch'), { recursive: true });
  copyFileSync(new URL('../scripts/scan-publication.mjs', import.meta.url), join(root, 'scripts', 'scan-publication.mjs'));
  const marker = ['', 'Users', 'publication-fixture', 'held-source'].join('/');
  writeFileSync(join(root, 'people-watch', 'fixture.md'), marker);
  const scan = (...args) => spawnSync(process.execPath, ['scripts/scan-publication.mjs', ...args], { cwd: root, encoding: 'utf8' });
  assert.equal(scan().status, 0);
  assert.equal(scan('people-watch').status, 1, 'explicit source scan must remain available');
  writeFileSync(join(root, 'site', 'people-watch', 'fixture.html'), marker);
  const published = scan();
  assert.equal(published.status, 1, 'collection names inside public output cannot bypass scanning');
  assert.match(published.stderr, /site\/people-watch\/fixture\.html:1 \[machine-path\]/);
  assert.equal(scan('site').status, 1);
});
