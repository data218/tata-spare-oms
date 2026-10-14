/**
 * local-worker.mjs — Permanent background scraper worker.
 *
 * HOW IT WORKS
 * ─────────────
 * 1. Any user on the web app clicks "Fetch Inventory" or "Fetch Consumption".
 * 2. The Vercel /api/sync handler queues a job in Supabase (tata_bot_settings)
 *    and returns 202 immediately — it never tries to run Puppeteer itself.
 * 3. This process (running 24/7 on the dealership PC) polls Supabase every 3s.
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

import { fetchConsumptionData } from './src/consumption_scraper.js';
import { fetchInventoryData }    from './src/inventory_scraper.js';
import { supabase }              from './src/server-config.js';

const JOB_KEY        = 'fetch_job';
const MAX_LOG_CHARS  = 40_000;
const POLL_MS        = 3_000;   // how often we check Supabase for new jobs
const STALE_UNIT_MS  = 4 * 60 * 1000; // treat a "running" unit as stale after 4 min

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

// Progress is written back to Supabase while a unit is still running, throttled
// so the dashboard shows live logs instead of looking frozen until the unit ends.
let logFlushTimer = null;
function scheduleLogFlush(job) {
  if (logFlushTimer) return;
  logFlushTimer = setTimeout(async () => {
    logFlushTimer = null;
    try {
      // Preserve any unit the server queued (e.g. a dashboard fetch) while we ran.
      const { job: latest } = await readJob();
      if (latest && latest.queue && Array.isArray(latest.queue.units)) {
        for (const u of latest.queue.units) {
          const known = job.queue.units.some(
            (x) => x.kind === u.kind && (x.location || '') === (u.location || '')
          );
          if (!known) job.queue.units.push(u);
        }
      }
      await writeJob(job);
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

  // ── Reset jobs that Vercel may have touched but could never run ──────────
  // Vercel's /api/sync previously called kickOff which could mark units as
  // 'failed' because Cloudflare blocks its IPs. We reset those so we can run
  // them here on a machine that the portal allows.
  let needsReset = false;
  if (job.status === 'failed' || job.status === 'done') {
    const hasUnprocessed = job.queue.units.some(
      (u) => u.status !== 'done'
    );
    if (hasUnprocessed) {
      // Revive the job: reset failed units so the local worker can retry them
      console.log(clock(), '🔄 Reviving failed job — resetting for local execution...');
      for (const u of job.queue.units) {
        if (u.status !== 'done') {
          u.status   = 'pending';
          u.attempts = 0;
          u.error    = undefined;
        }
      }
      job.status = 'pending';
      job.logs  += `<div>${ts()} - Local worker revived this job for local execution.</div>`;
      needsReset = true;
    }
  }

  if (job.status === 'completed') return; // truly done, nothing to do

  // ── Recover stale "running" units (orphaned by a crashed worker) ─────────
  const now = Date.now();
  for (const u of job.queue.units) {
    if (u.status === 'running' && u.startedAt) {
      if (now - Date.parse(u.startedAt) > STALE_UNIT_MS) {
        console.log(clock(), `♻ Recovering stale unit: ${label(u)}`);
        u.status   = 'pending';
        u.attempts = Math.max(0, (u.attempts || 1) - 1); // give one more chance
        u.error    = undefined;
      }
    }
  }

  // If another worker is actively running a unit right now, wait
  if (job.queue.units.some((u) => u.status === 'running')) return;

  // Pick the next pending unit
  const next = job.queue.units.find((u) => u.status === 'pending');
  if (!next) {
    // All units are done or failed — mark job complete
    const allDone = job.queue.units.every((u) => u.status === 'done' || u.status === 'failed');
    if (allDone && job.status !== 'completed') {
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
    await writeJob(job); // full write since we changed many units
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
    job.logs       += `<div>${ts()} - ✅ Completed ${label(next)}: ${rows} rows.</div>`;
    console.log(clock(), `✅ Done: ${label(next)} — ${rows} rows`);
  } catch (err) {
    next.finishedAt = ts();
    next.error      = err.message || String(err);
    // Always retry — local machine is reliable, errors are usually transient portal issues
    next.status     = 'pending';
    job.logs       += `<div>${ts()} - ❌ ERROR: ${label(next)} failed (attempt ${next.attempts}): ${next.error}</div>`;
    console.error(clock(), `❌ Failed: ${label(next)} — ${next.error}`);

    if (next.attempts >= 3) {
      next.status  = 'failed';
      job.logs    += `<div>${ts()} - Giving up on ${label(next)} after 3 attempts.</div>`;
      console.error(clock(), `🚫 Giving up on: ${label(next)}`);
    }
  }

  // Write final state back
  job.queue.units[unitIdx] = next;
  const doneFinal = job.queue.units.filter(u => u.status === 'done').length;
  job.progress = { step: doneFinal, total };
  await writeJob(job);
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
tick(); // run immediately on start
