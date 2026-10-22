import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { rail, head as shellHead } from 'siso-shell';
import { buildIndustries } from './build-industries.mjs';
import { readTasks } from './read-library.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'site');
const ASSETS = join(ROOT, 'src/site/assets');
const BASE = normalizeBase(process.env.SITE_BASE_PATH || '/');
const DIST_KEYS = [
  ['archive_downloadable', 'Downloadable'],
  ['manifest_resolvable', 'Resolvable'],
  ['installable', 'Installable'],
  ['forkable', 'Forkable'],
  ['portable', 'Portable'],
];
function normalizeBase(value) {
  const clean = `/${String(value).replace(/^\/+|\/+$/g, '')}/`;
  return clean === '//' ? '/' : clean;
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function text(value, fallback = 'Not yet recorded') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function slugify(value) {
  return String(value || 'work')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'work';
}

function href(path = '') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE}${String(path).replace(/^\/+/, '')}`;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function jsonFiles(dir) {
  const found = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      if (entry.isFile() && entry.name.endsWith('.json')) found.push(full);
    }
  }
  await walk(dir);
  return found.sort();
}

async function loadRecords(kind) {
  const dir = join(ROOT, 'registry', kind);
  const records = [];
  for (const file of await jsonFiles(dir)) {
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    const values = Array.isArray(parsed) ? parsed : [parsed];
    for (const value of values) records.push({ ...value, __file: relative(ROOT, file) });
  }
  return records;
}

function linkEntries(raw) {
  const links = [];
  const add = (kind, label, value) => {
    const url = safeExternalUrl(typeof value === 'object' ? value?.url || value?.href : value);
    const visibility = typeof value === 'object' ? text(value?.visibility, 'public') : 'public';
    if (url && !links.some((link) => link.url === url)) links.push({ kind, label, url, visibility });
  };
  const source = raw.links || raw.urls || raw.locators || {};
  if (Array.isArray(source)) {
    for (const item of source) {
      const kind = text(item.rel || item.kind || item.type, 'reference').toLowerCase();
      add(kind, text(item.label, kind === 'docs' ? 'Documentation' : kind), item);
    }
  } else {
    for (const [kind, value] of Object.entries(source)) {
      add(kind.toLowerCase(), kind.replaceAll('_', ' '), value);
    }
  }
  add('source', 'Source repository', raw.source_url || raw.repository_url || raw.repository);
  add('docs', 'Upstream documentation', raw.docs_url || raw.documentation_url);
  add('demo', 'Upstream demo', raw.demo_url || raw.website_url || raw.homepage);
  const provenance = raw.provenance || {};
  add('source', 'Source repository', provenance.source_url || provenance.repository_url || provenance.repository);
  for (const locator of provenance.locators || []) {
    const label = locator.type === 'source_repository' ? 'Source repository'
      : locator.type === 'homepage' ? 'Homepage'
      : locator.type === 'documentation' ? 'Documentation'
      : locator.type.replaceAll('_', ' ');
    add(locator.type, label, locator);
  }
  for (const link of [...links]) {
    if (link.kind !== 'source_repository') continue;
    const repository = githubRepository({ url: link.url });
    if (repository) add('readme', 'Read README', { url: `${repository.url}#readme`, visibility: link.visibility });
  }
  return links;
}

function normalizeWork(raw) {
  const id = text(raw.work_id || raw.id || raw.stable_id, 'unassigned');
  const name = text(raw.name || raw.title || raw.display_name, id);
  const explicitSlug = raw.slug || raw.library_slug || raw.library_path;
  const slug = slugify(explicitSlug || (id !== 'unassigned' ? id : name));
  const relationships = (raw.relationships || raw.relations || []).map((item) => ({
    type: text(item.type || item.relation || item.predicate || item.kind, 'related to'),
    target: text(item.target_work_id || item.target_id || item.target?.work_id || item.target?.id || item.target, 'Unresolved target'),
    label: text(item.target_name || item.target?.name || item.label, ''),
    context: text(item.context || item.summary || item.reason, ''),
    evidence: Array.isArray(item.evidence) ? item.evidence : [],
  }));
  const license = raw.provenance?.license || raw.license || raw.redistribution?.license;
  return {
    raw,
    id,
    slug,
    name,
    summary: text(raw.summary || raw.description || raw.abstract),
    type: text(raw.work_type || raw.type || raw.kind, 'Unclassified'),
    maturity: text(raw.maturity || raw.status || raw.lifecycle_status || raw.lifecycle_state, 'Unknown'),
    section: text(raw.section || raw.category || raw.domain, 'Unassigned'),
    relationships,
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    researchContract: raw.research_contract || null,
    links: linkEntries(raw),
    provenance: raw.provenance || {},
    license: license && typeof license === 'object' ? `${text(license.spdx, 'NOASSERTION')} (${text(license.status || license.state, 'pending')})` : text(license, 'Pending'),
    sourceFile: raw.__file,
  };
}

function normalizeRelease(raw) {
  return {
    raw,
    id: text(raw.release_id || raw.id, 'unassigned-release'),
    workId: text(raw.work_id || raw.work?.id || raw.for_work, ''),
    releaseKind: raw.release_kind || null,
    version: text(raw.version || raw.tag || raw.name, 'Unversioned'),
    date: text(raw.released_at || raw.published_at || raw.date, 'Date pending'),
    artifactCount: (raw.artifacts || []).length,
    distribution: raw.distribution || raw.distribution_states || raw.states || {},
  };
}

function publicAnswerState(release) {
  if (release?.releaseKind === 'answer_release' && release.artifactCount > 0) return {
    code: 'released',
    label: 'Released — the selected Release explicitly declares an artifact-bearing Answer Release.',
  };
  if (!release || release.artifactCount === 0 || release.releaseKind === 'question_program_metadata') return {
    code: 'not_released',
    label: release?.releaseKind === 'question_program_metadata'
      ? 'Not released — the selected Release contains question-program metadata, not an answer artifact.'
      : 'Not released — the selected Release has no public answer artifact.',
  };
  return {
    code: 'artifact_present_unclassified',
    label: 'Artifact present — answer acceptance still requires explicit Release evidence.',
  };
}

function stewardName(work) {
  const owners = work.provenance?.owners || [];
  return text(owners.find((owner) => owner.role === 'steward')?.name || owners[0]?.name, 'Unassigned');
}

function questionOperationalState(work, asOfDate) {
  const program = work.researchContract?.program;
  if (!program) return {
    steward: stewardName(work),
    nextUsefulWork: 'Define the minimum public-safe question program before scheduling research.',
    freshness: { state: 'not_declared', assessed_at: null, review_due_at: null, as_of: asOfDate },
  };
  const { assessed_at: assessedAt, review_due_at: reviewDueAt } = program.freshness;
  const state = assessedAt > asOfDate ? 'not_yet_assessed' : reviewDueAt < asOfDate ? 'review_due' : 'current';
  return {
    steward: stewardName(work),
    nextUsefulWork: program.next_useful_work,
    freshness: { state, assessed_at: assessedAt, review_due_at: reviewDueAt, as_of: asOfDate },
  };
}

function freshnessLabel(freshness) {
  if (freshness.state === 'current') return `Current · assessed ${freshness.assessed_at} · review by ${freshness.review_due_at}`;
  if (freshness.state === 'review_due') return `Review due · assessed ${freshness.assessed_at} · due ${freshness.review_due_at}`;
  if (freshness.state === 'not_yet_assessed') return `Assessment dated after ${freshness.as_of}`;
  return 'Not declared';
}

function stateFor(release, key) {
  if (!release) return { label: 'No release', tone: 'unknown', note: 'No accepted Release Manifest is connected.' };
  const value = release.distribution?.[key];
  if (value == null) return { label: 'Unknown', tone: 'unknown', note: 'This state is not declared by the release.' };
  const state = typeof value === 'object' ? value.state || value.status : value;
  const evidence = typeof value === 'object' ? value.evidence || value.receipt || value.url : null;
  const normalized = String(state).toLowerCase();
  if (['false', 'no', 'unavailable', 'blocked', 'not_available'].includes(normalized)) {
    return { label: 'Unavailable', tone: 'negative', note: 'Explicitly unavailable in this release.' };
  }
  if (['pending', 'review', 'unknown', 'undetermined'].includes(normalized)) {
    return { label: 'Pending', tone: 'pending', note: 'Awaiting evidence or review.' };
  }
  if (['true', 'yes', 'available', 'verified', 'confirmed'].includes(normalized)) {
    return evidence
      ? { label: 'Confirmed', tone: 'positive', note: 'Declared with release evidence.' }
      : { label: 'Unverified', tone: 'pending', note: 'Declared, but no evidence is attached.' };
  }
  return { label: text(state, 'Unknown'), tone: evidence ? 'positive' : 'pending', note: evidence ? 'Evidence attached.' : 'No evidence attached.' };
}

function frameHead() {
  return `${shellHead(href('assets/siso-shell'))}<link rel="stylesheet" href="${href('assets/library-shell.css')}"><script defer src="${href('assets/library-shell.js')}"></script>`;
}

function page({ title, description, body, rootClass = '' }) {
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(description)}">
  <meta name="color-scheme" content="dark">
  <title>${esc(title)} · The Great Library of SISO</title>
  <link rel="stylesheet" href="${href('assets/styles.css')}"><link rel="stylesheet" href="${href('assets/industries.css')}"><link rel="stylesheet" href="${href('assets/reading.css')}">
  ${frameHead()}
  <script defer src="${href('assets/app.js')}"></script>
</head>
<body class="library-shell ${esc(rootClass)}">
  <!--library-navigation-->
  <div class="siso-shell-page" id="library-content" tabindex="-1">
  <main id="content">${body}</main>
  <footer>The Great Library of SISO — Built by the SISO Open Source Foundation · Funded by SISO Agency.</footer>
  </div>
