const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabaseCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = supabaseCode.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = supabaseCode.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: inv } = await supabase.from('tata_spare_inventory').select('*').eq('part_no', '288954409901');
  const { data: mov } = await supabase.from('tata_movement_logs').select('*').eq('part_id', '288954409901');

  let code = fs.readFileSync('main.js', 'utf8');
  
  const mapLocation = (dealerName) => {
    if (!dealerName) return 'Narwal';
    const d = dealerName.toLowerCase();
    if (d.includes('channirama') || d.includes('chhanirama')) return 'Channi Rama';
    if (d.includes('smamsamba') || d.includes('supwal')) return 'Supwal';
    if (d.includes('smamkathua') || d.includes('kathua')) return 'Kathua';
    if (d.includes('jammu') || d.includes('narwal') || d.includes('narval')) return 'Narwal';
    return 'Narwal';
  };

  const startProc = code.indexOf('function processRawData');
  const endProc = code.indexOf('return Array.from(grouped.values());', startProc) + 36;
  let procFn = code.substring(startProc, endProc) + '\n}';
  
  // Add some debugging to procFn
  procFn = procFn.replace('movementLogs.forEach(log => {', 'console.log("Movement Logs:", movementLogs.length); movementLogs.forEach(log => {');
  procFn = procFn.replace('existing.currentStock += Number(log.qty) || 0;', 'existing.currentStock += Number(log.qty) || 0; console.log("Added", log.qty, "to", log.part_id);');
  
  eval(procFn); 
  
  const result = processRawData({
    inventory: inv,
    consumption: [],
    priceList: [],
    movementLogs: mov
  });
  
  console.log('Result for part (Channi Rama):', result.find(r => r.partId === '288954409901' && r.location === 'Channi Rama'));
  console.log('Result for part (Narwal):', result.find(r => r.partId === '288954409901' && r.location === 'Narwal'));
}
run();
