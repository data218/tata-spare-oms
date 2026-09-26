const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = supabaseCode.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = supabaseCode.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  // Test reading without auth
  const { data: mov, error } = await supabase.from('tata_movement_logs').select('*');
  console.log('Without Auth Read:', mov ? mov.length : 0, 'Error:', error);
}
run();
