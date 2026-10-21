import { supabase } from '../src/server-config.js';
import { randomUUID } from 'node:crypto';
import { unitKey, isCancelled } from '../src/fetch-job.js';
import { toISODate } from '../src/consumption-store.js';

const JOB_KEY = 'fetch_job';
const MAX_LOG_CHARS = 40000;

const pad = (n) => n.toString().padStart(2, '0');
const formatDate = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;

/** The trailing window used when a request does not name an explicit range. */
const trailingDays = (days) => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: formatDate(from), to: formatDate(to) };
};

const describeUnit = (u) => (u.kind === 'consumption' ? 'consumption report' : `inventory for ${u.location}`);
const countDone = (queue) => queue.units.filter((u) => u.status === 'done').length;

async function readJobRaw() {
  const { data, error } = await supabase
    .from('tata_bot_settings')
    .select('value')
    .eq('key', JOB_KEY)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { job: null, raw: null };
  try {
    return { job: JSON.parse(data.value), raw: data.value };
  } catch {
    return { job: null, raw: data.value };
  }
}

async function readJob() {
  return (await readJobRaw()).job;
}

async function writeJob(job) {
  const { data, error } = await supabase
    .from('tata_bot_settings')
    .upsert({ key: JOB_KEY, value: JSON.stringify(job) }, { onConflict: 'key', ignoreDuplicates: true })
    .select('value');
  if (error) throw error;
  return Boolean(data?.length);
}

// Compare-and-swap. Overlapping invocations (cron + a manual fetch, or a retry)
// must not both claim the same unit, and the row cannot carry a JSON payload
// condition, so the previous value is used as the token.
async function casWriteJob(job, expectedRaw) {
  if (expectedRaw === null || expectedRaw === undefined) {
    return await writeJob(job);
  }
  const { data, error } = await supabase
    .from('tata_bot_settings')
    .update({ value: JSON.stringify(job) })
    .eq('key', JOB_KEY)
    .eq('value', expectedRaw)
    .select('value');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

function pushLog(job, msg, progress) {
  if (progress) job.progress = progress;
  let logs = (job.logs || '') + `<div>${new Date().toISOString()} - ${msg}</div>`;
  if (logs.length > MAX_LOG_CHARS) {
    logs = '<div>... earlier steps truncated ...</div>' + logs.slice(-MAX_LOG_CHARS);
  }
  job.logs = logs;
}

// Every mutation of the job row goes through one serialised queue, and each write
// is a compare-and-swap with a short retry. Without the CAS, a concurrent writer
// (the local worker, or the daily cron) would be clobbered by a stale read and the
// dashboard would lose progress lines or a freshly-queued unit.
let writeQueue = Promise.resolve();
function updateJob(mutator) {
  writeQueue = writeQueue
    .catch(() => {}) // a failed request must not poison later queue updates
    .then(async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const { job, raw } = await readJobRaw();
        if (!job) return;
        mutator(job);
        if (await casWriteJob(job, raw)) return;
      }
      throw new Error('Job update gave up after 4 CAS attempts. Please retry.');
    })
    .catch((e) => {
      console.error('Job update error:', e.message);
      throw e;
    });
  return writeQueue;
}

// Appends a log line (and optionally progress) so the dashboard can poll live status.
function appendLog(msg, progress) {
  return updateJob((cur) => pushLog(cur, msg, progress));
}

async function listLocations(targetLocation) {
  const { data, error } = await supabase.from('tata_locations').select('location_name');
  if (error) throw error;
  const names = (data || []).map((l) => l.location_name).filter(Boolean);
  if (targetLocation && targetLocation !== 'ALL') {
    return names.filter((n) => n === targetLocation);
  }
  return names;
}

// A run is a list of small units: one per report/location. Each unit is sized to
// finish well inside a single scrape, so a run never loses the locations that had
// not been reached yet.
async function unitsForSpec(spec) {
  const type = (spec && spec.type) || 'all';
  const target = (spec && spec.targetLocation) || 'ALL';
  const units = [];

  if (type === 'consumption' || type === 'all') {
    // The consumption scraper needs a date range. The "Sync Database" button posts
    // type:'all' with no dates, so default it to the same trailing 30 days the
    // daily cron uses, and keep the explicit error when the caller does send dates
    // but one of them is empty.
    const fromDate = spec?.fromDate || trailingDays(30).from;
    const toDate = spec?.toDate || trailingDays(30).to;
    if (toISODate(fromDate) > toISODate(toDate)) throw new Error('From date must not be after to date.');
    units.push({ kind: 'consumption', fromDate, toDate });
  }
  if (type === 'inventory' || type === 'all') {
    const locations = await listLocations(target);
    if (!locations.length) {
      throw new Error(`No locations found for ${target}. Please add a location in Settings.`);
    }
    for (const location of locations) {
      units.push({ kind: 'inventory', location });
    }
  }
  if (!units.length) throw new Error(`Unknown job type: ${type}`);
  return units.map((u) => ({ ...u, status: 'pending', attempts: 0, requestedAt: randomUUID() }));
}

