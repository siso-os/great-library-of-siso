import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export async function buildIndustries({ root, page, emit, esc, href, selectedRelease }) {
  const base = join(root, 'research/industries');
  const manifest = JSON.parse(await readFile(join(base, 'manifest.json'), 'utf8'));
  if (selectedRelease?.id !== manifest.release_id || !selectedRelease.raw.artifacts.some(a => a.revision === manifest.source_commit)) throw new Error('Industry projection must match the selected Foundry Release');
  const sources = new Map();
  for (const item of manifest.files) {
    if (!/^source\/(?:intelligence\/agency\/(?:industries\/[a-z_]+|economics\/[a-z-]+)\.json|LICENSE)$/.test(item.local_file)) throw new Error('Invalid source-mirror path');
    const bytes = await readFile(join(base, item.local_file));
    if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error(`Source drift: ${item.path}`);
    const expected = `https://raw.githubusercontent.com/sisodias/siso-foundry/${manifest.source_commit}/${item.path}`;
    if (item.source_url !== expected) throw new Error('Unpinned source URL');
    sources.set(item.path, { ...item, bytes, record: item.path.endsWith('.json') ? JSON.parse(bytes) : null });
  }
  const records = [...sources.values()].filter(s => s.path.startsWith('intelligence/agency/industries/'));
  if (records.length !== 17 || new Set(records.map(s => s.record.industry_id)).size !== 17) throw new Error('Expected the reviewed 17-record source');
  const meta = { schema_version: '1.0.0', canonical_work_id: manifest.canonical_work_id, release_id: manifest.release_id, source_commit: manifest.source_commit, source_repository: manifest.source_repository, source_owner: 'Foundry', projection_owner: 'Great Library of SISO', as_of: manifest.source_date };
  const sourceLink = s => `<a href="${esc(s.source_url)}" rel="noopener noreferrer">Pinned Foundry source</a>`;
  const boundary = `<p class="industry-note">Research dated ${esc(manifest.source_date)}. Business value remains unmeasured. Software descriptions are documented capabilities; each project must verify fit, rights and outcomes before adoption.</p>`;
  const links = `<div role="group" class="industry-links" aria-label="Research navigation"><a href="${href('industries/')}">All industries</a><a href="${href('valuation/')}">Code valuation</a><a href="${href('works/siso-foundry/')}">Foundry</a><a href="${href('industries/index.json')}">Project / agent JSON</a></div>`;
  const shell = (title, summary, body) => page({ title, active: 'research', description: summary, rootClass: 'industry-page', body: `<section class="subhero shell"><div><p class="eyebrow">Foundry research · Great Library of SISO</p><h1>${esc(title)}</h1><p>${esc(summary)}</p>${links}</div></section><div class="shell industry-content">${body}</div>` });
  const cards = records.map(({ record: r }) => `<a class="industry-card" href="${href(`industries/${r.industry_id}/`)}"><span class="eyebrow">${esc(r.processes.length)} processes · ${esc(r.modules.length)} candidate modules</span><h2>${esc(r.industry_name)}</h2><p>${esc(r.summary)}</p><span>Read the research →</span></a>`).join('');
  await emit('industries/index.html', shell('Industry Value Index', 'What could be automated, what software already exists, and what would prove it valuable.', `${boundary}<div class="industry-grid">${cards}</div><section class="industry-panel"><h2>Use this from any project</h2><p>Foundry owns the source. This Library view is generated from one exact release. Use the <a href="${href('industries/index.json')}">JSON index</a> to find record URLs, source URLs and SHA-256 receipts. Keep each record’s jurisdiction, human authority, sources and missing values attached.</p><p>Canonical Work: <code>${esc(manifest.canonical_work_id)}</code></p><p>Source revision: <code>${esc(manifest.source_commit)}</code></p><a href="${href('industries/source-license.txt')}">Imported source licence</a></section>`));
  const index = [];
  for (const s of records) {
    const r = s.record;
    if (r.status !== 'research_only_not_admitted' || r.observed_business_value.annual_net_cash !== null || r.processes.some(p => p.value.annual_net_cash !== null)) throw new Error('Unreviewed industry value claim');
    const sourceIds = new Set(r.sources.map(x => x.id));
    if (r.processes.some(p => p.source_ids.some(id => !sourceIds.has(id)))) throw new Error('Dangling source');
    const refs = ids => ids.map(id => `<a href="#source-${esc(id)}">[${esc(id)}]</a>`).join(' ');
    const processes = r.processes.map(p => `<article class="industry-panel"><h3>${esc(p.process)}</h3><p>${esc(p.automation_boundary)}</p><dl><dt>Measure</dt><dd>${esc(p.metric)}</dd><dt>Reject the idea if</dt><dd>${esc(p.falsifier)}</dd><dt>Human authority</dt><dd>${esc(p.human_authority)}</dd></dl><p>${refs(p.source_ids)}</p></article>`).join('');
    const software = r.software.map(v => `<article class="industry-panel"><h3>${esc(v.name)}</h3><p>${esc(v.capability)}</p><p>${esc(v.price_note)}</p><p>${refs(v.source_ids)}</p></article>`).join('');
    const modules = r.modules.map(m => `<article class="industry-panel"><h3>${esc(m.repository)}</h3><p>${esc(m.capability)}</p><dl><dt>Possible reuse</dt><dd>${esc(m.reuse_shape)}</dd><dt>Limits</dt><dd>${esc(m.limits)}</dd><dt>Rights</dt><dd>${esc(m.rights_state)}</dd></dl><p>${refs(m.source_ids)}</p><p class="industry-meta">Revision: ${esc(m.source_revision)}</p></article>`).join('');
    const citations = r.sources.map(x => { const url = new URL(x.url); if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid evidence URL'); return `<li id="source-${esc(x.id)}"><a href="${esc(x.url)}" rel="noopener noreferrer">${esc(x.title)}</a> · ${esc(x.publisher)}<p>${esc(x.note)}</p></li>`; }).join('');
    const body = `${boundary}<p>${esc(r.jurisdiction)}</p><section><h2>What the evidence supports</h2><p>${esc(r.automation_research.finding)}</p><p>${refs(r.automation_research.source_ids)}</p></section><section><h2>Processes to test</h2>${processes}</section><section><h2>Existing software</h2><div class="industry-grid">${software}</div></section><section><h2>Reusable code candidates</h2><div class="industry-grid">${modules}</div></section><section class="industry-panel"><h2>Business value and a falsifiable pilot</h2><p>${esc(r.observed_business_value.reason)}</p><p>${esc(r.pilot.design)}</p><ul>${r.pilot.reject_if.map(v => `<li>${esc(v)}</li>`).join('')}</ul><a href="${href('valuation/')}">Read the shared value model</a></section><section><h2>Limits</h2><ul>${r.limitations.map(v => `<li>${esc(v)}</li>`).join('')}</ul></section><section><h2>Sources</h2><ol>${citations}</ol></section><section class="industry-panel"><h2>Canonical source and machine access</h2><p>${sourceLink(s)} · <a href="${href(`industries/${r.industry_id}/index.json`)}">Record JSON</a></p><p class="industry-meta">SHA-256: ${esc(s.sha256)}</p></section>`;
    await emit(`industries/${r.industry_id}/index.html`, shell(r.industry_name, r.summary, body));
    await emit(`industries/${r.industry_id}/index.json`, s.bytes);
    index.push({ industry_id: r.industry_id, name: r.industry_name, status: r.status, processes: r.processes.length, page_url: href(`industries/${r.industry_id}/`), json_url: href(`industries/${r.industry_id}/index.json`), source_url: s.source_url, sha256: s.sha256 });
  }
  await emit('industries/index.json', JSON.stringify({ ...meta, record_type: 'industry_value_index', count: index.length, records: index, valuation_url: href('valuation/index.json') }, null, 2) + '\n');
  await emit('industries/source-license.txt', sources.get('LICENSE').bytes);
  const modelSource = sources.get('intelligence/agency/economics/observed-value-model.json');
  const inputsSource = sources.get('intelligence/agency/economics/repo-value-inputs.json');
  const model = modelSource.record, inputs = inputsSource.record;
  if (inputs.cards.length !== 10 || inputs.cards.some(c => Object.values(c.inputs).some(v => v.value !== null))) throw new Error('Unreviewed value inputs');
  const examples = inputs.cards.map(c => `<article class="industry-panel"><h2>${esc(c.repository)}</h2><p>${esc(c.process)}</p><p>${esc(c.mechanism)}</p><p><strong>Value: unmeasured</strong> · Evidence gates: ${Object.values(c.evidence_gates).filter(Boolean).length}/${model.evidence_gates.length}</p><p>${esc(c.rights_state)}</p><p class="industry-meta">Revision: ${esc(c.source_revision)}</p><details><summary>Missing evidence and source references</summary><ul>${Object.entries(c.evidence_gates).filter(([, ok]) => !ok).map(([name]) => `<li>${esc(name.replaceAll('_', ' '))}</li>`).join('')}</ul><ul>${c.source_references.map(ref => `<li>${esc(ref)}</li>`).join('')}</ul></details></article>`).join('');
  const formulas = Object.entries(model.formulas).map(([name, formula]) => `<dt>${esc(name.replaceAll('_', ' '))}</dt><dd>${esc(formula)}</dd>`).join('');
  await emit('valuation/index.html', shell('What reusable code is worth', 'A falsifiable value model and ten repository examples, with the missing measurements kept visible.', `${boundary}<section class="industry-panel"><h2>The model</h2><p>${esc(model.missing_data_policy)}</p><dl>${formulas}</dl></section><section><h2>Ten existing repository examples</h2><div class="industry-grid">${examples}</div></section><section class="industry-panel"><h2>When to reject a value claim</h2><ul>${model.falsifiers.map(v => `<li>${esc(v)}</li>`).join('')}</ul><p>${sourceLink(modelSource)} · ${sourceLink(inputsSource)}</p><p><a href="${href('valuation/index.json')}">Project / agent JSON</a> · <a href="${href('valuation/model.json')}">Model JSON</a> · <a href="${href('valuation/inputs.json')}">Input records JSON</a></p></section>`));
  await emit('valuation/model.json', modelSource.bytes);
  await emit('valuation/inputs.json', inputsSource.bytes);
  await emit('valuation/index.json', JSON.stringify({ ...meta, record_type: 'observed_value_research_index', count: inputs.cards.length, measured_values: false, model: { url: href('valuation/model.json'), source_url: modelSource.source_url, sha256: modelSource.sha256 }, inputs: { url: href('valuation/inputs.json'), source_url: inputsSource.source_url, sha256: inputsSource.sha256 } }, null, 2) + '\n');
  return { industries: records.length, valuation_examples: inputs.cards.length };
}
