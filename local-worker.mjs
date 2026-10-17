/**
 * local-worker.mjs — Permanent background scraper worker.
 *
 * HOW IT WORKS
 * ─────────────
 * 1. Any user on the web app clicks "Fetch Inventory" or "Fetch Consumption".
 * 2. The Vercel /api/sync handler queues a job in Supabase (tata_bot_settings)
 *    and returns 202 immediately — it never tries to run Puppeteer itself.
 * 3. This process (running 24/7 on the dealership PC) reacts to new jobs
 *    instantly via Supabase Realtime, with a slow safety poll as a fallback.
 * 4. When it sees a pending job it claims it, runs the scraper locally, and
 *    writes progress back to Supabase so the dashboard can show live status.
 *
 * SETUP (run once)
 * ─────────────────
 *   npm run worker:install   → registers this as a Windows startup task
 *   npm run worker:uninstall → removes the startup task
 *   npm run worker:status    → shows whether the task is registered
 *
 * Or start it manually (stays running until you close the terminal):
 *   node local-worker.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchConsumptionData } from './src/consumption_scraper.js';
import { fetchInventoryData }    from './src/inventory_scraper.js';
import { supabase }              from './src/server-config.js';

// ── Single-instance guard ────────────────────────────────────────────────────
// run-worker.cmd restarts this process in a loop. If the PC ever ends up with
// more than one worker (e.g. after several manual restarts), they fight over the
// same Supabase job and corrupt each other's writes. Refuse to start if another
// live worker already holds the lock.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCK_FILE = path.join(__dirname, 'logs', 'worker.lock');
try {
  if (fs.existsSync(LOCK_FILE)) {
    const otherPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    if (otherPid && otherPid !== process.pid) {
      try {
        process.kill(otherPid, 0); // throws if that PID is not alive
        console.log(`Another worker is already running (pid ${otherPid}). Exiting.`);
        process.exit(0);
      } catch { /* stale lock from a crashed worker — take it over */ }
    }
  }
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, String(process.pid));
} catch (e) {
  console.error('single-instance lock failed:', e.message);
}
process.on('exit', () => { try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ } });

const JOB_KEY        = 'fetch_job';
const MAX_LOG_CHARS  = 40_000;
const POLL_MS        = 5 * 60 * 1000; // slow safety poll; Realtime drives the fast path
const STALE_UNIT_MS  = 8 * 60 * 1000; // treat a "running" unit as stale only after a full inventory export could have finished
const MAX_UNIT_ATTEMPTS = 3;          // give up on a unit after this many tries
const MAX_JOB_REVIVALS  = 3;          // never revive a failed job more than this many times

const pad        = (n) => n.toString().padStart(2, '0');
const fmt        = (d) => `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()}`;
const trailing   = (days) => {
  const to = new Date(), from = new Date();
  from.setDate(from.getDate() - days);
  return { from: fmt(from), to: fmt(to) };
};
const ts         = () => new Date().toISOString();
const label      = (u) => u.kind === 'consumption' ? 'Consumption report' : `Inventory for ${u.location}`;
const clock      = () => `[${new Date().toLocaleTimeString()}]`;

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function readJob() {
  const { data, error } = await supabase
    .from('tata_bot_settings').select('value').eq('key', JOB_KEY).maybeSingle();
  if (error || !data) return { job: null, raw: null };
  try { return { job: JSON.parse(data.value), raw: data.value }; }
  catch { return { job: null, raw: null }; }
}

async function writeJob(job) {
  let logs = job.logs || '';
  if (logs.length > MAX_LOG_CHARS) {
    logs = '<div>... earlier steps truncated ...</div>' + logs.slice(-MAX_LOG_CHARS);
  }
  await supabase
    .from('tata_bot_settings')
    .upsert({ key: JOB_KEY, value: JSON.stringify({ ...job, logs }) }, { onConflict: 'key' });
}

// CAS write — only saves if Supabase still has the value we read (prevents races)
async function casWrite(job, raw) {
  const { data } = await supabase
    .from('tata_bot_settings')
    .update({ value: JSON.stringify(job) })
    .eq('key', JOB_KEY).eq('value', raw).select('value');
  return Array.isArray(data) && data.length > 0;
}

// Persists the local worker's view of the job while preserving any unit the
// server queued in the meantime (a dashboard fetch issued during a long scrape),
// so a merge never clobbers a freshly-queued unit.
async function mergeAndWrite(job) {
  try {
    const { job: latest } = await readJob();
    if (latest && latest.queue && Array.isArray(latest.queue.units)) {
      for (const u of latest.queue.units) {
        const known = job.queue.units.some(
          (x) => x.kind === u.kind && (x.location || '') === (u.location || '')
        );
        if (!known) job.queue.units.push(u);
      }
    }
  } catch (e) {
    console.error('merge read failed:', e.message);
  }
  await writeJob(job);
}

