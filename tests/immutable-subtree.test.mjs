import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('immutable records remain protected inside a monorepo subtree', t => {
  const directory = mkdtempSync(join(tmpdir(), 'gls-immutable-subtree-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = join(directory, 'catalog');
  mkdirSync(join(root, 'registry/releases'), { recursive: true });
  const record = join(root, 'registry/releases/fixture.json');
  writeFileSync(record, '{"version":1}\n');
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  git('init', '-q');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('add', 'catalog');
  git('commit', '-qm', 'baseline');
  const script = resolve(import.meta.dirname, '../scripts/check-immutable-history.mjs');
  const check = () => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(check().status, 0);
  writeFileSync(record, '{"version":2}\n');
  const result = check();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /accepted record.*modified/);
});
