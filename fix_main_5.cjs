const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

// Replace using regex for flexibility with whitespace/newlines
const regex = /\}\);\s*\/\/\s*Stock value = available \(on hand\) qty x price list NDP\s*const now = new Date\(\);/;

const replacement = `});

  // Apply manual movement logs
  movementLogs.forEach(log => {
    const loc = mapLocation(log.location);
    const key = log.part_id + '_' + loc;
    const existing = grouped.get(key);
    if (existing) {
      if (log.movement_type === 'IN') {
        existing.currentStock += Number(log.qty) || 0;
      } else if (log.movement_type === 'OUT') {
        existing.currentStock -= Number(log.qty) || 0;
      }
    } else {
      // Create it if it doesn't exist
      const parts = key.split('_');
      const pn = parts[0];
      const priceData = priceByPart.get(pn) || {};
      
      grouped.set(key, {
        partId: pn,
        model: priceData.description || 'Unknown',
        location: loc,
        productCategory: (priceData.category || 'Uncategorized').trim().toUpperCase(),
        currentStock: log.movement_type === 'IN' ? (Number(log.qty) || 0) : -(Number(log.qty) || 0),
        reserved: 0,
        inTransit: 0,
        stockValue: 0,
        ndpPrice: priceData.ndp || 0,
        min: 5,
        demand: 0, 
        consumption30d: 0,
        last_receipt: log.date || '',
        ageingDays: -1
      });
    }
  });

  // Stock value = available (on hand) qty x price list NDP
  const now = new Date();`;

if (regex.test(s)) {
    s = s.replace(regex, replacement);
    fs.writeFileSync('main.js', s);
    console.log('main.js updated with manual movement logs.');
} else {
    console.log('Regex did not match!');
}
