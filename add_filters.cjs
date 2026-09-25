const fs = require('fs');
let mainJs = fs.readFileSync('main.js', 'utf8');

const tableFilterInject = `
  'reorder-table-body': {
    getRows: () => window.reorderData || [],
    fields: {
      'Priority': 'priority',
      'Part Details': 'partId', 
      'Location / Supplier': 'location',
      'Current Stock': 'currentStock',
      'Min / Max': 'minStock',
      'Avg Cons/Day': 'avgCons',
      'Days Stock': 'daysOfStock',
      'Order Qty': 'recQty',
      'Reason / Risk': 'reason'
    },
    render: (rows) => { 
      if (!window.tableFilterData) window.tableFilterData = {};
      window.tableFilterData['reorder-table-body'] = rows; 
      if(typeof window.filterReorderData === 'function') window.filterReorderData(); 
    }
  },
  'movement-table-body': {
    getRows: () => window.movementData || [],
    fields: {
      'Date': 'date',
      'Direction': 'direction',
      'Type': 'type',
      'Part No': 'partNo',
      'Description': 'description',
      'Location': 'location',
      'Qty': 'qty',
      'Value': 'value',
      'Reference': 'reference'
    },
    render: (rows) => { 
      if (!window.tableFilterData) window.tableFilterData = {};
      window.tableFilterData['movement-table-body'] = rows; 
      if(typeof window.filterMovementData === 'function') window.filterMovementData(); 
    }
  },
`;

mainJs = mainJs.replace("'recent-activity-table': {", tableFilterInject + "\n  'recent-activity-table': {");

fs.writeFileSync('main.js', mainJs, 'utf8');

// Also update reorder.js
let reorderJs = fs.readFileSync('reorder.js', 'utf8');
reorderJs = reorderJs.replace("let filtered = [...window.reorderData];", "let filtered = window.tableFilterData && window.tableFilterData['reorder-table-body'] ? [...window.tableFilterData['reorder-table-body']] : [...window.reorderData];");

// Make sure to call markFilterHeaders at the end of initReorderModule
if (reorderJs.includes('filterReorderData();')) {
   reorderJs = reorderJs.replace(
     /function initReorderModule\(\) \{[\s\S]*?filterReorderData\(\);\s*\}/,
     `$&
  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);`
   );
}
fs.writeFileSync('reorder.js', reorderJs, 'utf8');


// Also update movement.js
let movementJs = fs.readFileSync('movement.js', 'utf8');
movementJs = movementJs.replace("let data = [...window.movementData];", "let data = window.tableFilterData && window.tableFilterData['movement-table-body'] ? [...window.tableFilterData['movement-table-body']] : [...window.movementData];");

// Make sure to call markFilterHeaders at the end of initMovementModule
if (movementJs.includes('filterMovementData();')) {
   movementJs = movementJs.replace(
     /window\.initMovementModule = async function\(\) \{[\s\S]*?filterMovementData\(\);\s*\};/,
     `$&
  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);`
   );
}
fs.writeFileSync('movement.js', movementJs, 'utf8');

console.log("Updated filters in main.js, reorder.js, movement.js");
