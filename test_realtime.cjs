const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('tata_bot_settings').upsert({ key: 'fetch_job', value: JSON.stringify({ status: 'test' }) }, { onConflict: 'key' });
  console.log('Upsert:', error || 'Success');
  
  const { data: readData, error: readError } = await supabase.from('tata_bot_settings').select('*').eq('key', 'fetch_job');
  console.log('Read:', readData);
}
test();
