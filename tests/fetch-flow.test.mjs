import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { unitKey, isCancelled, sameRun, mergeWorkerJob, compareJob } from '../src/fetch-job.js';
import { toISODate, replaceConsumptionPeriod } from '../src/consumption-store.js';
import { watchFetchJob } from '../src/fetch-progress.js';

// Execute the actual API against an in-memory PostgREST adapter, never live data.
function apiHarness(initial, { conflicts = 0, writeError = null } = {}) {
  let stored = initial ? { value: JSON.stringify(initial) } : null;
  let updates = 0;
  const supabase = { from(table) {
    let op, payload, filters = [], oversized = false;
    const query = {
      select() { return query; }, eq(k, v) { filters.push([k, v]); if (k === 'value' && encodeURIComponent(v).length > 8000) oversized = true; return query; },
      filter(k, op, pattern) { assert.equal(op, 'match'); assert.ok(encodeURIComponent(pattern).length < 8000); filters.push(['regex', new RegExp(pattern)]); return query; },
      maybeSingle() { return Promise.resolve({ data: stored, error: null }); },
      update(p) { op = 'update'; payload = p; return query; },
      upsert(p) { op = 'upsert'; payload = p; return query; },
      then(resolve, reject) {
        if (table === 'tata_locations') return Promise.resolve({ data: [{ location_name: 'NARWAL' }] }).then(resolve, reject);
        if (oversized) return Promise.resolve({error: new Error('Bad Request')}).then(resolve, reject);
        if (writeError) return Promise.resolve({ error: { message: writeError } }).then(resolve, reject);
        if (op === 'update') {
          updates++;
          if (conflicts-- > 0) return Promise.resolve({ data: [] }).then(resolve, reject);
          if (!filters.every(([k, v]) => k === 'regex' ? v.test(stored?.value) : k === 'key' || stored?.[k] === v)) return Promise.resolve({ data: [] }).then(resolve, reject);
        }
        if (op) stored = { value: payload.value };
        return Promise.resolve({ data: stored ? [stored] : [], error: null }).then(resolve, reject);
      },
    };
    return query;
  } };
  let source = readFileSync(new URL('../api/_server.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replaceAll('export async function ', 'async function ')
    .replaceAll('export function ', 'function ').replace('export default async function handler', 'async function handler');
  const context = vm.createContext({ supabase, randomUUID, unitKey, isCancelled, compareJob, toISODate, console, Date, Set, process: { env: {} } });
  vm.runInContext(source, context);
  return { context, job: () => JSON.parse(stored.value), updates: () => updates };
}
const inventory = { kind: 'inventory', location: 'NARWAL', status: 'pending', attempts: 0 };
const consumption = { kind: 'consumption', fromDate: '09/01/2026', toDate: '09/30/2026', status: 'done', attempts: 1 };
const run = (units, status = 'pending') => ({ id: 'run-1', status, queue: { units, createdAt: '2026-10-01T00:00:00Z' }, logs: '' });

test('a submission merges with a pending job rather than deleting inventory', async () => {
  const h = apiHarness(run([inventory]));
  await h.context.startOrMergeJob({ type: 'consumption', fromDate: '10/01/2026', toDate: '10/20/2026' });
  assert.equal(h.job().queue.units.length, 2);
  assert.equal(h.job().status, 'pending');
  assert.equal(h.job().id, 'run-1');
});
test('consumption requests with different dates retain their own ranges', async () => {
  const h = apiHarness(run([consumption, inventory], 'processing'));
  await h.context.startOrMergeJob({ type: 'consumption', fromDate: '10/01/2026', toDate: '10/20/2026' });
  const pending = h.job().queue.units.find(u => u.kind === 'consumption' && u.status === 'pending');
  assert.equal(pending.fromDate, '10/01/2026');
  assert.equal(h.job().queue.units[0].status, 'done');
});
test('same range can be rearmed and pending duplicates are not added', async () => {
  const h = apiHarness(run([consumption, inventory], 'processing'));
  const spec = { type: 'consumption', fromDate: consumption.fromDate, toDate: consumption.toDate };
  await h.context.startOrMergeJob(spec);
  await h.context.startOrMergeJob(spec);
  assert.equal(h.job().queue.units.length, 2);
  assert.equal(h.job().queue.units[0].attempts, 0);
  assert.ok(h.job().queue.units[0].requestedAt);
});
test('queue retries a lost CAS update', async () => {
  const h = apiHarness(run([inventory]), { conflicts: 1 });
  await h.context.startOrMergeJob({ type: 'consumption' });
  assert.equal(h.updates(), 2);
  assert.equal(h.job().queue.units.length, 2);
});
test('exhausted conflicts do not report success', async () => {
  const h = apiHarness(run([inventory]), { conflicts: 4 });
  await assert.rejects(h.context.startOrMergeJob({ type: 'consumption' }), /queue changed/);
});
test('invalid and reversed dates are rejected before writing', async () => {
  const h = apiHarness(run([inventory]));
  for (const fromDate of ['02/30/2026', '10/21/2026', 'garbage']) {
    await assert.rejects(h.context.startOrMergeJob({ type: 'consumption', fromDate, toDate: '10/20/2026' }));
  }
  assert.equal(h.updates(), 0);
});
test('cancel API uses an explicit cancellation marker', async () => {
  const h = apiHarness(run([inventory], 'processing'));
  const res = { setHeader() {}, end(body) { this.body = JSON.parse(body); } };
  await h.context.handler({ url: '/api/cancel', method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(h.job().status, 'cancelled');
  assert.ok(h.job().cancelledAt);
});
test('worker cannot resurrect cancelled jobs or overwrite a replacement run', () => {
  const old = run([inventory], 'processing');
  assert.equal(mergeWorkerJob(structuredClone(old), { ...old, status: 'cancelled' }), null);
  assert.equal(mergeWorkerJob(structuredClone(old), { ...old, cancelledAt: 'now' }), null);
  assert.equal(mergeWorkerJob(structuredClone(old), { ...old, id: 'run-2' }), null);
});
test('worker retains new ranges and explicit requeues made during a scrape', () => {
  const old = run([{ ...consumption, requestedAt: 'old' }], 'processing');
  const latest = run([{ ...consumption, status: 'pending', requestedAt: 'new' }, inventory], 'processing');
  const merged = mergeWorkerJob(old, latest);
  assert.equal(merged.queue.units[0].requestedAt, 'new');
  assert.equal(merged.queue.units[0].status, 'pending');
  assert.equal(merged.progress.total, 2);
});

function reportStore(rows, { failInsert = 0, afterInsert } = {}) {
  let stored = structuredClone(rows), inserts = 0;
  return { rows: () => stored, from() {
    let op, batch, filters = [];
    const q = { insert(b) { op = 'insert'; batch = b; return q; }, delete() { op = 'delete'; return q; },
      gte(k,v) { filters.push(r=>r[k]>=v); return q; }, lte(k,v) { filters.push(r=>r[k]<=v); return q; },
      neq(k,v) { filters.push(r=>r[k]!==v); return q; }, eq(k,v) { filters.push(r=>r[k]===v); return q; },
      then(resolve,reject) {
        if (op === 'insert') {
          if (++inserts === failInsert) return Promise.resolve({ error: new Error('insert failed') }).then(resolve,reject);
          stored.push(...batch); afterInsert?.();
        } else stored = stored.filter(r=>!filters.every(f=>f(r)));
        return Promise.resolve({ error: null }).then(resolve,reject);
      } };
    return q;
  } };
}
test('refresh replaces only the requested dates and repeat imports do not duplicate rows', async () => {
  const store = reportStore([{ date: '2026-09-01', fetched_at: 'old' }, { date: '2026-10-02', fetched_at: 'old' }]);
  for (let i=0;i<2;i++) await replaceConsumptionPeriod(store,[{ date: '2026-10-02' }],'10/01/2026','10/20/2026');
  assert.equal(store.rows().length,2);
  assert.equal(store.rows().filter(r=>r.date==='2026-09-01').length,1);
});
test('partial upload failure and cancellation roll back new rows and preserve history', async () => {
  const original=[{date:'2026-09-01',fetched_at:'old'}];
  const failed=reportStore(original,{failInsert:2});
  await assert.rejects(replaceConsumptionPeriod(failed,Array.from({length:1001},()=>({date:'2026-10-02'})),'10/01/2026','10/20/2026'),/insert failed/);
  assert.deepEqual(failed.rows(),original);
  const controller=new AbortController();
  const cancelled=reportStore(original,{afterInsert:()=>controller.abort()});
  await assert.rejects(replaceConsumptionPeriod(cancelled,[{date:'2026-10-02'}],'10/01/2026','10/20/2026',controller.signal));
  assert.deepEqual(cancelled.rows(),original);
});

function monitor(readJob, options={}) {
  let clock=0, timer, error, updates=[];
  const stop=watchFetchJob({readJob,onUpdate:j=>updates.push(j),onError:e=>{error=e;},now:()=>clock,
    schedule:fn=>{timer=fn;return 1;},unschedule:()=>{timer=null;},...options});
  return { async tick(ms=0) {clock+=ms;const fn=timer;timer=null;await fn?.();},error:()=>error,updates:()=>updates,scheduled:()=>!!timer,stop };
}
test('poller stops and reports database failures', async () => {
  const m=monitor(async()=>{throw Error('permission denied');});
  await m.tick();await m.tick();await m.tick();
  assert.match(m.error().message,/permission denied/);assert.equal(m.scheduled(),false);
});
test('poller diagnoses a missing worker and stops at cancelled/completed/failed', async () => {
  const m=monitor(async()=>({status:'pending'}));await m.tick();await m.tick(120000);
  assert.match(m.error().message,/no worker/);assert.equal(m.scheduled(),false);
  for(const status of ['cancelled','completed','failed']) {const t=monitor(async()=>({status}));await t.tick();assert.equal(t.scheduled(),false);assert.equal(t.updates().length,1);}
});
test('poller reports missing or replaced jobs and enforces total timeout', async () => {
  for(const read of [async()=>null,async()=>({id:'other'})]) {const m=monitor(read,{jobId:'ours',maxErrors:1});await m.tick();assert.ok(m.error());assert.equal(m.scheduled(),false);}
  const m=monitor(async()=>({status:'processing'}),{timeout:10});await m.tick();await m.tick(10);assert.match(m.error().message,/timed out/);
});

function workerHarness(initial, scrape = async () => 1) {
  let job = structuredClone(initial), cancelPoll, scrapes = 0;
  const source = readFileSync(new URL('../local-worker.mjs', import.meta.url), 'utf8');
  const core = source.slice(source.indexOf('const JOB_KEY'), source.indexOf('// ── Startup'));
  const c = vm.createContext({ console, Date, JSON, AbortController, isCancelled, sameRun, mergeWorkerJob, compareJob, randomUUID,
    setTimeout: () => 1, clearTimeout() {}, setInterval: fn => {cancelPoll = fn;return 1;},clearInterval() {cancelPoll=null;},
    fetchConsumptionData: async (...args) => {scrapes++;return scrape(...args);},
    fetchInventoryData: async (...args) => {scrapes++;return scrape(...args);},
  });
  vm.runInContext(core,c);
  c.readJob=async()=>({job:structuredClone(job),raw:JSON.stringify(job)});
  c.casWrite=async next=>{job=structuredClone(next);return true;};
  c.writeJob=async next=>{job=structuredClone(next);return true;};
  return {c, job:()=>job, scrapes:()=>scrapes, cancel:async()=>{job.status='cancelled';job.cancelledAt='now';await cancelPoll?.();}};
}
test('worker never starts a cancelled job', async () => {
  const h=workerHarness({...run([inventory]),status:'cancelled',cancelledAt:'now'});
  await h.c.processQueue();assert.equal(h.scrapes(),0);assert.equal(h.job().status,'cancelled');
});
test('Stop aborts an active scraper and the worker does not retry or overwrite cancellation', async () => {
  let started, release;
  const began=new Promise(r=>{started=r;});
  const h=workerHarness(run([inventory]),async (_progress,_location,signal)=>{
    started();await new Promise((resolve,reject)=>{release=resolve;signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});return 1;
  });
  const executing=h.c.processQueue();await began;await h.cancel();await executing;
  assert.equal(h.job().status,'cancelled');assert.equal(h.scrapes(),1);release();
  await h.c.processQueue();assert.equal(h.scrapes(),1);
});

test('worker database write guards reject a cancellation arriving after the merge read', async () => {
  const source=readFileSync(new URL('../local-worker.mjs',import.meta.url),'utf8');
  const core=source.slice(source.indexOf('const JOB_KEY'),source.indexOf('// ── Startup'));
  let stored={...run([inventory]),status:'cancelled',cancelledAt:'now'};
  const supabase={from(){let payload,filters=[];const q={update(p){payload=p;return q;},eq(){return q;},
    like(_k,v){filters.push(s=>s.includes(v.slice(1,-1)));return q;},
    not(_k,_op,v){filters.push(s=>!s.includes(v.slice(1,-1)));return q;},
    select(){const raw=JSON.stringify(stored);if(!filters.every(f=>f(raw)))return Promise.resolve({data:[],error:null});stored=JSON.parse(payload.value);return Promise.resolve({data:[{value:payload.value}],error:null});}};return q;}};
  const c=vm.createContext({supabase,console,Date,randomUUID});vm.runInContext(core,c);
  assert.equal(await c.writeJob(run([inventory],'processing')),false);
  assert.equal(stored.status,'cancelled');
  stored={...run([inventory]),id:'replacement'};
  assert.equal(await c.writeJob(run([inventory],'processing')),false);
  assert.equal(stored.id,'replacement');
});

test('a new fetch can update an existing job with 40 KB of scraper logs', async () => {
  const h=apiHarness({...run([inventory],'processing'),logs:'<div>Scraper progress, quoted "value", slash \\ and newline\n</div>'.repeat(800)});
  await h.context.startOrMergeJob({type:'consumption',fromDate:'10/01/2026',toDate:'10/20/2026'});
  assert.equal(h.job().queue.units.length,2);
  assert.ok(h.job().revision);
});
test('compact comparison preserves exact queue state and revisions and escapes regex syntax', () => {
  const job={...run([{...inventory,error:'bad [a-z].*+? ^ $ (x) {y} | \\ end'}]),revision:'version-1',logs:'x'.repeat(40000)};
  let pattern;compareJob({filter(_c,op,p){assert.equal(op,'match');pattern=p;}},JSON.stringify(job));
  assert.ok(encodeURIComponent(pattern).length<4000);
  const re=new RegExp(pattern);
  assert.ok(re.test(JSON.stringify(job)));
  assert.ok(re.test(JSON.stringify({...job,logs:'different log "quoted" \\ and\nnew line'})));
  assert.equal(re.test(JSON.stringify({...job,status:'cancelled'})),false);
  assert.equal(re.test(JSON.stringify({...job,revision:'version-2'})),false);
  assert.equal(re.test(JSON.stringify({...job,queue:{units:[],createdAt:job.queue.createdAt}})),false);
});
