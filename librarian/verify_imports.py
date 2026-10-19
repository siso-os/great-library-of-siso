#!/usr/bin/env python3
"""Offline allowlist, original Git blob and adapted target byte verification."""
import hashlib
import json
from pathlib import Path


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify(root):
    receipt = json.loads((root / 'IMPORT-RECEIPT.json').read_text())
    expected = {'IMPORT-RECEIPT.json'}
    total = 0
    for row in receipt['files']:
        path = row['target_path']
        expected.add(path)
        data = (root / path).read_bytes()
        assert digest(data) == row['target_sha256'], f'target digest mismatch: {root.name}/{path}'
        lines = data.decode('utf-8').splitlines(keepends=True)
        for hunk in reversed(row.get('adaptation_hunks', [])):
            start, end = hunk['target_start'], hunk['target_end']
            assert lines[start:end] == hunk['target_lines'], f'adaptation drift: {path}'
            lines[start:end] = hunk['source_lines']
        original = ''.join(lines).encode('utf-8')
        assert digest(original) == row['source_sha256'], f'source digest mismatch: {path}'
        blob = hashlib.sha1(b'blob ' + str(len(original)).encode() + b'\0' + original).hexdigest()
        assert blob == row['blob'], f'pinned source Git blob mismatch: {path}'
        total += len(data)
    for row in receipt['locally_authored']:
        path = row['path']; expected.add(path)
        data = (root / path).read_bytes(); total += len(data)
        assert digest(data) == row['sha256'], f'local artifact drift: {path}'
    actual = {str(path.relative_to(root)) for path in root.rglob('*') if path.is_file() and '__pycache__' not in path.parts}
    assert actual == expected, f'allowlist mismatch: {sorted(actual ^ expected)}'
    source_paths = [r['path'] for r in receipt['files'] + receipt['excluded']]
    assert len(source_paths) == len(set(source_paths)) == receipt['source_tree_files']
    assert len(expected) <= 300 and total <= 10_000_000
    print(f'{root.name}: {len(receipt["files"])} source blobs, {len(receipt["excluded"])} exclusions, {len(expected)} target files verified')
    return len(expected), total


if __name__ == '__main__':
    librarian = Path(__file__).resolve().parent
    counts = [verify(librarian), verify(librarian.parent / 'knowledge' / 'book-library')]
    assert sum(c[0] for c in counts) <= 300
    assert sum(c[1] for c in counts) <= 10_000_000
