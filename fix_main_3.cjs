const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

// We literally search for backslash-n
const badStr = "const { error: deleteError } = await supabase.from('tata_spare_inventory').delete().eq('division', locationInput);\\n          await supabase.from('tata_movement_logs').delete().eq('location', locationInput);\\n";

const goodStr = `const { error: deleteError } = await supabase.from('tata_spare_inventory').delete().eq('division', locationInput);
          await supabase.from('tata_movement_logs').delete().eq('location', locationInput);
`;

s = s.replace(badStr, goodStr);

fs.writeFileSync('main.js', s);
