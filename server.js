import { fetchConsumptionData } from './src/consumption_scraper.js';
import { fetchInventoryData } from './src/inventory_scraper.js';
import { supabase } from './src/server-config.js';
import { waitUntil } from './src/wait-until.js';

const JOB_KEY = 'fetch_job';
const MAX_LOG_CHARS = 40000;

// A serverless invocation is killed at maxDuration (300s on Hobby). Anything
// still marked "running" that old belongs to an invocation that was cut off, so
// it goes back on the queue rather than being lost.
const STALE_UNIT_MS = 4 * 60 * 1000;

// Never let one poisonous unit block the locations queued behind it.
const MAX_UNIT_ATTEMPTS = 3;

const pad = (n) => n.toString().padStart(2, '0');
const formatDate = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;

const describeUnit = (u) => (u.kind === 'consumption' ? 'consumption report' : `inventory for ${u.location}`);
const unitKey = (u) => `${u.kind}:${u.location || ''}`;
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
  const { error } = await supabase
    .from('tata_bot_settings')
    .upsert({ key: JOB_KEY, value: JSON.stringify(job) }, { onConflict: 'key' });
  if (error) throw error;
}

// Compare-and-swap. Overlapping invocations (cron + a manual fetch, or a retry)
// must not both claim the same unit, and the row cannot carry a JSON payload
// condition, so the previous value is used as the token.
async function casWriteJob(job, expectedRaw) {
  if (expectedRaw === null || expectedRaw === undefined) {
    await writeJob(job);
    return true;
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

// Every mutation of the job row goes through one serialised queue. Without this,
// concurrent read-modify-write cycles clobber each other and the dashboard loses
// progress lines (or shows a half-written log).
let writeQueue = Promise.resolve();
function updateJob(mutator) {
  writeQueue = writeQueue
    .then(async () => {
      const current = (await readJob()) || {};
      mutator(current);
      await writeJob(current);
    })
    .catch((e) => {
      console.error('Job update error:', e);
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
// finish well inside a single invocation, so the 300s cap can never truncate a
// run and lose the locations that had not been reached yet.
async function unitsForSpec(spec) {
  const type = (spec && spec.type) || 'all';
  const target = (spec && spec.targetLocation) || 'ALL';
  const units = [];

  if (type === 'consumption' || type === 'all') {
    units.push({ kind: 'consumption' });
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
  return units.map((u) => ({ ...u, status: 'pending', attempts: 0 }));
}

// Starts a fresh run, or folds the request into a run that is already in flight
// so a manual fetch can never wipe locations the daily cron has queued.
async function startOrMergeJob(spec) {
  const units = await unitsForSpec(spec);
  const { job, raw } = await readJobRaw();

  if (job && job.status === 'processing' && job.queue && Array.isArray(job.queue.units)) {
    const seen = new Set(job.queue.units.map(unitKey));
    const extra = units.filter((u) => !seen.has(unitKey(u)));
    if (extra.length) {
      job.queue.units.push(...extra);
      job.progress = { step: countDone(job.queue), total: job.queue.units.length };
      pushLog(
        job,
        `Added ${extra.map(describeUnit).join(', ')} to the run already in progress.`
      );
      await casWriteJob(job, raw);
    } else {
      console.log('Requested units are already queued; nothing to add.');
    }
    return job;
  }

  const fresh = {
    status: 'pending',
    type: (spec && spec.type) || 'all',
    fromDate: spec && spec.fromDate,
    toDate: spec && spec.toDate,
    targetLocation: (spec && spec.targetLocation) || 'ALL',
    logs: '',
    progress: { step: 0, total: units.length },
    queue: { units, createdAt: new Date().toISOString() },
  };
  await writeJob(fresh);
  return fresh;
}

// Recovers units orphaned by a killed invocation, then claims the next one.
function pickUnit(job) {
  const units = job.queue.units;
  const now = Date.now();

  for (const u of units) {
    if (u.status !== 'running' || !u.startedAt) continue;
    if (now - Date.parse(u.startedAt) > STALE_UNIT_MS) {
      u.status = 'pending';
      u.error = undefined;
    }
  }

  // A unit that is still freshly running belongs to another invocation.
  if (units.some((u) => u.status === 'running')) return { busy: true };

  const next = units.find((u) => u.status === 'pending' && (u.attempts || 0) < MAX_UNIT_ATTEMPTS);
  if (next) {
    next.status = 'running';
    next.startedAt = new Date().toISOString();
    next.attempts = (next.attempts || 0) + 1;
    return { unit: next };
  }
  return { done: true };
}

async function claimNextUnit() {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { job, raw } = await readJobRaw();
    if (!job || !job.queue || !Array.isArray(job.queue.units)) return { state: 'idle' };
    if (job.status === 'completed' || job.status === 'failed') return { state: 'finished', job };

    const pick = pickUnit(job);
    if (pick.busy) return { state: 'busy', job };
    if (pick.done) {
      await finishJob(job);
      return { state: 'finished', job };
    }

    job.status = 'processing';
    if (!job.startedAt) job.startedAt = new Date().toISOString();
    pushLog(job, `Picked up ${describeUnit(pick.unit)}.`, {
      step: countDone(job.queue),
      total: job.queue.units.length,
    });

    if (await casWriteJob(job, raw)) {
      return { state: 'unit', job, unit: pick.unit };
    }
    // Another invocation changed the row first: re-read and try again.
  }
  console.log('Could not claim a unit after 4 attempts; leaving it for the next tick.');
  return { state: 'busy' };
}

async function runUnit(unit, job) {
  const broadcast = (msg) => appendLog(`&nbsp;&nbsp;&nbsp;${msg}`);
  if (unit.kind === 'consumption') {
    return await fetchConsumptionData(job.fromDate, job.toDate, broadcast);
  }
  return await fetchInventoryData(broadcast, unit.location);
}

// Applies the unit outcome and retires units that exhausted their attempts, so
// one bad location never blocks the ones behind it.
function settle(job) {
  const queue = job.queue;
  for (const u of queue.units) {
    if (u.status === 'pending' && (u.attempts || 0) >= MAX_UNIT_ATTEMPTS) {
      u.status = 'failed';
      u.finishedAt = new Date().toISOString();
      u.error = `gave up after ${MAX_UNIT_ATTEMPTS} attempts`;
    }
  }
  return updateJob((cur) => {
    if (!cur.queue) return;
    cur.queue = queue;
    cur.progress = { step: countDone(queue), total: queue.units.length };
  });
}

async function finishJob(job) {
  const units = job.queue.units;
  const done = units.filter((u) => u.status === 'done');
  const failed = units.filter((u) => u.status !== 'done');
  const summary = [
    `<strong>Sync finished: ${done.length} of ${units.length} unit(s) succeeded.</strong>`,
    ...units.map((u) => `${u.status === 'done' ? 'OK' : 'FAILED'} &mdash; ${describeUnit(u)}${u.error ? ': ' + u.error : ''}`),
  ].join('<br>');

  await updateJob((cur) => {
    if (cur.queue) cur.queue = units;
    cur.status = failed.length ? 'failed' : 'completed';
    cur.finishedAt = new Date().toISOString();
    cur.progress = { step: done.length, total: units.length };
    pushLog(cur, summary, { step: done.length, total: units.length });
  });
}

function selfOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

// Hands the next unit to a fresh invocation. The next tick answers immediately
// (it only claims a unit), so this await costs a few hundred milliseconds.
async function triggerNextTick(req) {
  const origin = selfOrigin(req);
  if (!origin) {
    console.error('Cannot resolve own host, so the next unit will not start.');
    return;
  }
  const headers = {};
  if (process.env.CRON_SECRET) headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
  try {
    const res = await fetch(`${origin}/api/queue`, { method: 'POST', headers });
    if (!res.ok) {
      console.error('Next unit rejected:', res.status, (await res.text().catch(() => '')).slice(0, 300));
    }
  } catch (e) {
    console.error('Failed to hand over to the next unit:', e.message);
  }
}

// Runs exactly one unit per invocation, then chains to the next.
async function processQueue(req) {
  const claim = await claimNextUnit();
  if (claim.state === 'idle') {
    await appendLog('Nothing to do: no queued work.');
    return { chained: false };
  }
  if (claim.state === 'busy') {
    console.log('Another invocation owns the current unit; skipping this tick.');
    return { chained: false };
  }
  if (claim.state === 'finished') return { chained: false };

  const { job, unit } = claim;
  const label = describeUnit(unit);
  const total = job.queue.units.length;
  const step = job.queue.units.indexOf(unit) + 1;

  await appendLog(`<strong>Step ${step}/${total}</strong> &mdash; ${label} (attempt ${unit.attempts})`, {
    step: step - 1,
    total,
  });

  try {
    const result = await runUnit(unit, job);
    unit.status = 'done';
    unit.finishedAt = new Date().toISOString();
    unit.result = (Array.isArray(result) ? result : [result]).filter(Boolean).join('<br>');
    await appendLog(`<strong>${label}: completed</strong>${unit.result ? '<br>' + unit.result : ''}`);
  } catch (err) {
    unit.finishedAt = new Date().toISOString();
    unit.error = err.message;
    console.error(`Unit failed (${label}):`, err);
    if (unit.attempts < MAX_UNIT_ATTEMPTS) {
      // A transient portal error should not cost the location its data: put it
      // back on the queue, and retire it only once the attempts run out.
      unit.status = 'pending';
      unit.note = 'retrying after error';
      await appendLog(
        `<strong>ERROR: ${label} failed (attempt ${unit.attempts} of ${MAX_UNIT_ATTEMPTS}):</strong> ${err.message} - retrying`
      );
    } else {
      unit.status = 'failed';
      await appendLog(`<strong>ERROR: ${label} failed permanently:</strong> ${err.message}`);
    }
  }

  await settle(job);

  const left = job.queue.units.some((u) => u.status === 'pending' || u.status === 'running');
  if (!left) {
    await finishJob(job);
    return { chained: false };
  }

  await triggerNextTick(req);
  return { chained: true };
}

function enqueueDailySpec() {
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

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Manual /api/sync calls
// must present the same secret once it is configured.
function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${secret}`;
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

// Starts (or joins) the chain and answers straight away. On Vercel the unit keeps
// running after the response via waitUntil; locally there is no request context,
// so it runs inline and chains over HTTP.
async function kickOff(req, res) {
  const run = processQueue(req);
  if (waitUntil(run)) {
    return send(res, 202, { success: true, message: 'Sync started' });
  }
  const result = await run;
  return send(res, 200, {
    success: true,
    message: result.chained ? 'Sync in progress' : 'Sync completed',
  });
}

export default async function handler(req, res) {
  const path = (req.url || '').split('?')[0].replace(/\/+$/, '') || '/';

  try {
    // Vercel Cron entrypoint - runs once a day at 10:00 IST (see "crons" in vercel.json)
    if (path === '/api/cron' || path === '/cron') {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return send(res, 405, { success: false, message: 'Method not allowed' });
      }
      if (!isAuthorized(req)) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      await startOrMergeJob(enqueueDailySpec());
      return await kickOff(req, res);
    }

    // Dashboard "Sync Database" button / Fetch Data buttons. The request body
    // describes the work; the server owns the queue so a manual fetch merges
    // into a running job instead of discarding it.
    if (path === '/api/sync' || path === '/sync') {
      if (req.method !== 'POST') {
        return send(res, 405, { success: false, message: 'Method not allowed' });
      }
      if (!isAuthorized(req)) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      await startOrMergeJob(await readSpec(req));
      return await kickOff(req, res);
    }

    // Internal: the hand-over target between units of the same run. Kept to a
    // single path segment because that is all api/[...path].js routes.
    if (path === '/api/queue' || path === '/queue') {
      if (req.method !== 'POST') {
        return send(res, 405, { success: false, message: 'Method not allowed' });
      }
      if (!isAuthorized(req)) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      return await kickOff(req, res);
    }

    if (path === '/api/status' || path === '/status') {
      const job = await readJob();
      return send(res, 200, { success: true, job });
    }

    // Reports the actual lambda runtime, so packaging problems can be measured
    // instead of guessed at.
    if (path === '/api/health' || path === '/health') {
      let requireEsm;
      try {
        const { createRequire } = await import('module');
        // Exactly the operation that fails: CJS requiring an ESM package.
        createRequire(import.meta.url)('puppeteer-core');
        requireEsm = { ok: true };
      } catch (e) {
        requireEsm = { ok: false, error: e.message.split('\n')[0] };
      }
      return send(res, 200, {
        success: true,
        node: process.version,
        major: Number(process.versions.node.split('.')[0]),
        requireEsm,
      });
    }


    return send(res, 404, { success: false, message: 'Not found' });
  } catch (err) {
    console.error('Handler error:', err);
    return send(res, 500, { success: false, message: err.message });
  }
}
