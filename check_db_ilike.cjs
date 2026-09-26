const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = supabaseCode.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = supabaseCode.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const filterStr = '%' + 'Channi Rama'.replace(/\s+/g, '%') + '%';
  const { data: inv1 } = await supabase.from('tata_spare_inventory').select('id, division').ilike('division', filterStr).limit(5);
  
  console.log('ilike count:', inv1 ? inv1.length : 0);
}
run();
