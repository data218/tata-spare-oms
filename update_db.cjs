const fs = require('fs');

// 1. Update main.js
let mainJs = fs.readFileSync('main.js', 'utf8');
mainJs = mainJs.replace(
  "const { error: deleteError } = await supabase.from('tata_spare_inventory').delete().eq('division', locationInput);\\n          if (deleteError) throw new Error(\\\"Failed to clear old inventory: \\\" + deleteError.message);",
  "const { error: deleteError } = await supabase.from('tata_spare_inventory').delete().eq('division', locationInput);\\n          if (deleteError) throw new Error(\\\"Failed to clear old inventory: \\\" + deleteError.message);\\n          \\n          await supabase.from('tata_movement_logs').delete().eq('location', locationInput);"
);
fs.writeFileSync('main.js', mainJs);

// 2. Update movement_entry.js
let movJs = fs.readFileSync('movement_entry.js', 'utf8');

// Add import at top
if (!movJs.includes("import { supabase } from './supabase.js';")) {
  movJs = "import { supabase } from './supabase.js';\\n" + movJs;
}

// Replace submitMovement internals
movJs = movJs.replace(
  `    if (type === 'IN') {
      item.currentStock += qty;
    } else {
      item.currentStock -= qty;
    }

    // Create synthetic movement record for the Movement Table
    if (!window.consumptionData) window.consumptionData = [];
    const newRecord = {
      Date: date,
      MovementType: type,
      "Part ID": part,
      Location: loc,
      Qty: qty,
      Reference: "Manual Entry"
    };
    
    // Add to the front so it shows up at the top
    window.consumptionData.unshift(newRecord);

    // Refresh UI
    refreshAllDashboards();

    // Close and reset
    modal.style.display = 'none';
    qtyInput.value = 1;
    partSelect.value = '';
    if (partNameInput) partNameInput.value = '';
    availQtySpan.textContent = '-';
    // Show success toast or alert
    alert(\`Successfully logged \${type} for \${qty}x \${part} at \${loc}.\`);`,
  `    const oldStock = item.currentStock;
    if (type === 'IN') {
      item.currentStock += qty;
    } else {
      item.currentStock -= qty;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Saving...';
    
    try {
      // 1. Update inventory
      const { error: invErr } = await supabase
        .from('tata_spare_inventory')
        .update({ qty: item.currentStock })
        .eq('part_no', part)
        .eq('division', loc);
      if (invErr) throw invErr;

      // 2. Insert into movement_logs
      const { error: movErr } = await supabase
        .from('tata_movement_logs')
        .insert({
          part_id: part,
          location: loc,
          movement_type: type,
          qty: qty,
          reference: "Manual Entry"
        });
      if (movErr) throw movErr;
    } catch (e) {
      console.error(e);
      errorMsg.textContent = 'Failed to save to database: ' + e.message;
      errorMsg.style.display = 'block';
      item.currentStock = oldStock; // Revert local
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Submit Movement';
      return;
    }
    
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Submit Movement';

    // Create synthetic movement record for the UI temporarily so it shows up instantly
    if (!window.consumptionData) window.consumptionData = [];
    const newRecord = {
      Date: date,
      MovementType: type,
      "Part ID": part,
      Location: loc,
      Qty: qty,
      Reference: "Manual Entry"
    };
    window.consumptionData.unshift(newRecord);

    // Refresh UI
    refreshAllDashboards();

    // Close and reset
    modal.style.display = 'none';
    qtyInput.value = 1;
    partSelect.value = '';
    if (partNameInput) partNameInput.value = '';
    availQtySpan.textContent = '-';
    // Show success toast or alert
    alert(\`Successfully logged \${type} for \${qty}x \${part} at \${loc}.\`);`
);

// Make submitMovement async
movJs = movJs.replace(
  "function submitMovement() {",
  "async function submitMovement() {"
);

fs.writeFileSync('movement_entry.js', movJs);
console.log('updated both');
