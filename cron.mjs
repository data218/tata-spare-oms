// cron.mjs – Schedule a daily job to queue inventory and consumption fetches at 10:00 AM.
//
// NOTE: This duplicates the Vercel cron defined in vercel.json. Run only ONE of
// them, otherwise both will enqueue the same daily run (they are now merge-safe,
// but there is no reason to double up).

import { format } from 'date-fns';
import cron from 'node-cron';
import { supabase } from './src/server-config.js';

const JOB_KEY = 'fetch_job';
const ACTIVE_MS = 15 * 60 * 1000; // a freshly-started unit counts as active for this long

function ts() { return new Date().toISOString(); }

function todaySpec() {
  const today = new Date();
  return {
    fromDate: format(new Date(today.getFullYear(), 0, 1), 'MM/dd/yyyy'),
    toDate: format(today, 'MM/dd/yyyy'),
  };
}

// A run is "active" if the worker is mid-unit or units are still pending.
function isActive(job) {
  if (!job || !job.queue || !Array.isArray(job.queue.units)) return false;
  const runningFresh = job.queue.units.some(
    (u) => u.status === 'running' && u.startedAt && (Date.now() - Date.parse(u.startedAt)) < ACTIVE_MS
  );
  const pending = job.queue.units.some((u) => u.status === 'pending');
  return job.status === 'processing' && (runningFresh || pending);
}

async function queueDailyJobs() {
  // Never clobber a run that is already in flight.
  const { data } = await supabase
    .from('tata_bot_settings').select('value').eq('key', JOB_KEY).maybeSingle();
  let current = null;
  if (data?.value) { try { current = JSON.parse(data.value); } catch { /* ignore */ } }
  if (isActive(current)) {
    console.log(`${ts()} – ⏭ A sync is already running; skipping today's scheduled enqueue.`);
    return;
  }

  const { fromDate, toDate } = todaySpec();

  // Build the same per-location unit list the API uses so the worker executes
  // every location individually.
  const { data: locs, error } = await supabase.from('tata_locations').select('location_name');
  if (error) throw error;
  const locations = (locs || []).map((l) => l.location_name).filter(Boolean);
  if (!locations.length) {
    console.log(`${ts()} – ⚠ No locations configured; nothing to queue.`);
    return;
  }

  const payload = {
    status: 'pending',
    type: 'all',
    fromDate,
    toDate,
    targetLocation: 'ALL',
    revivals: 0,
    logs: `<div>${ts()} - Daily cron queued inventory (${locations.length} location(s)) & consumption</div>`,
    progress: { step: 0, total: locations.length + 1 },
    queue: {
      units: [
        { kind: 'consumption', fromDate, toDate, status: 'pending', attempts: 0 },
        ...locations.map((location) => ({ kind: 'inventory', location, status: 'pending', attempts: 0 })),
      ],
      createdAt: new Date().toISOString(),
    },
  };

  const { error: upErr } = await supabase
    .from('tata_bot_settings')
    .upsert({ key: JOB_KEY, value: JSON.stringify(payload) }, { onConflict: 'key' });
  if (upErr) throw upErr;
  console.log(`${ts()} – ✅ Daily jobs queued (${locations.length} location(s) + consumption)`);
}

// Schedule at 10:00 AM every day (local time)
cron.schedule('0 10 * * *', () => {
  queueDailyJobs().catch(err => console.error('Cron job error:', err));
}, {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
});

console.log(`${ts()} – 📅 Cron scheduler started – runs daily at 10:00 AM`);

export { queueDailyJobs };
