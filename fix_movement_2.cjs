const fs = require('fs');
let s = fs.readFileSync('movement.js', 'utf8');

const target = `  // 2. Generate synthetic IN transactions based on Current Stock + Total OUT
  if (window.originalProcessedParts && window.originalProcessedParts.length > 0) {`;

const replacement = `  // 1.5. Apply Manual Movement Logs (IN/OUT)
  const manualLogs = window.rawInventoryData?.movementLogs || [];
  if (manualLogs.length > 0) {
    manualLogs.forEach((log, index) => {
      let qtyRaw = parseFloat(log.qty) || 0;
      const isLube = false; // We can't know for sure without looking up, let's look it up
      const invPart = window.originalProcessedParts?.find(p => p.partId === log.part_id && mapLocation(p.location) === mapLocation(log.location));
      const isLubeFinal = invPart?.productCategory?.toUpperCase().includes('LUB') || false;
      const ndpPrice = invPart?.ndpPrice || 0;
      
      let finalQty = qtyRaw;
      if (isLubeFinal) finalQty = finalQty / 1000;
      
      const value = ndpPrice > 0 ? (finalQty * ndpPrice) : 0;
      
      transactions.push({
        id: \`MANUAL-\${log.id || index}\`,
        date: log.date ? new Date(log.date) : new Date(),
        direction: log.movement_type === 'IN' ? 'IN' : 'OUT',
        type: 'MANUAL',
        partNo: log.part_id,
        description: invPart ? invPart.model : 'Manual Entry',
        location: mapLocation(log.location),
        qty: finalQty,
        value: value,
        reference: log.reference || '-',
        isLube: isLubeFinal
      });
    });
  }

  // 2. Generate synthetic IN transactions based on Current Stock + Total OUT
  if (window.originalProcessedParts && window.originalProcessedParts.length > 0) {`;

s = s.replace(target, replacement);
fs.writeFileSync('movement.js', s);
console.log('movement.js updated.');