// Progress is written back to Supabase while a unit is still running, throttled
// so the dashboard shows live logs instead of looking frozen until the unit ends.
let logFlushTimer = null;
function scheduleLogFlush(job) {
  if (logFlushTimer) return;
  logFlushTimer = setTimeout(async () => {
    logFlushTimer = null;
    try {
      await mergeAndWrite(job);
    } catch (e) {
      console.error('log flush failed:', e.message);
    }
  }, 3000);
}

// ── Core loop ────────────────────────────────────────────────────────────────

let busy = false; // prevent overlapping runs

async function tick() {
  if (busy) return;
  busy = true;
  try {
    await processQueue();
  } catch (e) {
    console.error(clock(), '⚠ Worker loop error:', e.message);
  } finally {
    busy = false;
  }
}

async function processQueue() {
  const { job, raw } = await readJob();
  if (!job || !job.queue || !Array.isArray(job.queue.units)) return;

  // A local runner (run-fetch.mjs, driven by Task Scheduler) owns the job while
  // its status is "running" — the mirror of run-fetch's own guard, which watches
  // for the worker ("processing" + a running unit). Never scrape alongside it:
  // two logins at once trip the Tata portal's concurrent-session limit.
  if (job.status === 'running') return;

  // ── Reset jobs that Vercel may have touched but could never run ──────────
  // The API only queues; if a job was marked failed/done without the local
  // worker finishing it, re-arm the unfinished units. A revival counter and a
  // per-unit attempt check keep a permanently-broken job from looping forever.
  let needsReset = false;
  if (job.status === 'failed' || job.status === 'done') {
    const revivals = job.revivals || 0;
    let rearmed = false;
    for (const u of job.queue.units) {
      if (u.status === 'done') continue;
      // A unit that already exhausted its attempts stays failed: re-arming it
      // would just hammer the portal forever (e.g. wrong credentials).
      if (u.status === 'failed' && (u.attempts || 0) >= MAX_UNIT_ATTEMPTS) continue;
      u.status     = 'pending';
      u.error      = undefined;
      u.retryAfter = undefined;
      rearmed      = true;
    }
    if (rearmed && revivals < MAX_JOB_REVIVALS) {
      console.log(clock(), `🔄 Reviving failed job (revival ${revivals + 1}/${MAX_JOB_REVIVALS}) — resetting for local execution...`);
      job.revivals = revivals + 1;
      job.status   = 'pending';
      job.logs    += `<div>${ts()} - Local worker revived this job for local execution (revival ${job.revivals}/${MAX_JOB_REVIVALS}).</div>`;
      needsReset = true;
    }
  }

  if (job.status === 'completed') return; // truly done, nothing to do

  // ── Recover stale "running" units (orphaned by a crashed worker) ─────────
  const now = Date.now();
  for (const u of job.queue.units) {
    if (u.status === 'running' && u.startedAt) {
      if (now - Date.parse(u.startedAt) > STALE_UNIT_MS) {
        const recoveries = u.staleRecoveries || 0;
        if (recoveries >= 2) {
          console.log(clock(), `🚫 Stale unit recovered too many times; marking failed: ${label(u)}`);
          u.status     = 'failed';
          u.finishedAt = ts();
          u.error      = u.error || 'stale: abandoned after repeated recoveries';
        } else {
          console.log(clock(), `♻ Recovering stale unit (${recoveries + 1}/2): ${label(u)}`);
          u.staleRecoveries = recoveries + 1;
          u.status   = 'pending';
          u.attempts = Math.max(0, (u.attempts || 1) - 1); // give one more chance
          u.error    = undefined;
        }
      }
    }
  }

  // If another worker is actively running a unit right now, wait
  if (job.queue.units.some((u) => u.status === 'running')) return;

  // Pick the next pending unit whose retry backoff (if any) has elapsed.
  const pending = job.queue.units.filter((u) => u.status === 'pending');
  const next = pending.find((u) => !u.retryAfter || Date.now() >= u.retryAfter);
  if (!next) {
    if (pending.length > 0) {
      // Units are waiting out a retry backoff; leave them for a later tick.
      console.log(clock(), `⏸ ${pending.length} unit(s) waiting out a retry backoff.`);
      return;
    }
    // All units are done or failed — mark job complete
    const allDone = job.queue.units.every((u) => u.status === 'done' || u.status === 'failed');
    if (allDone && job.status !== 'completed' && job.status !== 'failed') {
      const anyFailed = job.queue.units.some((u) => u.status === 'failed');
      job.status    = anyFailed ? 'failed' : 'completed';
      job.logs     += `<div>${ts()} - All tasks finished.</div>`;
      job.progress  = { step: job.queue.units.filter(u => u.status === 'done').length, total: job.queue.units.length };
      await writeJob(job);
      console.log(clock(), anyFailed ? '⚠ Job finished with some failures.' : '✅ All tasks completed!');
    }
    return;
  }

  // Claim the unit with CAS so concurrent workers don't double-run
  const unitIdx = job.queue.units.indexOf(next);
  next.status    = 'running';
  next.startedAt = ts();
  next.attempts  = (next.attempts || 0) + 1;
  next.error     = undefined;
  next.rows      = undefined;
  job.status     = 'processing';

  const done  = job.queue.units.filter(u => u.status === 'done').length;
  const total = job.queue.units.length;
  job.progress = { step: done + 1, total };
  job.logs    += `<div>${ts()} - ▶ Starting ${label(next)} (attempt ${next.attempts}).</div>`;

  if (needsReset) {
    await mergeAndWrite(job); // merge-aware full write since we re-armed many units
  } else {
    const claimed = await casWrite(job, raw);
    if (!claimed) return; // another worker got there first
  }

  console.log(clock(), `⏳ Processing: ${label(next)}  (attempt ${next.attempts})...`);

  // ── Run the scraper ───────────────────────────────────────────────────────
  const broadcast = (msg) => {
    job.logs += `<div>${ts()} - &nbsp;&nbsp;&nbsp;${msg}</div>`;
    scheduleLogFlush(job);
  };

  try {
    let rows;
    if (next.kind === 'consumption') {
      const fallback = trailing(30);
      rows = await fetchConsumptionData(
        next.fromDate || job.fromDate || fallback.from,
        next.toDate   || job.toDate   || fallback.to,
        broadcast,
      );
    } else {
      rows = await fetchInventoryData(broadcast, next.location);
    }

    next.status     = 'done';
    next.finishedAt = ts();
    next.rows       = rows;
    next.retryAfter = undefined;
    next.staleRecoveries = undefined;
    job.logs       += `<div>${ts()} - ✅ Completed ${label(next)}: ${rows} rows.</div>`;
    console.log(clock(), `✅ Done: ${label(next)} — ${rows} rows`);
  } catch (err) {
    next.finishedAt = ts();
    next.error      = err.message || String(err);
    // Retry after a short backoff — errors are usually transient portal issues,
    // but hammering a wedged portal instantly only makes it worse.
    next.status     = 'pending';
    next.retryAfter = Date.now() + Math.min(15, next.attempts) * 60 * 1000; // 1..15 min
    job.logs       += `<div>${ts()} - ❌ ERROR: ${label(next)} failed (attempt ${next.attempts}): ${next.error} — retrying in ${Math.min(15, next.attempts)} min</div>`;
    console.error(clock(), `❌ Failed: ${label(next)} — ${next.error}`);

    if (next.attempts >= MAX_UNIT_ATTEMPTS) {
      next.status     = 'failed';
      next.retryAfter = undefined;
      job.logs       += `<div>${ts()} - Giving up on ${label(next)} after ${MAX_UNIT_ATTEMPTS} attempts.</div>`;
      console.error(clock(), `🚫 Giving up on: ${label(next)}`);
    }
  }

  // Write final state back, merging any unit the server queued while we ran so a
  // dashboard fetch issued mid-scrape is not clobbered.
  job.queue.units[unitIdx] = next;
  const doneFinal = job.queue.units.filter(u => u.status === 'done').length;
  job.progress = { step: doneFinal, total };
  await mergeAndWrite(job);
}

