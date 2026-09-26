const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

const target1 = `    const [inventoryData, consumptionData, priceListData] = await Promise.all([
      fetchTableData('tata_spare_inventory', filter, 'part_no, division, qty, availability, product_category, description, last_receipt, fetched_at'),
      fetchTableData('tata_consumption_data', filter, '*'),
      fetchTableData('tata_price_list', null, 'part_number, ndp, description, category')
    ]);
    
    // Removed debug UI
    
    return { inventory: inventoryData, consumption: consumptionData, priceList: priceListData };`;

const replacement1 = `    const [inventoryData, consumptionData, priceListData, movementLogsData] = await Promise.all([
      fetchTableData('tata_spare_inventory', filter, 'part_no, division, qty, availability, product_category, description, last_receipt, fetched_at'),
      fetchTableData('tata_consumption_data', filter, '*'),
      fetchTableData('tata_price_list', null, 'part_number, ndp, description, category'),
      window.supabase.from('tata_movement_logs').select('*')
    ]);
    
    let movementLogs = movementLogsData.data || [];
    if (filter) {
      movementLogs = movementLogs.filter(l => l.location === filter);
    }
    
    return { inventory: inventoryData, consumption: consumptionData, priceList: priceListData, movementLogs };`;

s = s.replace(target1, replacement1);

const target2 = `function processRawData({ inventory, consumption, priceList = [] }) {`;
const replacement2 = `function processRawData({ inventory, consumption, priceList = [], movementLogs = [] }) {`;
s = s.replace(target2, replacement2);

const target3 = `  });

  // Stock value = available (on hand) qty x price list NDP
  const now = new Date();`;
const replacement3 = `  });

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
      const priceData = priceByPart.get(log.part_id) || {};
      grouped.set(key, {
        partId: log.part_id,
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

s = s.replace(target3, replacement3);

fs.writeFileSync('main.js', s);
console.log('main.js updated.');
