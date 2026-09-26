const fs = require('fs');

let s = fs.readFileSync('main.js', 'utf8');

const target = `    const [inventoryData, consumptionData, priceListData] = await Promise.all([
      fetchTableData('tata_spare_inventory', filter, 'part_no, division, qty, availability, product_category, description, last_receipt, fetched_at'),
      fetchTableData('tata_consumption_data', filter, '*'),
      fetchTableData('tata_price_list', null, 'part_number, ndp, description, category')
    ]);
    
    // Removed debug UI
    
    return { inventory: inventoryData, consumption: consumptionData, priceList: priceListData };`;

const replacement = `    const [inventoryData, consumptionData, priceListData, movementLogsData] = await Promise.all([
      fetchTableData('tata_spare_inventory', filter, 'part_no, division, qty, availability, product_category, description, last_receipt, fetched_at'),
      fetchTableData('tata_consumption_data', filter, '*'),
      fetchTableData('tata_price_list', null, 'part_number, ndp, description, category'),
      window.supabase ? window.supabase.from('tata_movement_logs').select('*') : { data: [] }
    ]);
    
    let movementLogs = movementLogsData.data || [];
    if (filter) {
      movementLogs = movementLogs.filter(l => {
         if (!l.location) return false;
         const d1 = l.location.toLowerCase().replace(/\\s+/g, '');
         const d2 = filter.toLowerCase().replace(/\\s+/g, '');
         return d1 === d2;
      });
    }
    
    return { inventory: inventoryData, consumption: consumptionData, priceList: priceListData, movementLogs: movementLogs };`;

s = s.replace(target, replacement);

fs.writeFileSync('main.js', s);
console.log('main.js updated with fetch movement logs fix');
