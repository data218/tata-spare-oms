const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = supabaseCode.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = supabaseCode.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);

// Let's create a client without auth, just anon key
const supabase = createClient(urlMatch[1], keyMatch[1], { auth: { persistSession: false } });

async function run() {
  const { data, error } = await supabase.from('tata_movement_logs').select('*');
  console.log('Anon fetch:', error ? error.message : `Got ${data.length} rows`);
}
run();
