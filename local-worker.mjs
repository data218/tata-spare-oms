import { fetchConsumptionData } from './src/consumption_scraper.js';
import { fetchInventoryData } from './src/inventory_scraper.js';
import { supabase } from './src/server-config.js';

const JOB_KEY = 'fetch_job';
const MAX_LOG_CHARS = 40000;
const STALE_UNIT_MS = 4 * 60 * 1000;
const MAX_UNIT_ATTEMPTS = 3;

console.log('===========================================================');
console.log('🤖 TATA BOT: Local Background Worker Started!');
console.log('Leave this window open in the background.');
console.log('You can now use the "Fetch Data" buttons in your web app!');
console.log('===========================================================\n');

const pad = (n) => n.toString().padStart(2, '0');
const formatDate = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
const trailingDays = (days) => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: formatDate(from), to: formatDate(to) };
};

async function processQueue() {
  const { data, error } = await supabase.from('tata_bot_settings').select('value').eq('key', JOB_KEY).maybeSingle();
  if (error || !data) return;

  let job;
  try { job = JSON.parse(data.value); } catch { return; }

  if (!job || !job.queue || !Array.isArray(job.queue.units)) return;
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'done') return;
  
  // Recover stale units
  const now = Date.now();
  let hasRunning = false;
  for (const u of job.queue.units) {
    if (u.status === 'running') {
      if (now - Date.parse(u.startedAt) > STALE_UNIT_MS) { 
        u.status = 'pending'; u.error = undefined; 
      }
      else { hasRunning = true; }
    }
  }

  if (hasRunning) return; // Wait for current job to finish

  const next = job.queue.units.find((u) => u.status === 'pending' && (u.attempts || 0) < MAX_UNIT_ATTEMPTS);
  
  if (!next) {
    job.status = 'completed';
    job.logs += `<div>${new Date().toISOString()} - Job completed.</div>`;
    await supabase.from('tata_bot_settings').upsert({ key: JOB_KEY, value: JSON.stringify(job) }, { onConflict: 'key' });
    console.log(`[${new Date().toLocaleTimeString()}] ✅ All tasks in queue completed! Waiting for more...`);
    return;
  }

  // Claim unit
  next.status = 'running';
  next.startedAt = new Date().toISOString();
  next.attempts = (next.attempts || 0) + 1;
  job.status = 'processing';
  
  const label = next.kind === 'consumption' ? 'consumption report' : `inventory for ${next.location}`;
  job.logs += `<div>${new Date().toISOString()} - Picked up ${label}.</div>`;
  
  // Update Supabase to claim
  const { data: updateData, error: updateError } = await supabase.from('tata_bot_settings').update({ value: JSON.stringify(job) }).eq('key', JOB_KEY).eq('value', data.value).select('value');
  if (updateError || !updateData || updateData.length === 0) return; // someone else claimed

  console.log(`[${new Date().toLocaleTimeString()}] ⏳ Processing: ${label}...`);
  
  const broadcast = (msg) => { 
    job.logs += `<div>${new Date().toISOString()} - &nbsp;&nbsp;&nbsp;${msg}</div>`; 
  };
  
  try {
    let rows;
    if (next.kind === 'consumption') {
      const fallback = trailingDays(30);
      rows = await fetchConsumptionData(next.fromDate || job.fromDate || fallback.from, next.toDate || job.toDate || fallback.to, broadcast);
    } else {
      rows = await fetchInventoryData(broadcast, next.location);
    }
    next.status = 'done';
    next.finishedAt = new Date().toISOString();
    next.rows = rows;
    job.logs += `<div>${new Date().toISOString()} - Completed ${label}: ${rows} records fetched.</div>`;
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Success: ${label} (${rows} rows)`);
  } catch (err) {
    const permanent = next.attempts >= MAX_UNIT_ATTEMPTS;
    next.status = permanent ? 'failed' : 'pending';
    next.error = err.message || String(err);
    job.logs += `<div>${new Date().toISOString()} - ERROR: ${label} failed: ${next.error}</div>`;
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Failed: ${label} - ${next.error}`);
  }

  // Write results back
  const { data: freshData } = await supabase.from('tata_bot_settings').select('value').eq('key', JOB_KEY).maybeSingle();
  if (freshData) {
    const freshJob = JSON.parse(freshData.value);
    const unitIndex = job.queue.units.findIndex(u => u.kind === next.kind && u.location === next.location);
    if (unitIndex !== -1) {
      freshJob.queue.units[unitIndex] = next;
      if (job.logs.length > 40000) job.logs = '<div>... earlier steps truncated ...</div>' + job.logs.slice(-40000);
      freshJob.logs = job.logs;
      freshJob.status = 'processing'; // will be marked complete on next loop
      await supabase.from('tata_bot_settings').upsert({ key: JOB_KEY, value: JSON.stringify(freshJob) }, { onConflict: 'key' });
    }
  }
}

// Polling loop
setInterval(processQueue, 3000);
