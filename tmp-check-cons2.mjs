import { createClient } from '@supabase/supabase-js';

const url = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(url, key);

// Sample consumption rows to see columns
const c = await supabase.from('tata_consumption_data').select('*').limit(3);
console.log('--- consumption sample keys ---');
for (const r of c.data || []) console.log(JSON.stringify(r).slice(0, 500));

// sold_qty / qty distribution + distinct dates
const d = await supabase.from('tata_consumption_data').select('date, sold_qty, qty, part_no').limit(5);
if (d.data) console.log('sample:', d.data);

// count distinct part_no and browser of date range
const dates = await supabase.from('tata_consumption_data').select('date').limit(10);
console.log('date samples:', dates.data?.map(x => x.date));

// Check max sold qty for a popular part
const agg = await supabase.from('tata_consumption_data').select('sold_qty, part_no').limit(10);
console.log('sold qty samples:', agg.data?.map(x => ({ pn: x.part_no, sq: x.sold_qty })));