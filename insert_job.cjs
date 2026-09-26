const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const job = {
    status: 'pending',
    type: 'inventory',
    fromDate: '01/01/2026',
    toDate: '09/25/2026',
    targetLocation: 'ALL',
    logs: '<div>Start</div>'
};

supabase.from('tata_bot_settings').upsert({ key: 'fetch_job', value: JSON.stringify(job) }, { onConflict: 'key' }).then(() => {
    console.log('Inserted pending job');
    process.exit(0);
});