// Starts a fresh run, or folds the request into a run that is already in flight
// so a manual fetch can never wipe locations the daily cron has queued.
//
// A requested location that has already finished (done/failed) in the current
// run is re-armed instead of being silently skipped: otherwise a user could not
// re-fetch a location until the whole run ended. Units that are still pending or
// running are left untouched so we never double-run a live scrape.
export async function startOrMergeJob(spec) {
  const units = await unitsForSpec(spec);
  for (let attempt = 0; attempt < 4; attempt++) {
    const { job, raw } = await readJobRaw();

    if (job && !isCancelled(job) && ['pending', 'processing', 'running'].includes(job.status) && job.queue && Array.isArray(job.queue.units)) {
      if (job.status === 'running') throw new Error('The scheduled local runner is active. Please retry after it finishes.');
      const messages = [];
      for (const u of units) {
        const existing = job.queue.units.find((x) => unitKey(x) === unitKey(u));
        if (!existing) {
          job.queue.units.push(u);
          messages.push(describeUnit(u));
        } else if (existing.status === 'done' || existing.status === 'failed') {
          Object.assign(existing, u);
          existing.status = 'pending';
          existing.attempts = 0;
          existing.error = undefined;
          existing.startedAt = undefined;
          existing.finishedAt = undefined;
          existing.retryAfter = undefined;
          messages.push(describeUnit(existing));
        }
      }

      if (messages.length) {
        job.finishedAt = undefined;
        job.progress = { step: countDone(job.queue), total: job.queue.units.length };
        pushLog(job, `Queued from the dashboard: ${[...new Set(messages)].join(', ')}.`);
        if (!await casWriteJob(job, raw)) continue;
      } else {
        console.log('Requested units are already queued or running; nothing to add.');
      }
      return job;
    }

    const fresh = {
      id: randomUUID(),
      status: 'pending',
      type: (spec && spec.type) || 'all',
      fromDate: spec && spec.fromDate,
      toDate: spec && spec.toDate,
      targetLocation: (spec && spec.targetLocation) || 'ALL',
      logs: '',
      progress: { step: 0, total: units.length },
      queue: { units, createdAt: new Date().toISOString() },
    };
    if (!await casWriteJob(fresh, raw)) continue;
    return fresh;
  }
  throw new Error('The fetch queue changed while submitting. Please retry.');
}

// A worker can be killed between finishing its last unit and marking the run
// complete, which would otherwise leave the dashboard polling forever. If every
// unit is terminal, close the run. Units that are still running or pending are
// left for the worker, so an in-progress run is never disturbed.
async function healFinishedJob() {
  const { job, raw } = await readJobRaw();
  if (!job || !job.queue || !Array.isArray(job.queue.units)) return job;
  if (job.status !== 'processing' && job.status !== 'pending') return job;
  if (job.queue.units.some((u) => u.status === 'pending' || u.status === 'running')) return job;

  const failed = job.queue.units.some((u) => u.status !== 'done');
  job.status = failed ? 'failed' : 'completed';
  job.finishedAt = new Date().toISOString();
  job.progress = { step: countDone(job.queue), total: job.queue.units.length };
  pushLog(job, `All units finished; run marked ${job.status}.`);
  await casWriteJob(job, raw);
  return job;
}

export function enqueueDailySpec() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  // Rolls over automatically instead of being pinned to a literal year.
  const yearStart = new Date(today.getFullYear(), 0, 1);

  return {
    type: 'all',
    fromDate: formatDate(yearStart),
    toDate: formatDate(yesterday),
    targetLocation: 'ALL',
  };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
//
// When the secret is configured, every guarded endpoint demands it. When it is
// NOT configured we fail closed for server-admin endpoints (cron/status) on
// Vercel so they cannot be triggered by a stranger, while the dashboard-facing
// endpoints (sync/cancel) stay open because the browser cannot hold a secret.
function isAuthorized(req, { required = false } = {}) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers['authorization'] || '';
    return header === `Bearer ${secret}`;
  }
  if (required && process.env.VERCEL) return false;
  return true;
}

