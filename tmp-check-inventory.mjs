import { createClient } from '@supabase/supabase-js';

const url = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(url, key);

const { data: locations, error: locErr } = await supabase.from('tata_locations').select('location_name');
if (locErr) { console.error('LOCATIONS ERROR:', locErr.message); }
console.log('locations:', locations.map(l => l.location_name).join(', '));

for (const loc of locations) {
  const { count, error } = await supabase
    .from('tata_spare_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('division', loc.location_name);
  if (error) console.log(loc.location_name, '=> ERROR', error.message);
  else console.log(loc.location_name, '=>', count);
}

const all = await supabase.from('tata_spare_inventory').select('*', { count: 'exact', head: true });
console.log('TOTAL =>', all.count, all.error ? all.error.message : '');

const cons = await supabase.from('tata_consumption_data').select('*', { count: 'exact', head: true });
console.log('consumption TOTAL =>', cons.count, cons.error ? cons.error.message : '');