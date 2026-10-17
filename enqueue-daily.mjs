/**
 * enqueue-daily.mjs — one-shot daily enqueue (does NOT scrape).
 *
 * This is what the Windows Task Scheduler runs at 10:00 (see
 * run-fetch-scheduled.ps1). It only writes a `pending` fetch_job — exactly what
 * the dashboard's "Sync Database" button does — and the permanent
 * local-worker.mjs (running 24/7) executes it.
 *
 * Why the daily queues instead of scraping directly: the worker is merge-aware,
 * so a manual "Fetch" clicked while the daily run is in flight is folded into
 * the SAME run instead of racing it with a second portal login. A separate
 * direct scraper (run-fetch.mjs) could not guarantee that. One executor means
 * the 10:00 run and any manual fetch share one queue and never collide.
 *
 * Usage:
 *   node enqueue-daily.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startOrMergeJob, enqueueDailySpec } from './api/_server.js';

const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(REPO_ROOT, 'logs');
const day = new Date().toISOString().slice(0, 10);
const LOG_FILE = path.join(LOG_DIR, `fetch-${day}.log`);

function appendLog(line) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${line}\n`);
  } catch { /* logging must never fail the run */ }
}

const startedAt = new Date().toISOString();
appendLog(`\n===== daily enqueue ${startedAt} =====`);

// Reuse the canonical daily spec from the API (year-to-date consumption:
// Jan 1 -> yesterday). Inventory is fanned out to one unit per configured
// location so the worker scrapes each location on its own.
try {
  const spec = enqueueDailySpec();
  await startOrMergeJob(spec);
  const msg = `${new Date().toISOString()} - Queued daily sync (inventory for all locations + consumption ${spec.fromDate} to ${spec.toDate}). The local worker will execute it.`;
  console.log(msg);
  appendLog(msg);
  process.exit(0);
} catch (e) {
  const msg = `${new Date().toISOString()} - enqueue-daily FAILED: ${e.message}`;
  console.error(msg);
  appendLog(msg);
  process.exit(1);
}