// ── Startup ───────────────────────────────────────────────────────────────────

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  🤖  Tata OMS — Background Scraper Worker  STARTED        ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log('║  Any user who clicks "Fetch" in the web app will queue    ║');
console.log('║  a job in Supabase.  This process picks it up and runs    ║');
console.log('║  the scraper locally (where Tata portal is reachable).    ║');
console.log('║                                                           ║');
console.log('║  Keep this terminal open, or install it as a startup      ║');
console.log('║  task so it runs automatically:                           ║');
console.log('║    npm run worker:install                                 ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

setInterval(tick, POLL_MS);

// Fast path: subscribe to the job row so a dashboard "Fetch" starts within a
// second, without polling the table. This keeps database traffic tiny (the slow
// safety poll above is the only recurring read). Requires the table to be in the
// `supabase_realtime` publication; if it is not, Realtime simply stays silent and
// the safety poll still picks jobs up.
try {
  supabase
    .channel('fetch_job_watch')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tata_bot_settings', filter: `key=eq.${JOB_KEY}` },
      () => { tick(); }
    )
    .subscribe((status) => {
      console.log(clock(), `Realtime job watcher: ${status}`);
    });
} catch (e) {
  console.error(clock(), 'Realtime subscribe failed (using safety poll only):', e.message);
}

tick(); // run immediately on start