</body>
</html>`;
}

function eyebrow(textValue) {
  return `<p class="eyebrow"><span aria-hidden="true"></span>${esc(textValue)}</p>`;
}

function workCard(work) {
  const selected = activeReleasesByWork.has(work.id);
  return `<article class="work-card" data-search="${esc(`${work.name} ${work.summary} ${work.type} ${work.maturity}`.toLowerCase())}" data-type="${esc(slugify(work.type))}" data-maturity="${esc(slugify(work.maturity))}" data-selection="${selected ? 'selected' : 'registered'}">
    <div class="card-topline"><span>${esc(work.type)}</span><span class="maturity">${esc(work.maturity)}</span></div>
    <h3><a href="${href(`works/${work.slug}/`)}">${esc(work.name)}</a></h3>
    <p>${esc(work.summary)}</p>
    <p class="selection-note">${selected ? 'Selected release' : 'Registered · not selected'}${work.links.some(link => link.visibility === 'private') ? ' · includes private source' : ''}</p>
    <div class="card-foot"><code>${esc(work.id)}</code><span aria-hidden="true">↗</span></div>
  </article>`;
}

function questionCard(work, activeRelease, asOfDate) {
  const contract = work.researchContract;
  const answerState = publicAnswerState(activeRelease);
  const operations = questionOperationalState(work, asOfDate);
  const searchable = [work.name, work.summary, contract?.question, contract?.state, contract?.decision_to_change, answerState.code, ...(contract?.source_scopes || [])].filter(Boolean).join(' ').toLowerCase();
  return `<article class="work-card question-card" data-search="${esc(searchable)}" data-type="${esc(slugify(work.type))}" data-maturity="${esc(slugify(work.maturity))}" data-selection="${activeRelease ? 'selected' : 'registered'}">
    <div class="card-topline"><span>${esc(contract?.question_id || work.type)}</span><span class="maturity">${esc(contract?.state || work.maturity)}</span></div>
    <h3><a href="${href(`works/${work.slug}/`)}">${esc(contract?.question || work.name)}</a></h3>
    <p>${esc(contract?.decision_to_change || work.summary)}</p>
    <p class="quiet"><b>Steward:</b> ${esc(operations.steward)} · <b>Lifecycle:</b> ${esc(work.maturity)} · <b>Freshness:</b> ${esc(operations.freshness.state.replaceAll('_', ' '))}</p>
    <p class="quiet"><b>Next useful work:</b> ${esc(operations.nextUsefulWork)}</p>
    <p class="quiet"><b>Public answer:</b> ${esc(answerState.code.replaceAll('_', ' '))}</p>
    <div class="card-foot"><code>${esc(contract?.evidence_mode?.replaceAll('_', ' ') || work.id)}</code><span aria-hidden="true">↗</span></div>
  </article>`;
}

function emptyCatalog(message) {
  return `<div class="empty-state"><span class="index-number">00</span><div><h3>Records in transit</h3><p>${esc(message)}</p></div></div>`;
}

function catalogControls(works) {
  const options = (values) => [...new Set(values)].sort().map((value) => `<option value="${esc(slugify(value))}">${esc(value)}</option>`).join('');
  return `<div class="catalog-controls" data-catalog-controls>
    <label class="search-field"><span>Search the catalog</span><input type="search" placeholder="Name, purpose, type…" autocomplete="off" data-catalog-search></label>
    <label><span>Type</span><select data-catalog-type><option value="">All types</option>${options(works.map((work) => work.type))}</select></label>
    <label><span>Maturity</span><select data-catalog-maturity><option value="">All states</option>${options(works.map((work) => work.maturity))}</select></label>
    <label><span>Snapshot selection</span><select data-catalog-selection><option value="">All Works</option><option value="selected">Selected release</option><option value="registered">Registered only</option></select></label>
  </div>`;
}

function assemblyMembers(assembly, works) {
  const byId = new Map(works.map((work) => [work.id, work]));
  return (assembly?.components || []).map((component) => ({ component, work: byId.get(component.work_id) }));
}

function projectionMembers(sectionId, snapshot, works) {
  const byId = new Map(works.map((work) => [work.id, work]));
  return (snapshot?.projection?.edges || [])
    .filter((edge) => edge.from_work_id === sectionId)
    .map((edge) => ({ edge, work: byId.get(edge.to_work_id) }))
    .filter(({ work }) => work);
}

function promotionCounts(units, field) {
  const counts = new Map();
  for (const unit of units) {
    const value = text(unit[field], 'Not recorded');
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
}

function buildPromotionProjection(sourceInventories, works) {
  const worksById = new Map(works.map((work) => [work.id, work]));
  const candidates = sourceInventories.filter((inventory) => inventory.inventory_kind === 'agent_capabilities');
  const supersededInventoryIds = new Set(candidates.map((inventory) => inventory.supersedes_inventory_id).filter(Boolean));
  const campaigns = candidates
    .filter((inventory) => !supersededInventoryIds.has(inventory.id))
    .map((inventory) => {
      const campaign = inventory.campaign || {};
      const units = (inventory.units || []).map((unit) => {
        const promotion = unit.promotion || {};
        const evidence = (Array.isArray(unit.evidence) ? unit.evidence : []).map((entry) => ({
          kind: text(entry.kind),
          reference: text(entry.reference),
          observed_at: text(entry.observed_at),
          summary: text(entry.summary),
        }));
        const targetWorkIds = Array.isArray(promotion.target_work_ids) ? promotion.target_work_ids : [];
        const evidenceOwnerWorkIds = Array.isArray(promotion.evidence_owner_work_ids) ? promotion.evidence_owner_work_ids : [];
        const projectWorks = (ids) => ids.map((id) => {
          const work = worksById.get(id);
          return {
            id,
            name: work?.name || null,
            library_url: work ? href(`works/${work.slug}/`) : null,
            resolved: Boolean(work),
          };
        });
        return {
          id: text(unit.unit_id || unit.id, 'unassigned-unit'),
          name: text(unit.name, unit.unit_id || 'Unnamed candidate'),
          source_scope_id: text(unit.source_scope_id),
          classification: text(unit.classification),
          disposition: text(unit.disposition),
          stage: text(promotion.stage),
          priority: text(promotion.priority),
          confidence: text(promotion.confidence),
          portability: text(promotion.portability),
          target: text(unit.target),
          next_gate: text(promotion.next_gate),
          blockers: Array.isArray(promotion.blockers) ? promotion.blockers.map((blocker) => text(blocker)).filter(Boolean) : [],
          rationale: text(unit.rationale),
          evidence_count: evidence.length,
          evidence,
          target_owner_state: text(promotion.target_owner_state, targetWorkIds.length ? 'assigned' : 'unassigned'),
          target_works: projectWorks(targetWorkIds),
          evidence_owner_works: projectWorks(evidenceOwnerWorkIds),
        };
      });
      return {
        inventory_id: text(inventory.id, 'unassigned-inventory'),
        inventory_name: text(inventory.name, 'Agent capability promotion campaign'),
        inventory_state: text(inventory.inventory_state),
        observed_at: text(inventory.observed_at),
        campaign_id: text(campaign.campaign_id, inventory.id),
        objective: text(campaign.objective),
        lifecycle: Array.isArray(campaign.lifecycle) ? campaign.lifecycle.map((stage) => text(stage)).filter(Boolean) : [],
        units,
      };
    });
  const units = campaigns.flatMap((campaign) => campaign.units);
  return {
    inventory_count: campaigns.length,
    unit_count: units.length,
    counts: {
      stage: promotionCounts(units, 'stage'),
      priority: promotionCounts(units, 'priority'),
      target: promotionCounts(units, 'target'),
    },
    campaigns,
  };
}

function promotionCountGroup(title, rows) {
  return `<section><h3>${esc(title)}</h3><div>${rows.map((row) => `<p><span>${esc(row.value.replaceAll('_', ' '))}</span><strong>${esc(row.count)}</strong></p>`).join('') || '<p><span>None recorded</span><strong>0</strong></p>'}</div></section>`;
}

function promotionPage(projection) {
  const campaignSections = projection.campaigns.map((campaign) => `<article class="promotion-campaign">
    <div>${eyebrow(`Campaign / ${campaign.campaign_id}`)}<h2>${esc(campaign.inventory_name)}</h2><p>${esc(campaign.objective)}</p><small>${esc(campaign.inventory_state)} · observed ${esc(campaign.observed_at)}</small></div>
    <ol aria-label="Promotion lifecycle">${campaign.lifecycle.map((stage, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${esc(stage.replaceAll('_', ' '))}</li>`).join('')}</ol>
  </article>`).join('');
  const unitCards = projection.campaigns.flatMap((campaign) => campaign.units).map((unit) => {
    const blockers = unit.blockers.length ? `<ul>${unit.blockers.map((blocker) => `<li>${esc(blocker)}</li>`).join('')}</ul>` : '<p>None recorded.</p>';
    const evidence = unit.evidence.length ? `<ul>${unit.evidence.map((entry) => `<li><code>${esc(entry.reference)}</code><br><small>${esc(entry.kind)} · ${esc(entry.observed_at)}</small></li>`).join('')}</ul>` : '<p>None recorded.</p>';
    const targetWorks = unit.target_works.length ? unit.target_works.map((target) => target.resolved
      ? `<a href="${esc(target.library_url)}"><span>${esc(target.name)}</span><code>${esc(target.id)}</code></a>`
      : `<span><span>${esc(target.id)}</span><small>Unresolved in this build</small></span>`).join('') : '<span><span>No product owner assigned</span><small>Owner registration is the next gate.</small></span>';
    const evidenceOwners = unit.evidence_owner_works.length ? unit.evidence_owner_works.map((owner) => owner.resolved
      ? `<a href="${esc(owner.library_url)}"><span>${esc(owner.name)}</span><code>${esc(owner.id)}</code></a>`
      : `<span><span>${esc(owner.id)}</span><small>Unresolved in this build</small></span>`).join('') : '<span><span>Same as product owner</span></span>';
    return `<article class="promotion-unit">
      <header><div><span>${esc(unit.stage.replaceAll('_', ' '))}</span><span>${esc(unit.priority)} priority</span><span>${esc(unit.confidence)} confidence</span><span>${esc(unit.portability.replaceAll('_', ' '))}</span></div><h3>${esc(unit.name)}</h3></header>
      <dl><div><dt>Classification</dt><dd>${esc(unit.classification.replaceAll('_', ' '))}</dd></div><div><dt>Disposition</dt><dd>${esc(unit.disposition.replaceAll('_', ' '))}</dd></div><div><dt>Source scope</dt><dd>${esc(unit.source_scope_id)}</dd></div><div><dt>Target</dt><dd>${esc(unit.target)}</dd></div><div><dt>Product owner Works</dt><dd class="promotion-targets">${targetWorks}</dd></div><div><dt>Evidence owner Works</dt><dd class="promotion-targets">${evidenceOwners}</dd></div><div><dt>Next gate</dt><dd>${esc(unit.next_gate)}</dd></div><div><dt>Blockers</dt><dd>${blockers}</dd></div><div><dt>Rationale</dt><dd>${esc(unit.rationale)}</dd></div><div><dt>Evidence · ${esc(unit.evidence_count)} ${unit.evidence_count === 1 ? 'record' : 'records'}</dt><dd>${evidence}</dd></div></dl>
    </article>`;
  }).join('');
  return page({
    title: 'Promotion', active: 'promotion', rootClass: 'promotion-page',
    description: 'Public campaign view of evidenced agent capability candidates and their next promotion gates.',
    body: `<section class="subhero shell">${eyebrow('Library / Agents / Promotion')}<div><h1>Promotion</h1><p>Evidenced agent mechanisms moving through explicit ownership, portability, verification, release, and Library gates.</p></div><span class="folio">P—01</span></section>
    <aside class="promotion-boundary shell"><b>Candidates are not catalog claims.</b><p>These units are source-inventory candidates. They are not accepted Works, Releases, downloadable artifacts, portability claims, or distribution promises. Those states require their own accepted registry records and evidence.</p><a href="${esc(href('docs/agent-capability-promotion.html'))}">Read the source-backed promotion brief →</a></aside>
    <section class="section shell promotion-campaigns">${campaignSections || emptyCatalog('No accepted agent capability promotion inventories are present in this build.')}</section>
    <section class="section shell"><div class="section-heading compact">${eyebrow('Campaign totals')}<h2>${esc(projection.unit_count)} candidates</h2><p>Across ${esc(projection.inventory_count)} accepted ${projection.inventory_count === 1 ? 'inventory' : 'inventories'}.</p></div><div class="promotion-counts">${promotionCountGroup('Stage', projection.counts.stage)}${promotionCountGroup('Priority', projection.counts.priority)}${promotionCountGroup('Target', projection.counts.target)}</div></section>
    <section class="section shell catalog-section"><div class="section-heading compact">${eyebrow('Promotion units')}<h2>Candidate gates</h2><p>Evidence-led status, not release status.</p></div><div class="promotion-units">${unitCards || emptyCatalog('Promotion candidates will appear only from accepted agent capability source inventories.')}</div></section>`,
  });
}

function buildIntelligenceProjection(rawEvents, rawDecisions, releases, snapshots, worksById) {
  const predecessorIds = new Set(rawEvents.map((event) => event.predecessor_event_id).filter(Boolean));
  const supersededDecisionIds = new Set(rawDecisions.map((decision) => decision.supersedes_decision_id).filter(Boolean));
  const eventHeads = rawEvents.filter((event) => !predecessorIds.has(event.id));
  const liveStatuses = new Set(['planned', 'active', 'blocked']);
  const resolveScope = (scope = {}) => ({
    ...scope,
    works: (scope.work_ids || []).map((id) => {
      const work = worksById.get(id);
      return { id, name: work?.name || id, library_url: work ? href(`works/${work.slug}/`) : null };
    }),
  });
  const events = [...rawEvents].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).map(({ __file, ...event }) => ({ ...event, resolved_scope: resolveScope(event.scope) }));
  const decisions = [...rawDecisions].sort((a, b) => b.decided_at.localeCompare(a.decided_at)).map(({ __file, ...decision }) => ({ ...decision, active: decision.status === 'accepted' && !supersededDecisionIds.has(decision.id), resolved_scope: resolveScope(decision.scope) }));
  const activeInitiatives = eventHeads.filter((event) => liveStatuses.has(event.status)).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).map((event) => ({
    event_id: event.id,
    thread_id: event.thread.id,
    name: event.thread.name,
    status: event.status,
    title: event.title,
    intent: event.intent,
    occurred_at: event.occurred_at,
    owner: event.coordination.owner,
    branch: event.coordination.branch,
    reserved_paths: event.coordination.reserved_paths,
    next_actions: event.next_actions,
  }));
  const registryChanges = [
    ...releases.map((release) => ({
      kind: 'release', occurred_at: release.date, id: release.id, version: release.version,
      title: release.raw.title || `${worksById.get(release.workId)?.name || release.workId} ${release.version}`,
      work_id: release.workId, work_name: worksById.get(release.workId)?.name || release.workId,
    })),
    ...snapshots.map((snapshot) => ({
      kind: 'snapshot', occurred_at: snapshot.created_at, id: snapshot.id, version: snapshot.version,
      title: snapshot.name, work_count: snapshot.metadata_completeness?.work_count,
      release_count: snapshot.metadata_completeness?.release_count,
    })),
  ].sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));
  return {
    counts: {
      events: events.length,
      decisions: decisions.length,
      active_initiatives: activeInitiatives.length,
      registry_changes: registryChanges.length,
    },
    active_initiatives: activeInitiatives,
    decisions,
    events,
    registry_changes: registryChanges,
  };
}

