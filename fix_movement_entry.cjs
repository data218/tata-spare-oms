const fs = require('fs');
let s = fs.readFileSync('movement_entry.js', 'utf8');

const target = `    try {
      // 1. Update inventory
      const { error: invErr } = await supabase
        .from('tata_spare_inventory')
        .update({ qty: item.currentStock })
        .eq('part_no', part)
        .eq('division', loc);
      if (invErr) throw invErr;

      // 2. Insert into movement_logs`;

const replacement = `    try {
      // (Inventory is calculated dynamically based on movement_logs now, so we don't update tata_spare_inventory directly)

      // Insert into movement_logs`;

s = s.replace(target, replacement);

const targetBulk = `        // 1. Update Inventory
        const { error: invErr } = await supabase
          .from('tata_spare_inventory')
          .update({ qty: item.currentStock })
          .eq('part_no', part)
          .eq('division', loc);

        if (invErr) throw invErr;

        // 2. Insert into Movement logs`;

const replacementBulk = `        // (Inventory is calculated dynamically based on movement_logs now, so we don't update tata_spare_inventory directly)

        // Insert into Movement logs`;

s = s.replace(targetBulk, replacementBulk);
fs.writeFileSync('movement_entry.js', s);
console.log('movement_entry.js updated.');
