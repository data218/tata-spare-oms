// cron.mjs – Schedule daily job to queue inventory and consumption fetches at 10:00 AM

import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import cron from 'node-cron';

const SUPABASE_URL = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JOB_KEY = 'fetch_job';

function ts() { return new Date().toISOString(); }

function createJobPayload() {
  const today = new Date();
  const from = format(new Date(today.getFullYear(), 0, 1), 'MM/dd/yyyy'); // Jan 1 of current year
  const to = format(today, 'MM/dd/yyyy');
  return {
    status: 'pending',
    queue: {
      units: [
        { kind: 'inventory', location: 'ALL', status: 'pending', attempts: 0 },
        { kind: 'consumption', status: 'pending', attempts: 0 }
      ]
    },
    fromDate: from,
    toDate: to,
    logs: `<div>${ts()} - Daily schedule added inventory & consumption jobs</div>`
  };
}

async function queueDailyJobs() {
  const payload = createJobPayload();
  await supabase.from('tata_bot_settings')
    .upsert({ key: JOB_KEY, value: JSON.stringify(payload) }, { onConflict: 'key' });
  console.log(`${ts()} – ✅ Daily jobs queued (inventory & consumption)`);
}

// Schedule at 10:00 AM every day (local time)
cron.schedule('0 10 * * *', () => {
  queueDailyJobs().catch(err => console.error('Cron job error:', err));
}, {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
});

console.log(`${ts()} – 📅 Cron scheduler started – runs daily at 10:00 AM`);

export { queueDailyJobs };