function intelligencePage(projection) {
  const active = projection.active_initiatives.map((initiative) => `<article>
    <span>${esc(initiative.status)}</span><div><h2>${esc(initiative.name)}</h2><p>${esc(initiative.intent)}</p><p><code>${esc(initiative.branch)}</code> · ${esc(initiative.owner)}</p><p><b>Reserved:</b> ${initiative.reserved_paths.map((value) => `<code>${esc(value)}</code>`).join(' · ')}</p>${initiative.next_actions.length ? `<ul>${initiative.next_actions.map((action) => `<li>${esc(action)}</li>`).join('')}</ul>` : ''}</div>
  </article>`).join('');
  const decisions = projection.decisions.map((decision) => `<article id="${esc(decision.decision_key)}">
    <span>${esc(decision.decision_key)} · ${decision.active ? 'active' : esc(decision.status)}</span><div><h2>${esc(decision.title)}</h2><p>${esc(decision.decision)}</p><details><summary>Context, reasoning, and consequences</summary><p><b>Context:</b> ${esc(decision.context)}</p><h3>Rationale</h3><ul>${decision.rationale.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><h3>Alternatives</h3><ul>${decision.alternatives.map((item) => `<li><b>${esc(item.option)}</b> · ${esc(item.disposition)} — ${esc(item.reason)}</li>`).join('')}</ul><h3>Consequences</h3><ul>${[...decision.consequences.positive, ...decision.consequences.negative, ...decision.consequences.follow_ups].map((item) => `<li>${esc(item)}</li>`).join('')}</ul></details></div>
  </article>`).join('');
  const authoredEvents = projection.events.map((event) => {
    const workLinks = event.resolved_scope.works.map((work) => work.library_url ? `<a href="${esc(work.library_url)}">${esc(work.name)}</a>` : `<code>${esc(work.id)}</code>`).join(' · ');
    return `<article id="${esc(event.id)}"><span>${esc(event.occurred_at)} · ${esc(event.entry_type.replaceAll('_', ' '))} · ${esc(event.status)}</span><div><h2>${esc(event.title)}</h2><p>${esc(event.summary)}</p><p><b>Intent:</b> ${esc(event.intent)}</p><details><summary>Reasoning, changes, evidence, and handoff</summary><h3>Reasoning</h3><ul>${event.reasoning.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><h3>Changes</h3><ul>${event.changes.map((item) => `<li><code>${esc(item.kind)}</code> · ${esc(item.reference)} — ${esc(item.summary)}</li>`).join('')}</ul>${workLinks ? `<p><b>Works:</b> ${workLinks}</p>` : ''}<p><b>Coordination:</b> ${esc(event.coordination.owner)} · <code>${esc(event.coordination.branch)}</code></p><h3>Evidence</h3><ul>${event.evidence.map((item) => `<li><code>${esc(item.reference)}</code> — ${esc(item.summary)}</li>`).join('')}</ul>${event.next_actions.length ? `<h3>Next actions</h3><ul>${event.next_actions.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}</details></div></article>`;
  }).join('');
  const registryChanges = projection.registry_changes.map((change) => `<article><span>${esc(change.occurred_at)} · ${esc(change.kind)}</span><div><h2>${esc(change.title)}</h2><p><code>${esc(change.id)}</code> · version ${esc(change.version)}</p>${change.kind === 'snapshot' ? `<p>${esc(change.work_count)} Works · ${esc(change.release_count)} Releases selected</p>` : `<p>${esc(change.work_name)}</p>`}</div></article>`).join('');
  return page({
    title: 'Ecosystem Intelligence', active: 'intelligence', rootClass: 'intelligence-page',
    description: 'Append-only events, active initiatives, architectural decisions, releases, and snapshots across The Great Library of SISO.',
    body: `<section class="subhero shell">${eyebrow('Library / Ecosystem Intelligence')}<div><h1>Ecosystem Intelligence</h1><p>What is moving, what changed, why it changed, who owns the lane, and where the authoritative evidence lives.</p></div><span class="folio">I—01</span></section>
    <aside class="promotion-boundary shell"><b>Data first.</b><p><a href="${href('intelligence.json')}">intelligence.json</a> is the agent interface. This HTML is one generated chronological reading surface. Git remains the audit trail; registry records remain public truth.</p></aside>
    <section class="section shell release-index"><div class="section-heading compact">${eyebrow('Recorded initiatives')}<h2>${esc(projection.counts.active_initiatives)} active initiatives</h2><p>Recorded thread-head state and path reservations; this is not a live runtime or agent-presence feed.</p></div>${active || emptyCatalog('No active initiative is currently reserved.')}</section>
    <section class="section shell release-index"><div class="section-heading compact">${eyebrow('Architecture decisions')}<h2>${esc(projection.counts.decisions)} ADRs</h2><p>Immutable decisions with context, alternatives, consequences, and evidence.</p></div>${decisions}</section>
    <section class="section shell release-index"><div class="section-heading compact">${eyebrow('Authored event ledger')}<h2>${esc(projection.counts.events)} reasoned events</h2><p>Close-of-block intelligence, not transcript dumps.</p></div>${authoredEvents}</section>
    <section class="section shell release-index"><div class="section-heading compact">${eyebrow('Automatic registry changelog')}<h2>${esc(projection.counts.registry_changes)} immutable changes</h2><p>Every accepted Release and Snapshot, derived directly from registry records.</p></div>${registryChanges}</section>`,
  });
}

function frontDoor(works, sections) {
  const loop = [
    ['Client outcomes', 'Fund useful compute', 'docs/siso-mission.html', 60, 40],
    ['Owners + compute', 'Build industry systems', 'agents/', 380, 40],
    ['Packs + code', 'Publish reusable work', 'promotion/', 700, 40],
    ['The Library', 'Make the work discoverable', '#catalog', 1020, 40],
    ['People + repositories', 'Feed new ideas into Foundry', 'works/siso-people-graph/', 1020, 220],
    ['Foundry', 'Evaluate what is worth using', 'works/siso-foundry/', 700, 220],
    ['God Questions', 'Turn evidence into breakthroughs', 'research/', 380, 220],
    ['Better systems', 'Improve packs and the agent stack', 'agents/', 60, 220],
  ];
  const nodes = loop.map(([title, sub, path, x, y], i) => `<a href="${href(path)}" aria-label="${esc(title)}"><rect class="${i === 3 ? 'root' : 'box'}" x="${x}" y="${y}" width="250" height="100" rx="8"/><text x="${x + 18}" y="${y + 27}" class="lbl">0${i + 1}</text><text x="${x + 18}" y="${y + 54}">${esc(title)}</text><text x="${x + 18}" y="${y + 78}" class="lbl">${esc(sub)}</text></a>`).join('');
  return `<header class="front-header shell"><span>The Great Library of SISO</span><a href="${href('docs/onboarding.html')}">Start with the map ↗</a></header>
  <section class="front-intro shell">${eyebrow('Research → reusable capability → real outcomes')}
    <h1>All the knowledge.<br><em>One connected ecosystem.</em></h1>
    <p>SISO uses artificial intelligence and the world’s accumulated knowledge to create measurable value for businesses and society. This Library is its public front door: discover the research, code and agent systems, see how they connect, and follow the evidence back to independently owned sources.</p>
    <div class="front-actions"><a class="button" href="#catalog">Explore ${works.length} Works <span>↓</span></a><a href="${href('works/siso-foundry/')}">Inside SISO Foundry ↗</a><a href="${href('docs/siso-mission.html')}">The mission ↗</a></div>
  </section>
  <section class="front-sections shell" id="sections" aria-label="Library sections">
    ${sections.map(section => `<a href="${href(`${section.slug}/`)}"><span>${esc(section.name)}</span><b>${works.filter(work => work.section === section.name && work.id !== section.id).length}</b><small>selected Works →</small></a>`).join('')}
    <a href="${href('research/')}"><span>God Questions</span><b>${works.filter(work => work.researchContract).length}</b><small>registered questions →</small></a>
    <a href="${href('intelligence/')}"><span>Now</span><b>↗</b><small>Events, decisions & ownership</small></a>
  </section>
  <section class="loop-section shell" aria-labelledby="loop-title"><div class="loop-heading"><div>${eyebrow('The compounding loop')}<h2 id="loop-title">Every part feeds the next.</h2></div><p>Intelligence · open-source code · GitHub storage · Cloudflare · people.<br>The operating thesis—not a claim that every stage is already proven.</p></div>
    <div class="reading-map loop-map"><svg viewBox="0 0 1330 360" aria-labelledby="ecosystem-title" role="img"><title id="ecosystem-title">Clients fund compute; owners build packs; the Library attracts people; Foundry and God Questions improve systems and win better client outcomes.</title><defs><marker id="loop-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="#82967e"/></marker></defs><g class="e" marker-end="url(#loop-arrow)"><path d="M310 90H375"/><path d="M630 90H695"/><path d="M950 90H1015"/><path d="M1270 90H1300V270H1275"/><path d="M1020 270H955"/><path d="M700 270H635"/><path d="M380 270H315"/><path d="M60 270H30V90H55"/></g>${nodes}</svg></div>
  </section>
  <div role="group" class="industry-front-links shell" aria-label="Foundry research"><a href="${href('industries/')}">Browse industry research →</a><a href="${href('valuation/')}">Explore code valuation →</a></div>
  <section class="agent-reading shell" id="for-agents"><div>${eyebrow('For agents')}<h2>Read these five files.</h2><p>Then follow a Work’s dossier to its exact source. A Work is an identity, a Release is an evidenced version, and an Assembly describes how Works operate together.</p></div><ol>
    <li><a href="https://github.com/sisodias/great-library-of-siso/blob/main/README.md">README.md</a><span>Identity and boundaries</span></li>
    <li><a href="https://github.com/sisodias/great-library-of-siso/blob/main/AGENTS.md">AGENTS.md</a><span>Contribution and safety contract</span></li>
    <li><a href="https://github.com/sisodias/great-library-of-siso/blob/main/CURRENT_STATE.md">CURRENT_STATE.md</a><span>Verified baseline and resume points</span></li>
    <li><a href="${href('catalog.json')}">catalog.json</a><span>Works, repositories and dossier links</span></li>
    <li><a href="${href('intelligence.json')}">intelligence.json</a><span>Events, ownership and decisions</span></li>
  </ol></section>`;
}

function homePage(works, releases, snapshots, assemblies, sections) {
  return page({
    title: 'The front door to the SISO ecosystem',
    rootClass: 'reading-page library-front',
    description: 'A human- and agent-readable registry of SISO works, releases, relationships, and named snapshots.',
    body: `${frontDoor(works, sections)}
    <section id="catalog" class="section catalog-section shell">
      <div class="section-heading compact">${eyebrow('Live index')}<h2>Browse the Works</h2><p><span data-result-count>${works.length}</span> accepted ${works.length === 1 ? 'record' : 'records'} in this build.</p></div>
      ${works.length ? catalogControls(works) : ''}
      <div class="work-grid" data-catalog>${works.length ? works.map(workCard).join('') : emptyCatalog('The public shell is ready; Work pages will appear as soon as accepted registry records land.')}</div>
      <p class="no-results" data-no-results hidden>No Works match those filters.</p>
    </section>
    <section class="ledger shell" aria-label="Registry counts"><div><strong>${String(works.length).padStart(2, '0')}</strong><span>Works</span></div><div><strong>${String(assemblies.length).padStart(2, '0')}</strong><span>Assemblies</span></div><div><strong>${String(snapshots.length).padStart(2, '0')}</strong><span>Snapshots</span></div><p>Counts reflect accepted registry files in this build.</p></section>`,
  });
}

function agentsPage(works, assemblies, snapshot, sectionWork) {
  const stack = assemblies.find((assembly) => assembly.slug === 'siso-agent-stack');
  const members = assemblyMembers(stack, works);
  const projected = projectionMembers(sectionWork?.id, snapshot, works).map(({ work }) => work);
  const related = [...new Map([...members.map(({ work }) => work).filter(Boolean), ...projected].map((work) => [work.id, work])).values()];
  return page({
    title: 'Agents', active: 'agents', rootClass: 'agents-page',
    description: 'The Agents section of The Great Library of SISO.',
    body: `<section class="subhero shell">${eyebrow('Library / Sections / Agents')}<div><h1>Agents</h1><p>${esc(stack?.name || 'SISO Agent Stack')} keeps the working stack together. Component roles describe responsibility inside this assembly; they are not global categories.</p></div><span class="folio">A—01</span></section>
    <section class="relationship-map shell" aria-labelledby="map-title"><div class="map-copy">${eyebrow(`Assembly / ${stack?.version || 'unversioned'}`)}<h2 id="map-title">One stack.<br>Four required components.</h2><p>${esc(stack?.outcome || 'The assembly connects intent, execution, coordination, project state, and proof.')}</p><p><a href="${href('promotion/')}">Explore promotion candidates →</a><br><a href="${href('docs/agent-stack-model.html')}">Read the source-backed stack model →</a><br><a href="${href('docs/agents-workspace-layout.html')}">See the executed workspace layout →</a><br><a href="${href('docs/agent-base-module-map.html')}">See the Agent Base module extraction map →</a><br><a href="${href('docs/skills-repository-map.html')}">Open the Skill repository map →</a><br><a href="${href('docs/task-state-system-map.html')}">See where task and state source belongs →</a></p></div><div class="map-stack">${members.map(({ component, work }, i) => {
      return `<div class="map-node ${work ? '' : 'is-pending'}"><span>0${i + 1}</span><div><b>${esc(work?.name || component.component_id)}</b><small>${esc(component.required ? `required · ${component.role}` : component.role)}</small></div></div>`;
    }).join('')}<p class="map-key"><i></i>Skills are reusable capabilities. Playbooks compose skills, tools, lanes, and verification for a scenario.</p></div></section>
    <section class="section shell catalog-section"><div class="section-heading compact">${eyebrow('Accepted records')}<h2>Works in Agents</h2><p><span data-result-count>${related.length}</span> Works available to read.</p></div>${related.length ? catalogControls(related) : ''}<div class="work-grid" data-catalog>${related.length ? related.map(workCard).join('') : emptyCatalog('This section will populate from accepted Work records; no provisional detail pages are published.')}</div><p class="no-results" data-no-results hidden>No Works match those filters.</p></section>`,
  });
}

function usePage(works, tasks) {
  const entries = ['siso-project-os', 'siso-agent-base', 'siso-skills', 'siso-shell', 'siso-harness-lab', 'actionmodel-assembly-framework']
    .map(slug => works.find(work => work.slug === slug)).filter(Boolean);
  const taskRows = records => records.map(task => `<details class="industry-panel"><summary><b>${esc(task.id)} · ${esc(task.title)}</b> <span class="task-status">${esc(task.status.replaceAll('_', ' '))}</span></summary><p>${esc(task.description || 'Read the canonical task record for scope.')}</p><ul>${task.acceptance_criteria.map(criterion => `<li>${esc(criterion)}</li>`).join('')}</ul><p class="industry-meta">${task.latest_observation ? `Last recorded step: ${esc(task.latest_observation.timestamp)} · ${esc(task.latest_observation.action)}` : 'No dated step is recorded.'}</p><p><code>node bin/gls task ${esc(task.id)}</code> · <a href="${href(`tasks/${task.id}.json`)}">Read-only task projection</a></p><p class="industry-meta">Canonical source: <code>${esc(task.source_file)}</code></p></details>`).join('');
  return page({ title: 'Use & improve the Library', description: 'Find an owning source, inspect its exact state and contribute checkable work through the existing Library tools.', rootClass: 'industry-page operate-page', body: `
    <section class="subhero shell">${eyebrow('Library / Put the work to use')}<div><h1>Find it. Understand it.<br>Make useful progress.</h1><p>The Library connects independent projects, research and reusable capabilities. Start with the reader’s job, resolve the owning source and its actual state, then use that project’s instructions. A catalog entry is not a runtime or an installation promise.</p></div></section>
    <div class="industry-content shell">
      <section id="discover"><h2>1. Find the right Work</h2><p><a href="${href('#catalog')}">Browse and filter the catalog</a>, or use the existing Library CLI from a checkout. Search returns compact matches; inspect takes an exact slug or stable Work ID.</p><pre><code>node bin/gls search "agent runtime"
node bin/gls inspect siso-agent-base</code></pre><p>The dossier gives the selected Snapshot and Release, artifact locators, ownership, source visibility and entry instructions. If commands have not been reviewed, it says so. <code>gls</code> refuses a stale generated projection and tells you to rebuild it; it does not silently treat yesterday’s output as current.</p></section>
      <section id="operate"><h2>2. Read the owner’s entry before execution</h2><p>Use the Work’s <b>For agents</b> entry and the pinned source. Keep private access, installation, runtime admission and production qualification separate. Action Model owns its assembly methods; Harness Lab owns improvement experiments; Project OS owns the reusable task and execution lifecycle.</p><p>For remote reading, <a href="${href('llms.txt')}">llms.txt</a> is the short router and <a href="${href('catalog.json')}">catalog.json</a> is the generated machine catalog. Each Work links to a bounded dossier rather than asking an agent to reconstruct the whole library.</p></section>
      <section id="work"><h2>3. Take a bounded, checkable task</h2><pre><code>node bin/gls tasks
node bin/gls task TASK-0007</code></pre><p>These read the existing <code>.agents/tasks/</code> records. The task contains its scope, acceptance criteria and evidence. It does not claim itself, start an agent or grant publication authority. For work in another project, use that project’s existing task and handoff system.</p><p>Record the input/source revision, exact changed files, checks and exit codes, result and remaining gate. A repeated attempt with no changed input or new evidence is a reason to revisit the task or report a blocker, not call the same failure a success.</p></section>
      <section id="library-work"><h2>Current Library work</h2><p>This is a build-time projection of the existing task records, not a live agent feed or another task writer. Read the scope and acceptance before acting. A blocked task needs its blocker resolved; a completed task is evidence to inspect.</p><div class="task-records">${taskRows(tasks.filter(task => !['completed', 'cancelled'].includes(task.status))) || '<p>No open task records are present in this build.</p>'}</div><details class="completed-work"><summary>Completed and cancelled records</summary><div class="task-records">${taskRows(tasks.filter(task => ['completed', 'cancelled'].includes(task.status)))}</div></details></section>
      <section id="contribute"><h2>4. Contribute reviewed metadata</h2><p>Read and classify source first. Prepare a schema-valid record and inspect a dry run before a real add:</p><pre><code>node bin/gls add work --file candidate-work.json --reviewed-public --dry-run
node bin/gls add work --file candidate-work.json --reviewed-public</code></pre><p>The real command holds an exclusive lock and runs the Library gate. Failed adds roll back only unchanged files created by that invocation. Existing records are never overwritten by <code>add</code>; changes to current Work metadata are reviewed source edits, while accepted immutable records require successors. <a href="${href('docs/gls.md')}">Read the exact CLI contract</a>.</p></section>
      <section id="upgrade"><h2>5. Upgrade once, verify each consumer</h2><p>The shell and its components stay in their owning source repository. Review an exact source revision, register a Release with its evidence, select it in a successor Snapshot, and pin the consumer to the same revision. The build copies those assets. This gives projects a common source without making every live deployment change unexpectedly.</p><pre><code>node scripts/audit-ui-integration.mjs --strict
npm run verify</code></pre><p>The diagnostic checks source and selection; the full gate checks registry, generated routes and publication safety. Actual browser behavior and live deployment need their own receipts. <a href="${href('docs/library-ui-integration.md')}">Integration contract and acceptance</a>.</p></section>
    </div><section class="section shell"><div class="section-heading compact">${eyebrow('The operating system behind the work')}<h2>Open the owning project.</h2></div><div class="work-grid">${entries.map(workCard).join('')}</div></section>` });
}

function researchPage(works, snapshot, sectionWork, activeReleasesByWork, asOfDate) {
  const related = projectionMembers(sectionWork?.id, snapshot, works).map(({ work }) => work);
  const questions = related.filter((work) => work.type === 'research_question');
  const systems = related.filter((work) => work.type !== 'research_question');
  const programCounts = questions.reduce((counts, work) => {
    const program = work.researchContract?.program;
    if (program) counts.programmed += 1;
    counts.assumptions += program?.assumptions?.length || 0;
    counts.evidence += program?.evidence_connections?.length || 0;
    counts.links += program?.action_learning_links?.length || 0;
    return counts;
  }, { programmed: 0, assumptions: 0, evidence: 0, links: 0 });
  const questionStates = [...questions.reduce((counts, work) => counts.set(work.researchContract?.state || 'unscoped', (counts.get(work.researchContract?.state || 'unscoped') || 0) + 1), new Map())]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([state, count]) => `${count} ${state.replaceAll('_', ' ')}`)
    .join(' · ');
  return page({
    title: 'Research', active: 'research', rootClass: 'agents-page',
    description: 'The Research section of The Great Library of SISO.',
    body: `<section class="subhero shell">${eyebrow('Library / Sections / Research')}<div><h1>Research</h1><p>Foundry discovers the evidence universe. SISO Knowledge preserves it. Evidence Engines turn it into traceable claims. Frontier Questions keep the highest-leverage questions and their answer lineage alive.</p></div><span class="folio">R—01</span></section>
    <section class="relationship-map shell" aria-labelledby="research-map-title"><div class="map-copy">${eyebrow(`Projection / ${snapshot?.version || 'unversioned'}`)}<h2 id="research-map-title">One evidence loop.<br>Clear ownership.</h2><p>The Library owns stable question and answer identities, not the corpus payload. Each Research system remains independently addressable and releasable.</p><p><a href="${href('docs/siso-mission.html')}">Read the SISO mission →</a><br><a href="${href('docs/question-driven-research.html')}">Open the question-driven research architecture →</a><br><a href="${href('docs/foundry-agency-intelligence.html')}">See Foundry intelligence become Agency capability →</a><br><a href="${href('docs/frontier-question-template.html')}">Use the Frontier Question template + CRM example →</a><br><a href="${href('docs/god-questions-infrastructure.html')}">Read the God Questions infrastructure constitution →</a><br><a href="${href('docs/estate-reconciliation.html')}">See the public estate reconciliation model →</a><br><a href="${href('research.json')}">Open the agent-readable Observatory JSON →</a><br><a href="${href('docs/research-question-model.html')}">Read the Frontier Question identity model →</a><br><a href="${href('docs/siso-knowledge-model.html')}">Read the SISO Knowledge boundary →</a></p></div><div class="map-stack">${systems.map((work, i) => `<div class="map-node"><span>${String(i + 1).padStart(2, '0')}</span><div><b>${esc(work.name)}</b><small>${esc(work.type)} · ${esc(work.maturity)}</small></div></div>`).join('') || '<p class="map-key">Accepted Research systems are being indexed.</p>'}</div></section>
    <section class="model-strip"><div class="shell"><p><b>God Questions Observatory.</b> ${esc(questionStates || 'No question state recorded')} across ${questions.length} standing questions.</p><p><b>Program substrate.</b> ${programCounts.programmed} questions · ${programCounts.assumptions} assumptions · ${programCounts.evidence} evidence connections · ${programCounts.links} action/learning links.</p><p><b>Questions drive the portfolio.</b> Research state is distinct from public answer maturity; artifact-free metadata seed Releases are not accepted answers.</p></div></section>
    <section id="questions" class="section shell catalog-section"><div class="section-heading compact">${eyebrow('Frontier Questions · God Questions')}<h2>Questions worth answering again.</h2><p><span data-result-count>${questions.length}</span> standing questions with stable identities, explicit evidence scopes, and versioned-answer contracts. Metadata seed Releases are not accepted answers.</p></div>${questions.length ? catalogControls(questions) : ''}<div class="work-grid" data-catalog>${questions.length ? questions.map((work) => questionCard(work, activeReleasesByWork.get(work.id), asOfDate)).join('') : emptyCatalog('Questions appear only after a publication-safe research contract is accepted.')}</div><p class="no-results" data-no-results hidden>No questions match those filters.</p></section>
    <section class="section shell catalog-section"><div class="section-heading compact">${eyebrow('Research systems')}<h2>The machinery behind the answers.</h2><p>${systems.length} independently owned Works.</p></div><div class="work-grid">${systems.map(workCard).join('')}</div></section>`,
  });
}

function buildResearchProjection(works, snapshot, sectionWork, activeReleasesByWork, asOfDate) {
  const worksById = new Map(works.map((work) => [work.id, work]));
  const questions = projectionMembers(sectionWork?.id, snapshot, works).map(({ work }) => work).filter((work) => work.type === 'research_question');
  const projectedQuestions = questions.map((work) => {
    const contract = work.researchContract;
    const program = contract.program || null;
    const selectedRelease = activeReleasesByWork.get(work.id);
    const answerState = publicAnswerState(selectedRelease);
    const operations = questionOperationalState(work, asOfDate);
    return {
      work_id: work.id,
      question_id: contract.question_id,
      slug: work.slug,
      library_url: href(`works/${work.slug}/`),
      question: contract.question,
      research_state: contract.state,
      lifecycle_status: work.maturity,
      steward: operations.steward,
      freshness: operations.freshness,
      next_useful_work: operations.nextUsefulWork,
      evidence_mode: contract.evidence_mode,
      decision_to_change: contract.decision_to_change || null,
      success_criteria: contract.success_criteria || [],
      falsifiers: contract.falsifiers || [],
      evidence_gaps: contract.evidence_gaps || [],
      watch_triggers: contract.watch_triggers || [],
      source_work_ids: contract.source_work_ids,
      source_works: contract.source_work_ids.map((workId) => {
        const sourceWork = worksById.get(workId);
        return {
          work_id: workId,
          name: sourceWork?.name || null,
          library_url: sourceWork ? href(`works/${sourceWork.slug}/`) : null,
          source_links: sourceWork?.links || [],
        };
      }),
      source_scopes: contract.source_scopes,
      answer_shape: contract.answer_shape,
      refresh_policy: contract.refresh_policy,
      publication_boundary: contract.publication_boundary,
      selected_release: selectedRelease ? {
        id: selectedRelease.id,
        release_kind: selectedRelease.releaseKind,
        version: selectedRelease.version,
        released_at: selectedRelease.date,
        artifact_count: selectedRelease.artifactCount,
        public_answer_state: answerState.code,
        public_answer_note: answerState.label,
      } : null,
      program,
      authoring_metrics: {
        assumptions: program?.assumptions.length || 0,
        evidence_connections: program?.evidence_connections.length || 0,
        action_learning_links: program?.action_learning_links.length || 0,
        serialized_program_bytes: program ? Buffer.byteLength(JSON.stringify(program)) : 0,
      },
    };
  });
  return {
    schema_version: '1.0.0',
    snapshot_id: snapshot?.id || null,
    snapshot_version: snapshot?.version || null,
    infrastructure_contract_url: href('docs/god-questions-infrastructure.html'),
    counts: {
      questions: projectedQuestions.length,
      programmed_questions: projectedQuestions.filter((question) => question.authoring_metrics.assumptions || question.authoring_metrics.evidence_connections || question.authoring_metrics.action_learning_links).length,
      assumptions: projectedQuestions.reduce((sum, question) => sum + question.authoring_metrics.assumptions, 0),
      evidence_connections: projectedQuestions.reduce((sum, question) => sum + question.authoring_metrics.evidence_connections, 0),
      challenge_edges: projectedQuestions.reduce((sum, question) => sum + (question.program?.evidence_connections || []).reduce((edges, connection) => edges + (connection.challenges_assumption_ids?.length || 0), 0), 0),
      action_learning_links: projectedQuestions.reduce((sum, question) => sum + question.authoring_metrics.action_learning_links, 0),
      public_answers_released: projectedQuestions.filter((question) => question.selected_release?.public_answer_state === 'released').length,
      serialized_program_bytes: projectedQuestions.reduce((sum, question) => sum + question.authoring_metrics.serialized_program_bytes, 0),
    },
    questions: projectedQuestions,
  };
}

function detailList(title, items) {
  return `<section class="detail-block"><h2>${esc(title)}</h2>${items.length ? `<div class="detail-rows">${items.join('')}</div>` : '<p class="quiet">Nothing has been declared here yet.</p>'}</section>`;
}

function ownerEntry(work, activeRelease) {
  const reading = work.raw.reading;
  const repository = work.provenance.locators?.find(locator => locator.type === 'source_repository');
  const selectedSource = activeRelease?.raw.artifacts?.find(artifact => artifact.kind === 'source_archive' && artifact.locator.startsWith(`${repository?.url}/`));
  const revision = selectedSource?.revision || repository?.revision || null;
  const repo = repository && githubRepository({ url: repository.url });
  const fallback = work.links.find(link => link.kind === 'documentation') || work.links.find(link => link.kind === 'homepage') || work.links.find(link => link.kind === 'readme');
  const pinnedRepository = repo && /^[a-f0-9]{40}$/.test(revision || '') ? `${repo.url}/tree/${revision}` : null;
  const entryUrl = reading?.agent_entry || pinnedRepository || fallback?.url || null;
  const matchingLocator = work.links.find(link => entryUrl?.startsWith(link.url));
  return {
    state: reading ? 'authored' : entryUrl ? 'locator_only' : 'not_recorded',
    owner: reading?.owner || (stewardName(work) === 'Unassigned' ? null : stewardName(work)),
    entry_url: entryUrl,
    visibility: matchingLocator?.visibility || (pinnedRepository && !reading ? repository.visibility : 'unknown'),
    source_revision: revision,
    source_revision_basis: selectedSource ? 'selected_artifact' : revision ? 'observed_repository' : 'not_recorded',
    entry_revision: reading?.agent_entry.match(/\/(?:blob|tree)\/([a-f0-9]{40})\//)?.[1] || (!reading && pinnedRepository ? revision : null),
    commands: reading?.agent_commands || [],
    reference: reading?.reference || work.sourceFile,
  };
}

function ownerEntryPanel(work, activeRelease) {
  const entry = ownerEntry(work, activeRelease);
  return `<section class="module-agent shell"><h2>For agents</h2><p>${entry.owner ? `<b>${esc(entry.owner)}</b> · ` : ''}${entry.entry_url ? `<a href="${esc(entry.entry_url)}" rel="noopener noreferrer">Open ${entry.visibility === 'private' ? 'authorized private' : 'owning'} source entry ↗</a>` : 'No owning entry route is recorded.'} · <a href="${href(`works/${work.slug}/index.json`)}">Machine-readable dossier</a></p><p>No reviewed run or test commands are recorded for this Work. Read its owning instructions before execution. The selected release and source availability are shown below; a source link alone is not installation or access permission.</p></section>`;
}

function moduleReading(work, byId) {
  const reading = work.raw.reading;
  const mapLabel = (value, limit) => value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  const relations = work.relationships.map(relation => ({ ...relation, work: byId.get(relation.target) })).filter(relation => relation.work);
  const height = Math.max(140, relations.length * 86 + 20);
  const map = `<svg viewBox="0 0 800 ${height}" role="img" aria-labelledby="module-map-title"><title id="module-map-title">${esc(work.name)} and its related Works; each connection is described below.</title><rect class="root" x="16" y="${height / 2 - 32}" width="225" height="64" rx="8"/><text x="36" y="${height / 2 + 6}">${esc(mapLabel(work.name, 24))}</text>${relations.map((relation, i) => `<path class="e" d="M241 ${height / 2} H320 V${i * 86 + 52} H390"/><a href="${href(`works/${relation.work.slug}/`)}"><title>${esc(relation.work.name)} · ${esc(relation.type)}</title><rect class="box" x="390" y="${i * 86 + 20}" width="380" height="64" rx="8"/><text x="410" y="${i * 86 + 47}">${esc(mapLabel(relation.work.name, 43))}</text><text class="lbl" x="410" y="${i * 86 + 68}">${esc(relation.type.replaceAll('_', ' '))} →</text></a>`).join('')}</svg>`;
  return `<section class="module-overview shell"><div><p class="eyebrow">The Library’s reading</p><h2>Why it matters</h2><p>${esc(reading.why)}</p><a class="text-link" href="${esc(href(reading.reference))}">Read the reasoning & boundaries ↗</a></div><div><h2>How it links</h2><div class="reading-map">${map}</div></div></section>
    <section class="module-sauce shell"><div class="loop-heading"><h2>Sauce</h2><p>The useful things to open first. Claims stay attached to dated receipts.</p></div><div class="sauce-grid">${reading.highlights.map((item, i) => {
      const privateSource = work.links.some(link => link.visibility === 'private' && item.url.startsWith(link.url));
      return `<a href="${esc(safeExternalUrl(item.url) || '#')}" rel="noopener noreferrer"><span class="eyebrow">0${i + 1} / ${privateSource ? 'Private source' : 'Source highlight'}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><span>${privateSource ? 'Authorized access' : 'Open source'} ↗</span></a>`;
    }).join('')}</div></section>
    <section class="module-agent shell"><h2>For agents</h2><p><b>${esc(reading.owner)}</b> · Start with the <a href="${esc(safeExternalUrl(reading.agent_entry) || '#')}">source entry</a>, then the <a href="${href(`works/${work.slug}/index.json`)}">machine-readable dossier</a>.</p><p>Documented entry commands: ${reading.agent_commands.map(command => `<code>${esc(command)}</code>`).join(' · ')}. These are documented source entry commands; fresh test results are recorded separately in the evidence. Follow the owning source instructions before execution; private access and campaign activation remain separate.</p></section>`;
}

function workPage(work, releases, byId, activeRelease, asOfDate) {
  const reading = work.raw.reading;
  const workReleases = releases.filter((release) => release.workId === work.id);
  const latest = activeRelease || workReleases.at(-1);
  const provenance = [
    ['Work ID', work.id],
    ['Registry source', work.sourceFile],
    ['Steward', work.provenance.steward || work.provenance.owner || work.raw.steward],
    ['Origin', work.provenance.origin || work.provenance.upstream || work.raw.origin],
    ['License / redistribution', work.license],
  ].filter(([, value]) => value).map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(typeof value === 'object' ? value.name || value.state || 'Recorded' : value)}</dd></div>`);
  const relationshipRows = work.relationships.map((relation) => {
    const target = byId.get(relation.target);
    const targetLabel = relation.label || target?.name || relation.target;
    return `<div><span>${esc(relation.type)}</span><p>${target ? `<a href="${href(`works/${target.slug}/`)}">${esc(targetLabel)}</a>` : esc(targetLabel)}${relation.context ? `<small>${esc(relation.context)}</small>` : ''}${target ? '' : '<small>Unresolved in this build</small>'}</p></div>`;
  });
  const linkRows = work.links.map((link) => `<a href="${esc(link.url)}" rel="noopener noreferrer"><span>${esc(`${link.kind} · ${link.visibility}`)}</span><b>${esc(link.label)}</b><i aria-hidden="true">↗</i></a>`);
  linkRows.push(`<a href="${href(`works/${work.slug}/index.json`)}"><span>agent context · public</span><b>Open machine-readable dossier</b><i aria-hidden="true">→</i></a>`);
  const workEvidenceRows = work.evidence.map((entry) => {
    const reference = safeExternalUrl(entry.reference);
    const receipt = reference ? `<a href="${esc(reference)}" rel="noopener noreferrer">Open receipt ↗</a>` : `<code>${esc(entry.reference)}</code>`;
    return `<div><span>${esc(`${text(entry.kind, 'evidence')} · ${text(entry.observed_at, 'date pending')}`)}</span><p>${esc(entry.summary)}<small>${receipt}</small></p></div>`;
  });
  const libraryUrl = href(`works/${work.slug}/`);
  const researchContract = work.researchContract;
  const sourceWorkRows = (researchContract?.source_work_ids || []).map((workId) => {
    const sourceWork = byId.get(workId);
    if (!sourceWork) return `<div><span>Source Work</span><p>${esc(workId)}<small>Unresolved in this build</small></p></div>`;
    const sourceLinks = sourceWork.links.map((link) => `<a href="${esc(link.url)}" rel="noopener noreferrer">${esc(`${link.label} (${link.visibility})`)}</a>`).join(' · ');
    return `<div><span>Source Work</span><p><a href="${href(`works/${sourceWork.slug}/`)}">${esc(sourceWork.name)}</a><small>${sourceLinks || 'No external source locator declared.'}</small></p></div>`;
  });
  const researchProgram = researchContract?.program;
  const answerState = publicAnswerState(latest);
  const operations = researchContract ? questionOperationalState(work, asOfDate) : null;
  const researchRows = researchContract ? [
    ['Question', researchContract.question],
    ['Steward', operations.steward],
    ['Lifecycle status', work.maturity],
    ['Research state', researchContract.state],
    ['Freshness', freshnessLabel(operations.freshness)],
    ['Next useful work', operations.nextUsefulWork],
    ['Selected release', activeRelease ? `${activeRelease.id} · ${activeRelease.version}` : 'No selected release'],
    ['Public answer release', answerState.label],
    ['Evidence mode', researchContract.evidence_mode.replaceAll('_', ' ')],
    ['Decision to change', researchContract.decision_to_change],
    ['Success criteria', researchContract.success_criteria?.join(' · ')],
    ['Falsifiers', researchContract.falsifiers?.join(' · ')],
    ['Evidence gaps', researchContract.evidence_gaps?.join(' · ')],
    ['Watch triggers', researchContract.watch_triggers?.join(' · ')],
    ['Source scopes', researchContract.source_scopes.join(' · ')],
    ['Answer shape', researchContract.answer_shape],
    ['Refresh policy', researchContract.refresh_policy],
    ['Publication boundary', researchContract.publication_boundary.replaceAll('_', ' ')],
  ].filter(([, value]) => value).map(([label, value]) => `<div><span>${esc(label)}</span><p>${esc(value)}</p></div>`) : [];
  const assumptionRows = (researchProgram?.assumptions || []).map((assumption) => `<div><span>${esc(`${assumption.id} · ${assumption.level} · ${assumption.status} · ${assumption.confidence}`)}</span><p>${esc(assumption.statement)}<small> Scope: ${esc(assumption.scope)} · Falsifier: ${esc(assumption.falsifier)} · Depends on: ${esc((assumption.depends_on || []).join(', ') || 'none')} · Evidence: ${esc((assumption.evidence_connection_ids || []).join(', ') || 'none')} · Review: ${esc(assumption.review_date)}</small></p></div>`);
  const evidenceRows = (researchProgram?.evidence_connections || []).map((connection) => {
    const owner = byId.get(connection.owning_work_id);
    return `<div><span>${esc(`${connection.id} · ${connection.source_type} · ${connection.rights_state}`)}</span><p>${esc(connection.summary)}<small> Owner: ${owner ? `<a href="${href(`works/${owner.slug}/`)}">${esc(owner.name)}</a>` : esc(connection.owning_work_id)} · Supports: ${esc((connection.supports_assumption_ids || []).join(', ') || 'none')} · Challenges: ${esc((connection.challenges_assumption_ids || []).join(', ') || 'none')} · Observed: ${esc(connection.observed_at)}</small></p></div>`;
  });
  const actionRows = (researchProgram?.action_learning_links || []).map((link) => `<div><span>${esc(`${link.id} · ${link.object_type.replaceAll('_', ' ')} · ${link.authority_state.replaceAll('_', ' ')}`)}</span><p>${esc(link.summary)}<small> Owner role: ${esc(link.owner_role.replaceAll('_', ' '))} · Status: ${esc(link.status.replaceAll('_', ' '))} · Recorded: ${esc(link.recorded_at)} · Truth: ${esc(link.truth_state?.replaceAll('_', ' ') || 'not applicable')} · Predecessors: ${esc((link.predecessor_ids || []).join(', ') || 'none')} · Assumptions: ${esc((link.related_assumption_ids || []).join(', ') || 'none')}</small></p></div>`);
  const detailSections = [
    researchContract ? detailList('Research sources', sourceWorkRows) : '',
    detailList(reading ? 'Repos & source links' : 'Source & upstream links', linkRows),
    relationshipRows.length ? detailList('Relationships', relationshipRows) : '',
    workEvidenceRows.length ? detailList('Evidence & receipts', workEvidenceRows) : '',
    detailList('Provenance', provenance.length ? [`<dl class="provenance-list">${provenance.join('')}</dl>`] : []),
  ].filter(Boolean).join('\n        ');
  return page({
    title: work.name,
    active: work.section === 'Research' ? 'research' : /agent/i.test(`${work.section} ${work.type}`) ? 'agents' : 'library',
    description: work.summary,
    rootClass: `work-page${reading ? ' reading-page module-reading' : ''}`,
    body: `<article>
      <header class="work-hero shell">${eyebrow(`${work.section === 'Unassigned' ? 'Registered Work' : work.section} · ${work.type} · ${work.maturity}`)}<div class="work-title"><h1>${esc(work.name)}</h1><p>${esc(reading?.subtitle || work.summary)}</p></div><dl class="work-meta"><div><dt>Type</dt><dd>${esc(work.type)}</dd></div><div><dt>Maturity</dt><dd>${esc(work.maturity)}</dd></div><div><dt>Section</dt><dd>${esc(work.section === 'Unassigned' ? 'Outside selected section view' : work.section)}</dd></div><div><dt>Snapshot</dt><dd>${activeRelease ? `Selected · ${esc(activeRelease.version)}` : 'Registered · not selected'}</dd></div></dl></header>
      ${reading ? moduleReading(work, byId) : ownerEntryPanel(work, activeRelease)}<div class="permalink-bar"><div class="shell"><span>Permanent Library detail URL</span><code>${esc(libraryUrl)}</code></div></div>${researchRows.length ? `
      <div class="shell">${detailList(`Research contract · ${researchContract.question_id}`, researchRows)}<p><a href="${href('docs/god-questions-infrastructure.html')}">Read the God Questions infrastructure constitution →</a></p>${researchProgram ? `${detailList(`Assumptions · ${assumptionRows.length}`, assumptionRows)}${detailList(`Evidence connections · ${evidenceRows.length}`, evidenceRows)}${detailList(`Action and learning lineage · ${actionRows.length}`, actionRows)}` : ''}</div>` : ''}
      <div class="detail-layout shell"><div>
        ${detailSections}
      </div><aside class="release-panel"><div class="release-heading"><div>${eyebrow(activeRelease ? 'Selected release' : latest ? 'Registered release · not selected' : 'No selected release')}<h2>${esc(latest?.version || 'No accepted release')}</h2></div><span>${esc(latest?.date || 'Manifest pending')}</span></div>${researchContract ? `<p class="uncertainty-note"><b>Public answer:</b> ${esc(answerState.code.replaceAll('_', ' '))}. Research state does not substitute for an accepted answer artifact.</p>` : ''}<div class="state-list">${DIST_KEYS.map(([key, label]) => {
          const state = stateFor(latest, key);
          return `<div><span class="state-dot ${state.tone}" aria-hidden="true"></span><p><b>${esc(label)}</b><small>${esc(state.note)}</small></p><strong>${esc(state.label)}</strong></div>`;
        }).join('')}</div><p class="uncertainty-note">Availability is never inferred. Positive states require an explicit release declaration and evidence.</p></aside></div>
    </article>`,
  });
}

function workProjection(work, releases, byId, activeRelease) {
  const latest = activeRelease || null;
  return {
    schema_version: '1.0.0',
    work_id: work.id,
    slug: work.slug,
    name: work.name,
    summary: work.summary,
    ...(work.raw.reading ? { reading: work.raw.reading } : {}),
    work_type: work.type,
    lifecycle_status: work.maturity,
    section: work.section,
    library_url: href(`works/${work.slug}/`),
    agent_context_url: href(`works/${work.slug}/index.json`),
    registry_source: work.sourceFile,
    source_links: work.links,
    relationships: work.relationships.map((relation) => {
      const target = byId.get(relation.target);
      return {
        type: relation.type,
        context: relation.context,
        target_work_id: relation.target,
        target_name: target?.name || relation.label || null,
        target_library_url: target ? href(`works/${target.slug}/`) : null,
        evidence: relation.evidence,
      };
    }),
    evidence: work.evidence,
    provenance: work.provenance,
    selection: { state: latest ? 'selected' : 'registered_not_selected', snapshot_id: latestSnapshot?.id || null, release_id: latest?.id || null },
    owner_entry: ownerEntry(work, activeRelease),
    registered_releases: releases.filter(release => release.workId === work.id).map(release => ({ id: release.id, version: release.version, registry_source: release.raw.__file })),
    selected_release: latest ? {
      id: latest.id,
      version: latest.version,
      released_at: latest.date,
      release_kind: latest.releaseKind,
      registry_source: latest.raw.__file,
      artifacts: (latest.raw.artifacts || []).map(({ kind, locator, revision, availability, license }) => ({ kind, locator, revision, availability, license })),
      distribution: Object.fromEntries(Object.entries(latest.distribution).map(([key, value]) => [key, {
        state: value?.state || null,
        reason: value?.reason || null,
        evidence_count: value?.evidence?.length || 0,
      }])),
    } : null,
  };
}

function releaseIndex(releases, worksById) {
  const rows = releases.map((release) => `<article><span>${esc(release.version)}</span><div><h2>${esc(worksById.get(release.workId)?.name || release.workId || 'Unresolved Work')}</h2><p>${esc(release.id)} · ${esc(release.date)}</p></div></article>`).join('');
  return page({ title: 'Releases', active: 'releases', description: 'Immutable Release Manifests.', body: `<section class="subhero shell">${eyebrow('Library / Releases')}<div><h1>Releases</h1><p>Immutable manifests connect a Work to a version and make distribution claims explicit.</p></div><span class="folio">R—01</span></section><section class="section shell release-index">${rows || emptyCatalog('No accepted Release Manifests are present in this build.')}</section>` });
}

function snapshotIndex(snapshots) {
  const rows = snapshots.map((snapshot) => `<article><span>${esc(text(snapshot.name || snapshot.title, 'Named snapshot'))}</span><div><h2>${esc(text(snapshot.snapshot_id || snapshot.id, 'Unassigned'))}</h2><p>${esc(text(snapshot.summary || snapshot.description, 'Metadata-complete recursive view.'))}</p></div></article>`).join('');
  return page({ title: 'Snapshots', active: 'snapshots', description: 'Named recursive views of the Library.', body: `<section class="subhero shell">${eyebrow('Library / Snapshots')}<div><h1>Snapshots</h1><p>Named recursive views pin Library metadata. Payload materialization remains a separate, receipted operation.</p></div><span class="folio">S—01</span></section><section class="section shell release-index">${rows || emptyCatalog('No accepted named snapshots are present in this build.')}</section>` });
}

function githubRepository(locator) {
  const value = safeExternalUrl(locator?.url);
  if (!value) return null;
  const url = new URL(value);
  if (url.hostname.toLowerCase() !== 'github.com') return null;
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const repository = parts[1].replace(/\.git$/i, '');
  return { owner: parts[0], repository, url: `https://github.com/${parts[0]}/${repository}` };
}

function buildRepositoryEstate(works, releases, snapshot) {
  const releaseById = new Map(releases.map((release) => [release.id, release]));
  const activeByWork = new Map();
  for (const entry of snapshot?.releases || []) {
    const release = releaseById.get(entry.release_id);
    if (release) activeByWork.set(release.workId, release);
  }
  for (const work of works) {
    if (!activeByWork.has(work.id)) {
      const fallback = releases.filter((release) => release.workId === work.id).at(-1);
      if (fallback) activeByWork.set(work.id, fallback);
    }
  }

  const rows = [];
  for (const work of works) {
    const release = activeByWork.get(work.id);
    const artifacts = release?.raw?.artifacts || [];
    for (const locator of work.raw?.provenance?.locators || []) {
      const repository = githubRepository(locator);
      if (!repository) continue;
      const artifact = artifacts.find((candidate) => {
        const artifactUrl = safeExternalUrl(candidate.locator);
        return artifactUrl === repository.url || artifactUrl?.startsWith(`${repository.url}/archive/`);
      });
      rows.push({
        ...repository,
        work_id: work.id,
        work_name: work.name,
        work_slug: work.slug,
        work_type: work.type,
        lifecycle_status: work.maturity,
        library_url: href(`works/${work.slug}/`),
        locator_type: locator.type,
        locator_revision: locator.revision || null,
        visibility: locator.visibility || 'unknown',
        status: artifact ? 'released' : release?.raw?.artifacts?.length ? 'linked' : 'staging',
        active_release_id: release?.id || null,
        active_release_version: release?.version || null,
        artifact_revision: artifact?.revision || null,
      });
    }
  }
  return rows.sort((a, b) => `${a.status}:${a.owner}/${a.repository}`.localeCompare(`${b.status}:${b.owner}/${b.repository}`));
}

function estatePage(repositories, snapshot) {
  const released = repositories.filter((repository) => repository.status === 'released').length;
  const linked = repositories.filter((repository) => repository.status === 'linked').length;
  const staging = repositories.filter((repository) => repository.status === 'staging').length;
  const rows = repositories.map((repository) => `<article>
    <span>${esc(repository.status)}</span>
    <div><h2><a href="${esc(repository.url)}" rel="noopener noreferrer">${esc(`${repository.owner}/${repository.repository}`)}</a></h2>
      <p><a href="${esc(repository.library_url)}">${esc(repository.work_name)}</a> · ${esc(repository.work_type)} · ${esc(repository.visibility)}</p>
      <p>${repository.status === 'released'
        ? `Pinned source in ${esc(repository.active_release_version || repository.active_release_id)} at <code>${esc(repository.artifact_revision || repository.locator_revision || 'recorded revision')}</code>.`
        : repository.status === 'linked'
          ? 'Registered destination or companion repository; the active release is pinned to another source locator.'
          : 'Public staging home with no source artifact in the active named snapshot yet.'}</p>
    </div>
  </article>`).join('');
  return page({
    title: 'Repository estate', active: 'estate',
    description: 'Generated status of GitHub repositories registered by The Great Library of SISO.',
    body: `<section class="subhero shell">${eyebrow(`Library / Repository estate / Snapshot ${snapshot?.version || 'unversioned'}`)}<div><h1>Repository estate</h1><p>A generated operational view of GitHub homes. Works are permanent identities; repositories are movable source locators.</p></div><span class="folio">E—01</span></section>
    <section class="ledger shell" aria-label="Repository status counts"><div><strong>${String(released).padStart(2, '0')}</strong><span>Released source</span></div><div><strong>${String(linked).padStart(2, '0')}</strong><span>Linked homes</span></div><div><strong>${String(staging).padStart(2, '0')}</strong><span>Staging homes</span></div><p>Derived from the active Release selected by the latest immutable snapshot.</p></section>
    <section class="section shell release-index">${rows || emptyCatalog('No GitHub repository locators are present in this snapshot.')}</section>`,
  });
}

// Authored readers keep their own CSS and body, scoped away from the shared rail
// using native CSS nesting. These source documents contain ordinary rules/media
// queries; unsupported global at-rules require an explicit integration review.
function frameDocument(contents) {
  if (!/<body\b/i.test(contents) || (contents.match(/<main\b/gi) || []).length > 1) throw new Error('Expected one authored document body and at most one main');
  contents = contents.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    if (/@(?!media\b)[a-z-]+/i.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) throw new Error('Review global authored-document CSS before wrapping');
    const nested = css.replace(/(^|[{}])([^{}]+)\{/g, (rule, boundary, selector) => {
      if (selector.trim().startsWith('@')) return rule;
      return `${boundary}${selector.replace(/(?<![-\w])(?::root|html|body)(?![-\w])/g, '&')}{`;
    });
    return `<style>.library-document {${nested}}</style>`;
  });
  return contents.replace(/<html\b/i, '<html class="no-js"')
    .replace(/<\/head>/i, `${frameHead()}</head>`)
    .replace(/<body\b([^>]*)>([\s\S]*?)<\/body>/i, (_, attributes, body) => {
      const attrs = /\bclass="/.test(attributes) ? attributes.replace(/\bclass="/, 'class="library-document ') : ` class="library-document"${attributes}`;
      const reading = /<main\b/i.test(body) ? body : `<main>${body}</main>`;
      return `<body class="library-shell document-page"><!--library-navigation--><div class="siso-shell-page" id="library-content" tabindex="-1"><div${attrs}>${reading}</div></div></body>`;
    });
}

