import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepare, inspect, record, sha256, gitBlob, shape, loadQuestions, prompt } from '../scripts/frontier.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const scratch = mkdtempSync(join(realpathSync(tmpdir()), 'frontier-test-'));
const now = new Date('2026-09-07T10:00:00.000Z');
let passed = 0;
const clone = x => structuredClone(x);
const json = x => `${JSON.stringify(x, null, 2)}\n`;
const use = () => ({tool_calls:1,source_reads:1,cash_minor:0,tokens:null,elapsed_seconds:null});
function fixture() {
  const root = mkdtempSync(join(scratch, 'case-'));
  mkdirSync(join(root,'registry/works'),{recursive:true});
  writeFileSync(join(root,'package.json'),json({name:'great-library-of-siso'}));
  for (const [id,slug] of [['014','frontier-question-gq-014'],['023','frontier-question-gq-023'],['011','siso-unsolveable-mathematics']]) {
    writeFileSync(join(root,'registry/works',`${slug}.json`),json({id:`gls:work:00000000-0000-4000-8000-000000000${id}`,name:`Fixture ${id}`,work_type:'research_question',research_contract:{question_id:`GQ-${id}`,question:`Synthetic question ${id}?`,state:'scoped',publication_boundary:'public_metadata_only',evidence_gaps:['Synthetic gap'],success_criteria:['Synthetic criterion']}}));
  }
  const brief = {schema_version:'frontier-brief-1',task_ref:'task:synthetic-pilot',decision_owner:'fixture-owner',authorization_ref:'authorization:synthetic-only',objective:'Compare two fixture alternatives',baseline:'The baseline is not yet tested',alternatives:['Keep existing method','Use a bounded packet'],acceptance:['All exact pins survive cold recovery'],stop_conditions:['Stop on changed scope'],source_scopes:['Synthetic repository metadata'],allowed_tools:['read_source'],allowed_effects:['source_read','local_artifacts'],caps:{tool_calls:30,source_reads:20,cash_minor:0},currency:'USD',expires_at:'2026-09-08T10:00:00.000Z',next_action_on_stop:'Return the exact blocker to the task owner'};
  const run=join(root,'.local/frontier/attempt');
  prepare(root,'GQ-014',brief,run,now);
  return {root,run,brief};
}
function research() {
  return {schema_version:'frontier-step-1',phase:'research',actor:'fixture-researcher',session:'session-a',usage:use(),artifacts:[],payload:{sources:[{id:'S1',reference:'https://example.org/research',span:'Synthetic fixture section',revision:'synthetic-v1',observed_at:now.toISOString(),independence_group:'fixture-family',rights_state:'public_metadata',summary:'Synthetic source; not research evidence'}],claims:[{id:'C1',statement:'The fixture has an exact source pointer',kind:'observation',supports:['S1'],challenges:[],limitation:'Synthetic structural test only',falsifier:'The source pointer does not resolve in the fixture'}],coverage_gaps:['No real decision was evaluated'],next_discriminating_test:'Run a cold-reader pilot'}};
}
function critique(head,verdict='pass',independence='separate_context') {
  return {schema_version:'frontier-step-1',phase:'critique',actor:'fixture-reviewer',session:'session-b',usage:use(),artifacts:[],payload:{target_sha256:head,verdict,independence,findings:['Synthetic review; independence is not authenticated'],counterevidence_search:'Tested a missing-reference counterexample'}};
}
function append(f,step) {return record(f.root,f.run,step,inspect(f.root,f.run,now).head_sha256,now);}
function check(name,fn) {try {fn();passed++;console.log(`PASS ${name}`);}catch(e){console.error(`FAIL ${name}: ${e.message}`);throw e;}}
try {
  check('exact Git blob hashing',()=>assert.equal(gitBlob(Buffer.from('hello\n')),'ce013625030ba8dba906f756967f9e9ca394464a'));
  check('linked mathematics and compute are distinct',()=>{const f=fixture();assert.deepEqual(loadQuestions(f.root).map(x=>x.question_id),['GQ-011','GQ-014','GQ-023']);assert.throws(()=>prepare(f.root,'GQ-011',f.brief,join(f.root,'.local/frontier/math'),now),/UNSOLVEABLE/);});
  check('missing IDs are not silently invented',()=>{const f=fixture();assert.throws(()=>prepare(f.root,'GQ-020',f.brief,join(f.root,'.local/frontier/missing'),now),/not present/);});
  check('prepare writes no canonical state',()=>{const f=fixture(),dir=join(f.root,'registry/works');const before=readdirSync(dir).map(n=>sha256(readFileSync(join(dir,n))));append(f,research());assert.deepEqual(readdirSync(dir).map(n=>sha256(readFileSync(join(dir,n)))),before);});
  check('existing run is never overwritten',()=>{const f=fixture();assert.throws(()=>prepare(f.root,'GQ-014',f.brief,f.run,now),/never overwritten/);});
  check('public directory output is refused',()=>{const f=fixture();assert.throws(()=>prepare(f.root,'GQ-014',f.brief,join(f.root,'public-run'),now),/outside the repository/);});
  check('expired brief is rejected',()=>{const f=fixture();assert.throws(()=>prepare(f.root,'GQ-014',f.brief,join(f.root,'.local/frontier/late'),new Date('2026-09-09T00:00:00Z')),/future UTC/);});
  check('invalid calendar date is rejected',()=>{const f=fixture(),b=clone(f.brief);b.expires_at='2026-09-31T10:00:00.000Z';assert.throws(()=>prepare(f.root,'GQ-014',b,join(f.root,'.local/frontier/date'),now),/future UTC/);});
  check('unknown brief field fails closed',()=>{const f=fixture(),b={...f.brief,run_forever:true};assert.throws(()=>prepare(f.root,'GQ-014',b,join(f.root,'.local/frontier/extra'),now),/unknown field/);});
  check('no deployment effect can be granted',()=>{const f=fixture(),b=clone(f.brief);b.allowed_effects[1]='deploy';assert.throws(()=>prepare(f.root,'GQ-014',b,join(f.root,'.local/frontier/deploy'),now),/enumeration/);});
  check('symlink output is refused',()=>{const f=fixture();symlinkSync(join(f.root,'.local/frontier'),join(f.root,'alias'));assert.throws(()=>prepare(f.root,'GQ-014',f.brief,join(f.root,'alias/new'),now),/Symlink/);});
  check('cold reconstruction yields researcher then critic',()=>{const f=fixture();assert.equal(inspect(f.root,f.run,now).next_phase,'research');assert.equal(append(f,research()).next_phase,'critique');assert.match(prompt(inspect(f.root,f.run,now)),/untrusted evidence/);});
  check('recovery prompt does not reload obsolete research payloads',()=>{const f=fixture(),r=research();r.payload.coverage_gaps=['OLD_PAYLOAD_MUST_NOT_RELOAD'];let s=append(f,r);s=append(f,critique(s.head_sha256,'revise'));s=append(f,research());const text=prompt(s);assert.doesNotMatch(text,/OLD_PAYLOAD_MUST_NOT_RELOAD/);assert.match(text,/Prior receipt index/);assert.match(text,/Never imply omitted history was reviewed/);});
  check('oversized context requires bounded source windows',()=>{const f=fixture(),s=inspect(f.root,f.run,now);s.packet.brief.objective='x'.repeat(131072);assert.throws(()=>prompt(s),/128 KiB/);});
  check('stale writer rejected without changing history',()=>{const f=fixture(),head=inspect(f.root,f.run,now).head_sha256;append(f,research());assert.throws(()=>record(f.root,f.run,research(),head,now),/Stale writer/);assert.equal(inspect(f.root,f.run,now).history.length,1);});
  check('lock protects concurrent writers',()=>{const f=fixture();writeFileSync(join(f.run,'.writer.lock'),'synthetic lock');assert.throws(()=>append(f,research()),/EEXIST/);assert.equal(readFileSync(join(f.run,'.writer.lock'),'utf8'),'synthetic lock');});
  check('source record drift prevents silent resume',()=>{const f=fixture(),path=join(f.root,'registry/works/frontier-question-gq-014.json');writeFileSync(path,readFileSync(path,'utf8')+'\n');assert.throws(()=>inspect(f.root,f.run,now),/drifted/);});
  check('packet edits invalidate existing receipts',()=>{const f=fixture();append(f,research());const p=join(f.run,'packet.json'),v=JSON.parse(readFileSync(p));v.brief.objective='Altered objective';writeFileSync(p,json(v));assert.throws(()=>inspect(f.root,f.run,now),/lineage/);});
  check('receipt edits break the hash chain',()=>{const f=fixture();const s=append(f,research());append(f,critique(s.head_sha256));const p=join(f.run,'receipts/000001.json'),v=JSON.parse(readFileSync(p));v.step.payload.coverage_gaps=['Changed gap'];writeFileSync(p,json(v));assert.throws(()=>inspect(f.root,f.run,now),/lineage/);});
  check('partial receipt files are not ignored',()=>{const f=fixture();writeFileSync(join(f.run,'receipts/partial.tmp'),'partial');assert.throws(()=>inspect(f.root,f.run,now),/Unexpected/);});
  check('skipping a phase is refused',()=>{const f=fixture();assert.throws(()=>append(f,critique('0'.repeat(64))),/phase/);});
  check('source support must resolve',()=>{const f=fixture(),r=research();r.payload.claims[0].supports=['missing'];assert.throws(()=>append(f,r),/unknown source/);});
  check('observation without support fails',()=>{const f=fixture(),r=research();r.payload.claims[0].supports=[];assert.throws(()=>append(f,r),/cited support/);});
  check('duplicate evidence is not independent corroboration',()=>{const f=fixture(),r=research();r.payload.sources.push(clone(r.payload.sources[0]));assert.throws(()=>append(f,r),/Duplicate source/);});
  check('future source observations fail',()=>{const f=fixture(),r=research();r.payload.sources[0].observed_at='2026-09-08T10:00:00.000Z';assert.throws(()=>append(f,r),/future/);});
  check('query-bearing locators are refused',()=>{const f=fixture(),r=research();r.payload.sources[0].reference='https://example.org/source?session=synthetic';assert.throws(()=>append(f,r),/query-free/);});
  check('non-HTTPS source locators fail',()=>{const f=fixture(),r=research();r.payload.sources[0].reference='file:synthetic';assert.throws(()=>append(f,r),/HTTPS/);});
  check('same-session independent review fails',()=>{const f=fixture(),s=append(f,research()),c=critique(s.head_sha256);c.session='session-a';assert.throws(()=>append(f,c),/shared session/);});
  check('external self-review fails',()=>{const f=fixture(),s=append(f,research()),c=critique(s.head_sha256,'pass','external_review');c.actor='fixture-researcher';assert.throws(()=>append(f,c),/external self-review/);});
  check('revision asks for another bounded research step',()=>{const f=fixture(),s=append(f,research());assert.equal(append(f,critique(s.head_sha256,'revise')).next_phase,'research');});
  check('review targets exact prior evidence',()=>{const f=fixture();append(f,research());assert.throws(()=>append(f,critique('a'.repeat(64))),/stale receipt/);});
  check('unknown capped cost is not free',()=>{const f=fixture(),r=research();r.usage.cash_minor=null;const s=append(f,r);assert.equal(s.accounting.totals.cash_minor,null);assert.equal(s.next_phase,'blocked');assert.ok(s.blockers.includes('unknown_capped_usage'));});
  check('overrun is preserved then stops further work',()=>{const f=fixture(),r=research();r.usage.tool_calls=31;const s=append(f,r);assert.equal(s.next_phase,'blocked');assert.equal(s.history.length,1);assert.ok(s.blockers.includes('resource_cap_exceeded'));assert.throws(()=>append(f,critique(s.head_sha256)),/blocked/);});
  check('expiry stops inference but allows a blocker return',()=>{const f=fixture();const later=new Date('2026-09-09T00:00:00Z');const s=inspect(f.root,f.run,later);assert.equal(s.next_phase,'blocked');const b={schema_version:'frontier-step-1',phase:'blocked',actor:'fixture-owner',session:'stop',usage:{tool_calls:0,source_reads:0,cash_minor:0,tokens:0,elapsed_seconds:0},artifacts:[],payload:{reason:'Expired fixture authorization',next_action:'Ask the owner for a successor mandate'}};assert.equal(record(f.root,f.run,b,s.head_sha256,later).state,'blocked');});
  check('schema subset rejects unsupported keywords',()=>assert.throws(()=>shape({}, {type:'object',made_up:true}),/Unsupported/));
  check('full synthetic handoff is not an accepted answer',()=>{
    const f=fixture();let s=append(f,research());s=append(f,critique(s.head_sha256));
    const report='Synthetic candidate report. No real-world result.\n';writeFileSync(join(f.run,'artifacts/report.md'),report);
    const synth={schema_version:'frontier-step-1',phase:'synthesis',actor:'fixture-researcher',session:'session-c',usage:use(),artifacts:[{path:'artifacts/report.md',sha256:sha256(report),purpose:'Synthetic candidate only'}],payload:{target_sha256:s.head_sha256,disposition:'inconclusive',conclusion:'The fixture passes structural checks only',claim_ids:['C1'],limitations:['No independent real research or runtime acceptance'],next_action:'Run an owner-approved cold-reader evaluation'}};
    s=append(f,synth);assert.equal(s.next_phase,'handoff');
    const hand={schema_version:'frontier-step-1',phase:'handoff',actor:'fixture-owner',session:'session-d',usage:use(),artifacts:[],payload:{target_sha256:s.head_sha256,owner:f.brief.decision_owner,task_ref:f.brief.task_ref,next_action:'Evaluate the fixture method',blocker:'No real operator result',publication:'not_published'}};
    s=append(f,hand);assert.equal(s.state,'handed_off');assert.equal(s.acceptance,'not_adjudicated');assert.equal(s.publication,'not_published');assert.throws(()=>append(f,research()),/terminal/);
    writeFileSync(join(f.run,'artifacts/report.md'),'Changed after citation');assert.throws(()=>inspect(f.root,f.run,now),/digest mismatch/);
  });
  check('CLI has working help and rejects misspelled options',()=>{
    const file=resolve(HERE,'../scripts/frontier.mjs');
    const good=spawnSync(process.execPath,[file,'--help'],{encoding:'utf8'});assert.equal(good.status,0);assert.match(good.stdout,/offline/);
    const bad=spawnSync(process.execPath,[file,'questions','--roo','x'],{encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/Unknown/);
  });
  check('actual checkout contracts retain linked identity and compile unchanged',()=>{
    const root=resolve(HERE,'..');
    if (!readFileSync(join(root,'package.json'),'utf8').includes('great-library-of-siso')) throw new Error('Tests must run in the intended source layout');
    const qs=loadQuestions(root),ids=qs.map(q=>q.question_id);
    assert.ok(ids.includes('GQ-011')&&ids.includes('GQ-023'));assert.equal(new Set(ids).size,ids.length);
    const before=qs.map(q=>q.blob_sha);
    for (const q of qs) assert.equal(q.blob_sha,gitBlob(readFileSync(join(root,q.path))));
    assert.deepEqual(loadQuestions(root).map(q=>q.blob_sha),before);
  });
  console.log(`\n${passed} Frontier checks passed. Structural fixtures are not independent research or runtime acceptance.`);
} finally { rmSync(scratch,{recursive:true,force:true}); }
