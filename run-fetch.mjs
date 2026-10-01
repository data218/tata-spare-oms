/**
 * Local fetch runner.
 *
 * Vercel's shared egress IPs are blocked by the Cloudflare layer in front of the
 * Tata BI portal, so `api/sync` on the serverless function can never reach the
 * login page. A browser on an unblocked network can. This script runs the same
 * scrapers from wherever it is executed and writes the same `fetch_job` row, so
 * the dashboard keeps showing progress and logs without any frontend changes.
 *
 * Usage:
 *   node run-fetch.mjs                     # inventory + trailing 30d consumption
 *   node run-fetch.mjs consumption         # consumption only
 *   node run-fetch.mjs inventory
 *   node run-fetch.mjs consumption 09/01/2026 09/30/2026
 *
 * Intended to be driven by the Windows Task Scheduler (see run-fetch-scheduled.ps1).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchConsumptionData } from './src/consumption_scraper.js';
import { fetchInventoryData } from './src/inventory_scraper.js';
import { supabase } from './src/server-config.js';

const JOB_KEY = 'fetch_job';
const MAX_LOG_CHARS = 40000;
const MAX_UNIT_ATTEMPTS = 3;

const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));

// Task Scheduler gives the task no console, so tee everything to a dated file.
// Writing the log here rather than in the task definition avoids cmd.exe quoting.
const LOG_DIR = path.join(REPO_ROOT, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, `fetch-${new Date().toISOString().slice(0, 10)}.log`);
fs.appendFileSync(LOG_FILE, `\n===== run started ${new Date().toISOString()} =====\n`);

for (const level of ['log', 'warn', 'error']) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    try { fs.appendFileSync(LOG_FILE, `${line}\n`); } catch { /* logging must never fail the run */ }
    original(...args);
  };
}

const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;

/** Rolling window the dashboard expects by default. */
function trailingDays(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: formatDate(from), to: formatDate(to) };
}

let currentJob = null;

/**
 * Publishes progress into tata_bot_settings so the dashboard's /api/status poll
 * shows the same shape it gets from the serverless runner.
 */
function setJob(job) {
  currentJob = job;
  const logs = job.logs.slice(-MAX_LOG_CHARS);
  return supabase
    .from('tata_bot_settings')
    .upsert({ key: JOB_KEY, value: JSON.stringify({ ...job, logs }) }, { onConflict: 'key' })
    .then(({ error }) => {
      if (error) console.error('  ! could not update job status:', error.message);
    });
}

async function runUnit(unit) {
  const { kind, location, fromDate, toDate } = unit;
  const label = kind === 'consumption' ? 'consumption report' : `inventory for ${location}`;

  for (let attempt = 1; attempt <= MAX_UNIT_ATTEMPTS; attempt++) {
    currentJob.logs += `${new Date().toISOString()} - Step ${currentJob.progress.step}/${currentJob.progress.total} — ${label} (attempt ${attempt})\n`;
    await setJob(currentJob);

    try {
      const rows = kind === 'consumption'
        ? await fetchConsumptionData(fromDate, toDate, (m) => { currentJob.logs += `   ${m}\n`; })
        : await fetchInventoryData((m) => { currentJob.logs += `   ${m}\n`; }, location);

      currentJob.queue.units[currentJob.progress.step - 1] = {
        ...unit, status: 'done', attempts: attempt, finishedAt: new Date().toISOString(), rows,
      };
      currentJob.logs += `${new Date().toISOString()} - Completed ${label}: ${rows}\n`;
      await setJob(currentJob);
      return true;
    } catch (err) {
      const message = err.message || String(err);
      const permanent = attempt >= MAX_UNIT_ATTEMPTS;
      currentJob.logs += `${new Date().toISOString()} - ERROR: ${label} failed ${permanent ? 'permanently' : `(attempt ${attempt} of ${MAX_UNIT_ATTEMPTS})`}: ${message}\n`;
      if (!permanent) currentJob.logs += `${new Date().toISOString()} - retrying\n`;
      currentJob.queue.units[currentJob.progress.step - 1] = {
        ...unit, status: permanent ? 'failed' : 'pending', attempts: attempt, error: message,
      };
      await setJob(currentJob);
    }
  }
  return false;
}

async function main() {
  const [arg = 'all', fromArg, toArg] = process.argv.slice(2);
  const window = trailingDays(30);

  const units = [];
  if (arg === 'consumption' || arg === 'all') {
    units.push({ kind: 'consumption', location: 'ALL', fromDate: fromArg || window.from, toDate: toArg || window.to });
  }
  if (arg === 'inventory' || arg === 'all') {
    units.push({ kind: 'inventory', location: 'ALL' });
  }
  if (!units.length) {
    console.error(`Unknown target "${arg}". Use: all | consumption | inventory`);
    process.exit(2);
  }

  currentJob = {
    status: 'running',
    type: units.length === 1 ? units[0].kind : 'all',
    fromDate: units[0].fromDate ?? null,
    toDate: units[0].toDate ?? null,
    targetLocation: 'ALL',
    logs: `${new Date().toISOString()} - Local runner started (${units.length} unit(s)).\n`,
    progress: { step: 0, total: units.length },
    queue: { units: units.map((u) => ({ ...u, status: 'pending', attempts: 0 })), createdAt: new Date().toISOString() },
  };
  await setJob(currentJob);

  let ok = 0;
  for (const unit of units) {
    currentJob.progress.step += 1;
    if (await runUnit(unit)) ok += 1;
  }

  currentJob.status = ok === units.length ? 'done' : 'failed';
  currentJob.logs += `${new Date().toISOString()} - Local runner finished: ${ok} of ${units.length} unit(s) succeeded.\n`;
  await setJob(currentJob);

  console.log(`\n=== ${currentJob.status.toUpperCase()}: ${ok}/${units.length} succeeded ===`);
  process.exitCode = ok === units.length ? 0 : 1;
}

main().catch(async (e) => {
  console.error('\nRunner crashed:', e.message);
  if (currentJob) {
    currentJob.status = 'failed';
    currentJob.logs += `${new Date().toISOString()} - Runner crashed: ${e.message}\n`;
    await setJob(currentJob);
  }
  process.exitCode = 1;
});
