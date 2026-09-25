import { createClient } from '@supabase/supabase-js';

const url = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(url, key);

const total = await supabase.from('tata_consumption_data').select('*', { count: 'exact', head: true });
console.log('TOTAL consumption rows =>', total.count, total.error ? total.error.message : '');

const { data: divs } = await supabase.from('tata_consumption_data').select('division');
if (divs) {
  const byDiv = {};
  for (const r of divs) byDiv[r.division] = (byDiv[r.division] || 0) + 1;
  for (const [d, c] of Object.entries(byDiv)) console.log('division', d, '=>', c);
}

const sample = await supabase.from('tata_consumption_data').select('*').limit(3);
console.log('sample rows:');
for (const r of sample.data || []) console.log(JSON.stringify(r).slice(0, 400));

const dates = await supabase.from('tata_consumption_data').select('date').order('date', { ascending: false }).limit(3);
console.log('latest dates:');
for (const r of dates.data || []) console.log(JSON.stringify(r), typeof r.date);