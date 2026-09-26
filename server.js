import { fetchConsumptionData } from './src/consumption_scraper.js';
import { fetchInventoryData } from './src/inventory_scraper.js';
import { supabase } from './src/server-config.js';

const JOB_KEY = 'fetch_job';
const MAX_LOG_CHARS = 40000;

const pad = (n) => n.toString().padStart(2, '0');
const formatDate = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;

async function readJob() {
  const { data, error } = await supabase
    .from('tata_bot_settings')
    .select('value')
    .eq('key', JOB_KEY)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  try {
    return JSON.parse(data.value);
  } catch {
    return null;
  }
}

async function writeJob(job) {
  const { error } = await supabase
    .from('tata_bot_settings')
    .upsert({ key: JOB_KEY, value: JSON.stringify(job) }, { onConflict: 'key' });
  if (error) throw error;
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
  return updateJob((cur) => {
    if (progress) cur.progress = progress;
    let logs = (cur.logs || '') + `<div>${new Date().toISOString()} - ${msg}</div>`;
    if (logs.length > MAX_LOG_CHARS) {
      logs = '<div>... earlier steps truncated ...</div>' + logs.slice(-MAX_LOG_CHARS);
    }
    cur.logs = logs;
  });
}

// Claims a pending job. Vercel can fire overlapping invocations, so re-check the
// row as we flip it to avoid two runners scraping the portal at once.
async function claimPendingJob() {
  const job = await readJob();
  if (!job || job.status !== 'pending') return null;
  job.status = 'processing';
  job.startedAt = new Date().toISOString();
  job.logs = '';
  job.progress = { step: 0, total: 1 };
  await writeJob(job);
  return job;
}

async function countLocations(targetLocation) {
  const { data } = await supabase.from('tata_locations').select('location_name');
  const all = data || [];
  if (targetLocation && targetLocation !== 'ALL') {
    return all.filter((l) => l.location_name === targetLocation).length;
  }
  return all.length;
}

async function runJob(job) {
  const wantConsumption = job.type === 'consumption' || job.type === 'all';
  const wantInventory = job.type === 'inventory' || job.type === 'all';
  if (!wantConsumption && !wantInventory) throw new Error(`Unknown job type: ${job.type}`);

  // Detail lines emitted by the scrapers themselves.
  const broadcast = (msg) => appendLog(`&nbsp;&nbsp;&nbsp;${msg}`);

  const state = { step: 0, total: 1 };
  const step = (msg) => {
    state.step += 1;
    return appendLog(`<strong>Step ${state.step}/${state.total}</strong> &mdash; ${msg}`, {
      step: state.step,
      total: state.total,
    });
  };

  try {
    const locCount = wantInventory ? await countLocations(job.targetLocation || 'ALL') : 0;
    state.total = Math.max(
      1,
      (wantConsumption ? 2 : 0) + (wantInventory ? 1 + locCount * 2 : 0)
    );
    await appendLog(`Job started (type: ${job.type}). ${state.total} steps planned.`, {
      step: 0,
      total: state.total,
    });

    // Run strictly one at a time. Both scrapers drive Puppeteer against the same
    // shared ./chrome-profile directory, so running them concurrently corrupts it.
    const results = [];
    if (wantConsumption) {
      await step('Starting consumption scraper');
      results.push(await fetchConsumptionData(job.fromDate, job.toDate, broadcast));
      await step('Consumption scraper finished');
    }
    if (wantInventory) {
      await step('Starting inventory scraper');
      results.push(await fetchInventoryData(broadcast, job.targetLocation || 'ALL'));
      await step('Inventory scraper finished');
    }

    const allMessages = results.flat().filter(Boolean).join('<br>');
    await appendLog(
      `<strong>All requested scrapers finished successfully!</strong><br><br>${allMessages}`,
      { step: state.total, total: state.total }
    );

    await updateJob((cur) => {
      cur.status = 'completed';
      cur.finishedAt = new Date().toISOString();
      cur.progress = { step: state.total, total: state.total };
      if (!cur.logs) cur.logs = '<div>Finished successfully!</div>';
    });

    return { success: true, message: 'Sync completed' };
  } catch (err) {
    console.error('Job failed:', err);
    await appendLog(`<strong>FATAL ERROR:</strong> ${err.message}`);
    await updateJob((cur) => {
      cur.status = 'failed';
      cur.finishedAt = new Date().toISOString();
      cur.error = err.message;
      if (!cur.logs) cur.logs = `<div>FATAL ERROR: ${err.message}</div>`;
    });
    return { success: false, message: err.message };
  }
}

function enqueueDailyJob() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  // Rolls over automatically instead of being pinned to a literal year.
  const yearStart = new Date(today.getFullYear(), 0, 1);

  return {
    status: 'pending',
    type: 'all',
    fromDate: formatDate(yearStart),
    toDate: formatDate(yesterday),
    targetLocation: 'ALL',
    logs: '',
    progress: { step: 0, total: 1 },
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
      await writeJob(enqueueDailyJob());
      const job = await claimPendingJob();
      if (!job) return send(res, 200, { success: true, message: 'No pending job' });
      return send(res, 200, await runJob(job));
    }

    // Dashboard "Sync Database" button
    if (path === '/api/sync' || path === '/sync') {
      if (req.method !== 'POST') {
        return send(res, 405, { success: false, message: 'Method not allowed' });
      }
      if (!isAuthorized(req)) {
        return send(res, 401, { success: false, message: 'Unauthorized' });
      }
      const job = await claimPendingJob();
      if (!job) return send(res, 200, { success: true, message: 'No pending job' });
      return send(res, 200, await runJob(job));
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
