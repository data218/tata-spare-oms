const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = supabaseCode.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = supabaseCode.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: inv } = await supabase.from('tata_spare_inventory').select('*').eq('part_no', '288954409901');
  const { data: mov } = await supabase.from('tata_movement_logs').select('*').eq('part_id', '288954409901');
  console.log('Inventory Rows:', inv);
  console.log('Movement Rows:', mov);
}
run();