function navigationFrame(path, contents) {
  const plain = value => value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").trim();
  const pageTitle = plain(contents.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || 'Current page');
  const ids = new Set([...contents.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const anchors = [];
  contents = contents.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (_, attrs, title) => {
    let id = attrs.match(/\bid="([^"]+)"/)?.[1];
    if (!id) {
      const stem = `reading-${plain(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'}`;
      id = stem;
      for (let i = 2; ids.has(id); i++) id = `${stem}-${i}`;
      ids.add(id);
      attrs += ` id="${id}"`;
    }
    anchors.push({ label: plain(title), href: `#${id}` });
    return `<h2${attrs}>${title}</h2>`;
  });
  const current = href(path.replace(/index\.html$/, ''));
  const groups = [
    { id: 'explore', label: 'Explore', destinations: [
      ['Library', '', 'library'], ['Agents', 'agents/', 'bot'], ['Research', 'research/', 'flask-conical'],
      ['God Questions', 'research/#questions', 'target'], ['Industries', 'industries/', 'building-2'], ['Value research', 'valuation/', 'bar-chart-3'],
      ...(works.some(work => work.slug === 'siso-source') ? [['SISO Source · private', 'works/siso-source/', 'lock', true]] : []),
    ] },
    { id: 'registry', label: 'Registry', destinations: [
      ['Activity & decisions', 'intelligence/', 'activity'], ['Repo estate', 'estate/', 'git-branch'], ['Promotion', 'promotion/', 'layers'],
      ['Releases', 'releases/', 'tag'], ['Snapshots', 'snapshots/', 'square-stack'],
    ] },
    { id: 'guides', label: 'Start here', destinations: [
      ['Use & contribute', 'use/', 'book-open'], ['Onboarding', 'docs/onboarding.html', 'file-text'], ['Shared templates', 'works/siso-shell/', 'layout-template'],
    ] },
  ].map(group => ({ ...group, destinations: group.destinations.map(([label, route, icon, privateSource]) => ({ label, href: href(route), icon, private: !!privateSource })) }));
  if (!groups.some(group => group.destinations.some(dest => dest.href === current))) {
    groups.push({ id: 'context', label: 'Current page', destinations: [{ label: pageTitle, href: current, icon: 'file-text' }] });
  }
  const page = /^(releases|snapshots)\/index\.html$/.test(path) ? [] : anchors;
  const navigation = `<a class="skip-link" href="#library-content">Skip to content</a>${rail({ title: 'Great Library', mark: 'S', home: href(''), groups, current, page }).replace('data-verify-collapsed-width="52"', 'data-donor-collapsed-width="52" data-verify-collapsed-width="20"')}`;
  return contents.replace('<!--library-navigation-->', navigation.replace(/[ \t]+$/gm, ''));
}

