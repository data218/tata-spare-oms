const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const code = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = code.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = code.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);
supabase.from('tata_spare_inventory').select('division').then(res => {
  const divs = new Set(res.data.map(d => d.division));
  console.log('Divisions:', Array.from(divs));
});
