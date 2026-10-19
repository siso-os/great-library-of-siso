// One place that knows the shape of a claim packet.
//
// WHY THIS EXISTS. On 2026-08-04 I mis-keyed claim structure five times in one
// session — most often reading `g.id` when the field is `g.source.id`. Each cost
// a round trip, and one of them printed "0 metrics files cited by live claims"
// for a repo where the true answer is 14. A confident zero is worse than an
// error: it looks like a finding.
//
// The production scripts were never wrong. audit-asserted-numbers.mjs,
// verify-claim-packets.mjs and build-review-packet.mjs all read `source.id`
// correctly and agree with each other. The defect was that I kept writing
// throwaway readers instead of using them — so this exists to make the correct
// reader the easy one to reach for.
//
// Precedent: lib/snapshot-paths.mjs was written for exactly this reason after
// four snapshot mis-keys, and that class stopped recurring. Same mechanism.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';

// A grounding entry's source id. NOT g.id — that key does not exist.
export function groundingSourceId(g) {
  return String(g?.source?.id || '');
}

// Every live claim packet, parsed. Superseded claims (*.v2.claim.json exists)
// are still returned; callers decide, because "live" means different things to
// the review packet and to the audit.
export function readClaims(root = process.cwd()) {
  const dir = join(root, 'claims');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.claim.json')).sort()) {
    try {
      out.push({ file: `claims/${f}`, name: f.replace('.claim.json', ''), doc: JSON.parse(readFileSync(join(dir, f), 'utf8')) });
    } catch (err) {
      // Surface it rather than skipping. An unparseable claim that vanishes
      // from a count is how a repo reports health it does not have — the same
      // silent-skip defect the audit was fixed for on 2026-08-04.
      out.push({ file: `claims/${f}`, name: f.replace('.claim.json', ''), doc: null, error: String(err.message) });
    }
  }
  return out;
}

// Which metrics files do live claims actually ground in? This is the population
// the audit re-checks — NOT every file in metrics/. Measured 2026-08-04:
// 14 files are load-bearing out of 121 present. Reporting a statistic over all
// 121 would be a true count of the wrong population.
export function groundedMetrics(root = process.cwd()) {
  const map = new Map();
  for (const { file, doc } of readClaims(root)) {
    for (const g of doc?.grounding || []) {
      const id = groundingSourceId(g);
      if (!id.startsWith('metrics/')) continue;
      if (!map.has(id)) map.set(id, new Set());
      map.get(id).add(file);
    }
  }
  return map;
}

// A metrics file is checkable if something can re-verify its numbers: a
// derivations block (re-read a source) or a declared reproducer (re-run an
// experiment). Neither means nothing re-checks it.
export function checkability(metricsPath, root = process.cwd()) {
  const p = join(root, metricsPath);
  if (!existsSync(p)) return { exists: false };
  let doc;
  try { doc = JSON.parse(readFileSync(p, 'utf8')); } catch (err) { return { exists: true, parseError: String(err.message) }; }
  const derivations = Object.keys(doc.derivations || {}).length;
  const reproducer = doc.reproduced_by || null;
  return {
    exists: true,
    derivations,
    reproducer,
    reproducerOnDisk: reproducer ? existsSync(join(root, reproducer)) : null,
    checkable: derivations > 0 || Boolean(reproducer),
  };
}

// Convenience for the question I kept asking by hand: which load-bearing
// evidence has nothing re-checking it?
export function unverifiableEvidence(root = process.cwd()) {
  const out = [];
  for (const [id, claims] of groundedMetrics(root)) {
    const c = checkability(id, root);
    if (c.exists && c.checkable) continue;
    // Distinguish an OVERSIGHT from a DISCLOSED limit. metrics whose source
    // field records a dispute are not unfinished work — GQ-005 carries the
    // portfolio's lowest confidence (0.15) and an explicit "not a basis for
    // investment" action precisely BECAUSE its evidence could not be sourced.
    // Lumping that with a file someone forgot to declare would make the honest
    // case look like the negligent one.
    let disclosed = false;
    try {
      const doc = JSON.parse(readFileSync(join(root, id), 'utf8'));
      disclosed = /UNKNOWN|dispute/i.test(String(doc.source || ''));
    } catch { /* parse failure is reported by checkability */ }
    out.push({ metrics: id, claims: [...claims].map((c) => basename(c)), disclosed, ...c });
  }
  return out;
}