async function emit(path, contents) {
  if (path.endsWith('.html')) {
    if (path.startsWith('docs/')) contents = frameDocument(contents);
    if (!contents.includes('<!--library-navigation-->')) throw new Error(`Missing Library frame: ${path}`);
    contents = navigationFrame(path, contents);
  }
  const target = join(OUT, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

const [rawWorks, rawReleases, assemblies, sourceInventories, snapshots, decisions, events] = await Promise.all([
  loadRecords('works'), loadRecords('releases'), loadRecords('assemblies'), loadRecords('source-inventories'), loadRecords('snapshots'), loadRecords('decisions'), loadRecords('events'),
]);
const sourceDates = [...rawWorks, ...rawReleases, ...assemblies, ...sourceInventories, ...snapshots, ...decisions, ...events]
  .flatMap((record) => [record.updated_at, record.released_at, record.created_at, record.observed_at, record.decided_at, record.occurred_at, record.recorded_at])
  .filter(Boolean)
  .sort();
const latestSourceDate = sourceDates.at(-1) || '1970-01-01';
const sourceAsOfDate = latestSourceDate.slice(0, 10);
const generatedAt = /^\d{4}-\d{2}-\d{2}$/.test(latestSourceDate)
  ? `${latestSourceDate}T00:00:00.000Z`
  : new Date(latestSourceDate).toISOString();
const works = rawWorks.map(normalizeWork).sort((a, b) => a.name.localeCompare(b.name));
const releases = rawReleases.map(normalizeRelease).sort((a, b) => `${a.date}${a.version}`.localeCompare(`${b.date}${b.version}`));
const worksById = new Map(works.map((work) => [work.id, work]));
const latestSnapshot = [...snapshots].sort((a, b) => String(a.version || '').localeCompare(String(b.version || ''), undefined, { numeric: true })).at(-1);
const releaseById = new Map(releases.map((release) => [release.id, release]));
const activeReleasesByWork = new Map((latestSnapshot?.releases || []).map((entry) => {
  const release = releaseById.get(entry.release_id);
  return release ? [release.workId, release] : null;
}).filter(Boolean));
const libraryWork = works.find((work) => work.type === 'library');
const sectionEdges = (latestSnapshot?.projection?.edges || []).filter((edge) => edge.from_work_id === libraryWork?.id && edge.contextual_role === 'section');
const sections = sectionEdges.map((edge) => worksById.get(edge.to_work_id)).filter(Boolean);
for (const work of works) work.section = work.type === 'library' ? 'Library' : 'Unassigned';
for (const section of sections) {
  section.section = section.name;
  for (const { work } of projectionMembers(section.id, latestSnapshot, works)) work.section = section.name;
}
const repositoryEstate = buildRepositoryEstate(works, releases, latestSnapshot);
const promotion = buildPromotionProjection(sourceInventories, works);
const intelligence = buildIntelligenceProjection(events, decisions, releases, snapshots, worksById);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(ASSETS, join(OUT, 'assets'), { recursive: true });
await cp(join(dirname(fileURLToPath(import.meta.resolve('siso-shell'))), 'shell'), join(OUT, 'assets/siso-shell'), { recursive: true });
await emit('docs/agent-stack-model.html', await readFile(join(ROOT, 'docs', 'agent-stack-model.html'), 'utf8'));
await emit('docs/agent-base-decomposition.html', await readFile(join(ROOT, 'docs', 'agent-base-decomposition.html'), 'utf8'));
await emit('docs/agent-base-module-map.html', await readFile(join(ROOT, 'docs', 'agent-base-module-map.html'), 'utf8'));
await emit('docs/agents-workspace-layout.html', await readFile(join(ROOT, 'docs', 'agents-workspace-layout.html'), 'utf8'));
await emit('docs/skills-repository-map.html', await readFile(join(ROOT, 'docs', 'skills-repository-map.html'), 'utf8'));
await emit('docs/task-state-system-map.html', await readFile(join(ROOT, 'docs', 'task-state-system-map.html'), 'utf8'));
await emit('docs/siso-knowledge-model.html', await readFile(join(ROOT, 'docs', 'siso-knowledge-model.html'), 'utf8'));
await emit('docs/research-question-model.html', await readFile(join(ROOT, 'docs', 'research-question-model.html'), 'utf8'));
await emit('docs/siso-mission.html', await readFile(join(ROOT, 'docs', 'siso-mission.html'), 'utf8'));
await emit('docs/question-driven-research.html', await readFile(join(ROOT, 'docs', 'question-driven-research.html'), 'utf8'));
await emit('docs/frontier-question-template.html', await readFile(join(ROOT, 'docs', 'frontier-question-template.html'), 'utf8'));
await emit('docs/god-questions-infrastructure.html', await readFile(join(ROOT, 'docs', 'god-questions-infrastructure.html'), 'utf8'));
await emit('docs/estate-reconciliation.html', await readFile(join(ROOT, 'docs', 'estate-reconciliation.html'), 'utf8'));
await emit('docs/onboarding.html', await readFile(join(ROOT, 'docs', 'onboarding.html'), 'utf8'));
await emit('docs/agent-capability-promotion.html', await readFile(join(ROOT, 'docs', 'agent-capability-promotion.html'), 'utf8'));
await emit('docs/foundry-agency-intelligence.html', await readFile(join(ROOT, 'docs', 'foundry-agency-intelligence.html'), 'utf8'));
await emit('docs/ecosystem-intelligence.html', await readFile(join(ROOT, 'docs', 'ecosystem-intelligence.html'), 'utf8'));
await emit('docs/100-million-token-program.html', await readFile(join(ROOT, 'docs', '100-million-token-program.html'), 'utf8'));
await emit('docs/100-million-token-operating-plan.html', await readFile(join(ROOT, 'docs', '100-million-token-operating-plan.html'), 'utf8'));
await emit('docs/laptop-estate.html', await readFile(join(ROOT, 'docs', 'laptop-estate.html'), 'utf8'));
await emit('docs/registry-model.md', await readFile(join(ROOT, 'docs', 'registry-model.md'), 'utf8'));
await emit('docs/using-the-library.md', await readFile(join(ROOT, 'docs', 'using-the-library.md'), 'utf8'));
await emit('docs/gls.md', await readFile(join(ROOT, 'docs', 'gls.md'), 'utf8'));
await emit('docs/library-ui-integration.md', await readFile(join(ROOT, 'docs', 'library-ui-integration.md'), 'utf8'));
await emit('index.html', homePage(works, releases, snapshots, assemblies, sections));
const projectTasks = (await readTasks(ROOT)).map(task => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, source_file: task.source_file, description: task.spec?.description || null, acceptance_criteria: task.spec?.acceptance_criteria || [], latest_observation: task.execution_log?.length ? { timestamp: task.execution_log.at(-1).timestamp, action: task.execution_log.at(-1).action } : null }));
await emit('use/index.html', usePage(works, projectTasks));
await emit('tasks.json', JSON.stringify({ projection: 'Read-only build projection of canonical .agents/tasks records; not live runtime state.', tasks: projectTasks }, null, 2) + '\n');
for (const task of projectTasks) await emit(`tasks/${task.id}.json`, JSON.stringify(task, null, 2) + '\n');
await emit('404.html', page({ title: 'Page not found', description: 'This route has no Library record or reader.', rootClass: 'industry-page', body: `<section class="subhero shell">${eyebrow('Library / 404')}<div><h1>Page not found.</h1><p>This URL has no reader in this build. A missing route is not an accepted Work, a JSON dossier or a deployment receipt.</p><p><a href="${href('#catalog')}">Find a Work in the catalog</a> · <a href="${href('use/')}">Use the Library</a></p></div></section>` }));
await emit('llms.txt', `# The Great Library of SISO\n\nPublic registry and reading surface; independent source repositories retain their ownership and execution boundaries.\n\nStart: ${href('use/')}\nMachine catalog: ${href('catalog.json')}\nSource-selected Snapshot in this build: ${latestSnapshot.id} (${latestSnapshot.version})\n\nFrom a checkout with Node 20:\n- node bin/gls search "agent runtime"\n- node bin/gls inspect siso-agent-base\n- node bin/gls tasks\n- node bin/gls task TASK-0007\n\nEach catalog match gives its stable identity, selection state, source visibility, owner entry and dossier URL. Read one relevant dossier, then the owning source instructions. Missing reviewed commands remain missing; do not infer a runnable or public payload. Read commands verify local projection freshness and do not mutate or publish.\n\nContribution contract: ${href('docs/gls.md')}\nOwner/coordination observations: ${href('intelligence.json')}\nRegistry model: ${href('docs/registry-model.md')}\n\nWorks identify things. Releases preserve exact evidence. Snapshots select versions. Assemblies describe contextual composition. Source Inventories hold candidates. Registration, selection, installation, admission and live deployment are separate states. Runtime presence is not inferred from an Event.\n`);
await buildIndustries({ root: ROOT, page, emit, esc, href, selectedRelease: activeReleasesByWork.get('gls:work:ec664d93-df93-48c5-be40-5d0165886c01') });
await emit('_headers', ['/industries/*', '/valuation/*', '/works/siso-foundry/index.json', '/catalog.json'].map(route => `${route}\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=0, must-revalidate\n`).join('\n'));
const agentsSection = sections.find((section) => section.slug === 'agents');
const researchSection = sections.find((section) => section.slug === 'research');
await emit('agents/index.html', agentsPage(works, assemblies, latestSnapshot, agentsSection));
await emit('promotion/index.html', promotionPage(promotion));
await emit('intelligence/index.html', intelligencePage(intelligence));
if (researchSection) {
  await emit('research/index.html', researchPage(works, latestSnapshot, researchSection, activeReleasesByWork, sourceAsOfDate));
  await emit('research.json', `${JSON.stringify({ generated_at: generatedAt, base_path: BASE, ...buildResearchProjection(works, latestSnapshot, researchSection, activeReleasesByWork, sourceAsOfDate) }, null, 2)}\n`);
}
await emit('releases/index.html', releaseIndex(releases, worksById));
await emit('snapshots/index.html', snapshotIndex(snapshots));
await emit('estate/index.html', estatePage(repositoryEstate, latestSnapshot));
await emit('estate.json', `${JSON.stringify({ generated_at: generatedAt, snapshot_id: latestSnapshot?.id || null, snapshot_version: latestSnapshot?.version || null, repositories: repositoryEstate }, null, 2)}\n`);
await emit('promotion.json', `${JSON.stringify({ generated_at: generatedAt, base_path: BASE, ...promotion }, null, 2)}\n`);
await emit('intelligence.json', `${JSON.stringify({ generated_at: generatedAt, base_path: BASE, ...intelligence }, null, 2)}\n`);
for (const work of works) {
  const projection = workProjection(work, releases, worksById, activeReleasesByWork.get(work.id));
  await emit(`works/${work.slug}/index.html`, workPage(work, releases, worksById, activeReleasesByWork.get(work.id), sourceAsOfDate));
  await emit(`works/${work.slug}/index.json`, `${JSON.stringify(projection, null, 2)}\n`);
}
const sourceInputs = await Promise.all([...(await jsonFiles(join(ROOT, 'registry'))).map(file => relative(ROOT, file)), 'scripts/build.mjs', 'scripts/build-industries.mjs', 'package.json', 'package-lock.json'].sort().map(async path => ({ path, sha256: createHash('sha256').update(await readFile(join(ROOT, path))).digest('hex') })));
await emit('catalog.json', `${JSON.stringify({ generated_at: generatedAt, base_path: BASE, snapshot: { id: latestSnapshot?.id || null, version: latestSnapshot?.version || null, registry_source: latestSnapshot?.__file || null }, source_inputs: sourceInputs, works: works.map(work => { const dossier = workProjection(work, releases, worksById, activeReleasesByWork.get(work.id)); return { id: work.id, slug: work.slug, name: work.name, summary: work.summary, library_url: dossier.library_url, agent_context_url: dossier.agent_context_url, type: work.type, maturity: work.maturity, section: work.section, source_links: work.links, selection: dossier.selection, selected_release: dossier.selected_release, owner_entry: dossier.owner_entry }; }), repositories: repositoryEstate, assemblies: assemblies.map(({ __file, ...assembly }) => assembly), source_inventories: sourceInventories.map(({ __file, ...inventory }) => inventory), promotion, intelligence: { counts: intelligence.counts, active_initiatives: intelligence.active_initiatives } }, null, 2)}\n`);

console.log(`Built ${works.length} Works, ${releases.length} Releases, ${repositoryEstate.length} Repositories, ${assemblies.length} Assemblies, ${sourceInventories.length} Source Inventories, ${snapshots.length} Snapshots, ${decisions.length} Decisions, and ${events.length} Events at ${BASE}`);
