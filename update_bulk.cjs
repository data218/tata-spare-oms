const fs = require('fs');

let movJs = fs.readFileSync('movement_entry.js', 'utf8');

movJs = movJs.replace(
  "reader.onload = function(e) {",
  "reader.onload = async function(e) {"
);

movJs = movJs.replace(
  `          // Process success
          if (type === 'IN') {
            item.currentStock += qty;
          } else {
            item.currentStock -= qty;
          }

          if (!window.consumptionData) window.consumptionData = [];
          window.consumptionData.unshift({
            Date: date,
            MovementType: type,
            "Part ID": part,
            Location: loc,
            Qty: qty,
            Reference: ref
          });
          successCount++;
        });

        refreshAllDashboards();

        if (errorCount === 0) {`,
  `          // Process success locally
          if (type === 'IN') {
            item.currentStock += qty;
          } else {
            item.currentStock -= qty;
          }

          if (!window.consumptionData) window.consumptionData = [];
          window.consumptionData.unshift({
            Date: date,
            MovementType: type,
            "Part ID": part,
            Location: loc,
            Qty: qty,
            Reference: ref
          });
          
          successCount++;
        });
        
        // Push all successful movements to Supabase in a loop
        if (successCount > 0) {
            btnSubmitBulk.disabled = true;
            btnSubmitBulk.textContent = 'Saving to Database...';
            
            try {
              for (const record of window.consumptionData.slice(0, successCount)) {
                  // Find the updated stock
                  const item = window.originalProcessedParts.find(p => p.location === record.Location && p.partId === record["Part ID"]);
                  
                  // Update inventory table
                  await supabase
                    .from('tata_spare_inventory')
                    .update({ qty: item.currentStock })
                    .eq('part_no', record["Part ID"])
                    .eq('division', record.Location);
                    
                  // Insert into logs
                  await supabase
                    .from('tata_movement_logs')
                    .insert({
                      part_id: record["Part ID"],
                      location: record.Location,
                      movement_type: record.MovementType,
                      qty: record.Qty,
                      reference: record.Reference,
                      date: record.Date
                    });
              }
            } catch (err) {
              console.error("Bulk upload DB error:", err);
              bulkError.innerHTML = "Saved partially. DB Error: " + err.message;
              bulkError.style.display = 'block';
            }
            
            btnSubmitBulk.disabled = false;
            btnSubmitBulk.textContent = 'Process Bulk Upload';
        }

        refreshAllDashboards();

        if (errorCount === 0) {`
);

// We need to define btnSubmitBulk before we can use it in reader.onload
movJs = movJs.replace(
  "const bulkFileInput = document.getElementById('inout-bulk-file');",
  "const bulkFileInput = document.getElementById('inout-bulk-file');\\n  const btnSubmitBulk = document.getElementById('btn-submit-bulk-inout');"
);


fs.writeFileSync('movement_entry.js', movJs);
console.log('bulk updated');