async function readSpec(req) {
  if (!req.body) return { type: 'all', targetLocation: 'ALL' };
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return { type: 'all', targetLocation: 'ALL' };
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  const path = (req.url || '').split('?')[0].replace(/\/+$/, '') || '/';

  try {
    // Vercel Cron entrypoint - runs once a day at 10:00 IST (see "crons" in vercel.json).
    // Queue-only: the local worker (local-worker.mjs) performs the actual scraping
    // because the Tata portal blocks Vercel's shared egress IPs via Cloudflare.
    if (path === '/api/cron' || path === '/cron') {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return send(res, 405, { success: false, message: 'Method not allowed' });
      }
      if (!isAuthorized(req, { required: true })) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      try {
        await healFinishedJob();
        await startOrMergeJob(enqueueDailySpec());
      } catch (err) {
        return send(res, 400, { success: false, message: err.message });
      }
      return send(res, 202, { success: true, message: 'Daily sync queued.' });
    }

    // Dashboard "Sync Database" button / Fetch Data buttons. The request body
    // describes the work; the server owns the queue so a manual fetch merges into
    // a running job instead of discarding it.
    //
    // IMPORTANT: We ONLY queue the job here — we never try to run Puppeteer from
    // Vercel because the Tata portal blocks Vercel's shared egress IPs. The
    // local-worker.mjs process (running on the dealership PC) picks the row up and
    // executes the scraper. Any user on the web app can trigger a fetch — the
    // actual work is always done locally.
    if (path === '/api/sync' || path === '/sync') {
      if (req.method !== 'POST') {
        return send(res, 405, { success: false, message: 'Method not allowed' });
      }
      if (!isAuthorized(req)) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      // A bad request must not create a job row: the unit would be queued and
      // then fail on every retry. Reject it before anything is written.
      try {
        await healFinishedJob();
        const job = await startOrMergeJob(await readSpec(req));
        return send(res, 202, { success: true, jobId: job.id, message: 'Sync queued. The background worker will start shortly.' });
      } catch (err) {
        return send(res, 400, { success: false, message: err.message });
      }
    }

    // Legacy hand-over endpoint. Execution moved to the local worker, so this is
    // a no-op kept so old chains/links do not 404.
    if (path === '/api/queue' || path === '/queue') {
      if (req.method !== 'POST') {
        return send(res, 405, { success: false, message: 'Method not allowed' });
      }
      if (!isAuthorized(req)) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      return send(res, 200, { success: true, message: 'Queued units are executed by the local worker.' });
    }

    if (path === '/api/cancel' || path === '/cancel') {
      if (req.method !== 'POST') {
        return send(res, 405, { success: false, message: 'Method not allowed' });
      }
      if (!isAuthorized(req)) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      await updateJob((cur) => {
        if (cur && (cur.status === 'pending' || cur.status === 'processing')) {
          cur.status = 'cancelled';
          cur.cancelledAt = new Date().toISOString();
          cur.finishedAt = cur.cancelledAt;
          pushLog(cur, '<strong>Stopped by user</strong>');
        }
      });
      return send(res, 200, { success: true, message: 'Job cancelled' });
    }

    // Status exposes the (potentially sensitive) scrape log, so it is never left
    // open on Vercel.
    if (path === '/api/status' || path === '/status') {
      if (!isAuthorized(req, { required: true })) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      const job = await healFinishedJob();
      return send(res, 200, { success: true, job });
    }

    // Reports the actual lambda runtime, so packaging problems can be measured
    // instead of guessed at.
    if (path === '/api/health' || path === '/health') {
      const { major } = { major: Number(process.versions.node.split('.')[0]) };

      let runtime;
      try {
        await import('../src/puppeteer-runtime.js');
        runtime = { ok: true };
      } catch (e) {
        runtime = { ok: false, error: e.message.split('\n')[0] };
      }

      let chromium;
      try {
        const { default: chromiumPkg } = await import('@sparticuz/chromium');
        chromium = {
          ok: true,
          version: chromiumPkg.headless ? 'headless-shell' : 'chromium',
          al2023: Boolean(process.env.VERCEL) && major >= 20,
        };
      } catch (e) {
        chromium = { ok: false, error: e.message.split('\n')[0] };
      }

      return send(res, 200, {
        success: true,
        node: process.version,
        major,
        runtime,
        chromium,
      });
    }


    return send(res, 404, { success: false, message: 'Not found' });
  } catch (err) {
    console.error('Handler error:', err);
    return send(res, 500, { success: false, message: err.message });
  }
}
