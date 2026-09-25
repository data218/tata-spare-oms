const fs = require('fs');
let mainJS = fs.readFileSync('main.js', 'utf8');

// FIX 1: applyAccessControls duplicate
const applyTarget = `window.applyAccessControls = function(user) {
  const syncBtn = document.getElementById('sync-data-btn');
  const locationFilter = document.getElementById('location-select');
  const settingsMenu = document.querySelector('[data-target="view-settings"]');
  const devStatusMenu = document.querySelector('[data-target="view-dev-status"]');
  const sidebarDivider = document.getElementById('sidebar-divider');
  
  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    if (syncBtn) syncBtn.style.setProperty('display', 'none', 'important');
    if (settingsMenu) settingsMenu.style.setProperty('display', 'none', 'important');
    if (devStatusMenu) devStatusMenu.style.setProperty('display', 'none', 'important');
    if (sidebarDivider) sidebarDivider.style.setProperty('display', 'none', 'important');
    
    if (locationFilter && user.location !== 'ALL') {
      locationFilter.value = user.location;
      locationFilter.disabled = true;
      if(typeof window.renderDashboard === 'function') window.renderDashboard();
    }
  }
};`;
if (mainJS.includes(applyTarget)) {
  // It's already fine.
}

const applyTargetOld = `function applyAccessControls(user) {
  const syncBtn = document.getElementById('sync-data-btn');
  const locationFilter = document.getElementById('location-select');
  const settingsMenu = document.querySelector('[data-target="view-settings"]');
  const devStatusMenu = document.querySelector('[data-target="view-dev-status"]');
  const sidebarDivider = document.getElementById('sidebar-divider');
  
  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    if (syncBtn) syncBtn.style.setProperty('display', 'none', 'important');
    if (settingsMenu) settingsMenu.style.setProperty('display', 'none', 'important');
    if (devStatusMenu) devStatusMenu.style.setProperty('display', 'none', 'important');
    if (sidebarDivider) sidebarDivider.style.setProperty('display', 'none', 'important');
    
    if (locationFilter && user.location !== 'ALL') {
      locationFilter.value = user.location;
      locationFilter.disabled = true;
      // Force refresh data if filter changed
      if(typeof renderDashboard === 'function') renderDashboard();
    }
  }
}`;
mainJS = mainJS.replace(applyTargetOld, applyTarget);

// FIX 2: processRawData
const processRawTarget = `function processRawData({ inventory, consumption, priceList = [] }) {
  const grouped = new Map();
  
  // Pre-process price list data
  const priceByPart = new Map();
  priceList.forEach(row => {
    priceByPart.set(row.part_number, {
      ndp: parseFloat(row.ndp) || 0,
      description: row.description || '',
      category: row.category || ''
    });
  });

  // Pre-process consumption data
  const consumptionByPart = new Map();
  consumption.forEach(row => {
    const pn = row.part_no || row.part_number; // Fallback just in case
    const qty = parseInt(row.sold_qty) || 0;
    if (consumptionByPart.has(pn)) {
      consumptionByPart.set(pn, consumptionByPart.get(pn) + qty);
    } else {
      consumptionByPart.set(pn, qty);
    }
  });
  
  inventory.forEach(row => {
    const pn = row.part_number;
    const consQty = consumptionByPart.get(pn) || 0;
    const priceData = priceByPart.get(pn) || {};
    
    if (!grouped.has(pn)) {
      grouped.set(pn, {
        partId: pn,
        model: priceData.description || row.description || 'Unknown',
        location: row.location || 'NARWAL',
        productCategory: (priceData.category || row.product_category || 'Uncategorized').trim().toUpperCase(),
        currentStock: 0,
        reserved: 0,
        inTransit: 0,
        stockValue: 0,
        ndpPrice: priceData.ndp || 0,
        min: 5,
        demand: Math.ceil(consQty / 4), // Simple mocked demand based on real consumption
        consumption30d: consQty
      });
    }
    const existing = grouped.get(pn);
    const avail = (row.availability || '').toLowerCase();
    
    if (avail.includes('on hand')) {
      existing.currentStock += row.qty;
      existing.stockValue += (existing.ndpPrice * row.qty) || (row.total_price || 0);
    } else if (avail.includes('transit')) {
      existing.inTransit += row.qty;
    } else if (avail.includes('reserv')) {
      existing.reserved += row.qty;
    } else {
      existing.currentStock += row.qty;
      existing.stockValue += (existing.ndpPrice * row.qty) || (row.total_price || 0);
    }
  });

  return Array.from(grouped.values());
}`;

const processRawReplacement = `function processRawData({ inventory, consumption, priceList = [] }) {
  const grouped = new Map();
  
  // Pre-process price list data
  const priceByPart = new Map();
  priceList.forEach(row => {
    priceByPart.set(row.part_number, {
      ndp: parseFloat(row.ndp) || 0,
      description: row.description || '',
      category: row.category || ''
    });
  });

  // Helper to map raw dealer names to our standard locations
  const mapLocation = (dealerName) => {
    if (!dealerName) return 'Narwal';
    const d = dealerName.toLowerCase();
    if (d.includes('channirama') || d.includes('chhanirama')) return 'Channi Rama';
    if (d.includes('smamsamba') || d.includes('supwal')) return 'Supwal';
    if (d.includes('smamkathua') || d.includes('kathua')) return 'Kathua';
    if (d.includes('jammu') || d.includes('narwal') || d.includes('narval')) return 'Narwal';
    return 'Narwal'; // Default
  };

  // Pre-process consumption data grouped by Part + Location
  const consumptionByPartLoc = new Map();
  consumption.forEach(row => {
    const pn = row.part_no || row.part_number; 
    const loc = mapLocation(row.dealer);
    const key = pn + '_' + loc;
    
    const qty = parseInt(row.sold_qty) || 0;
    if (consumptionByPartLoc.has(key)) {
      consumptionByPartLoc.set(key, consumptionByPartLoc.get(key) + qty);
    } else {
      consumptionByPartLoc.set(key, qty);
    }
  });
  
  inventory.forEach(row => {
    const pn = row.part_no || row.part_number;
    const loc = row.location_1 || row.division || 'Narwal';
    const standardLoc = mapLocation(loc);
    const key = pn + '_' + standardLoc;
    
    const consQty = consumptionByPartLoc.get(key) || 0;
    const priceData = priceByPart.get(pn) || {};
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        partId: pn,
        model: priceData.description || row.description || 'Unknown',
        location: standardLoc,
        productCategory: (row.product_category || priceData.category || 'Uncategorized').trim().toUpperCase(),
        currentStock: 0,
        reserved: 0,
        inTransit: 0,
        stockValue: 0,
        ndpPrice: priceData.ndp || 0,
        min: 5,
        demand: Math.ceil(consQty / 4), 
        consumption30d: consQty,
        last_receipt: row.last_receipt || row.fetched_at || ''
      });
    }
    const existing = grouped.get(key);
    const avail = (row.availability || '').toLowerCase();
    
    if (avail.includes('on hand')) {
      existing.currentStock += row.qty;
    } else if (avail.includes('transit')) {
      existing.inTransit += row.qty;
    } else if (avail.includes('reserv')) {
      existing.reserved += row.qty;
    } else {
      existing.currentStock += row.qty;
    }
  });

  // Include consumption that has NO inventory record
  consumptionByPartLoc.forEach((consQty, key) => {
    if (!grouped.has(key)) {
      const parts = key.split('_');
      const pn = parts[0];
      const loc = parts[1];
      const priceData = priceByPart.get(pn) || {};
      
      grouped.set(key, {
        partId: pn,
        model: priceData.description || 'Unknown',
        location: loc,
        productCategory: (priceData.category || 'Uncategorized').trim().toUpperCase(),
        currentStock: 0,
        reserved: 0,
        inTransit: 0,
        stockValue: 0,
        ndpPrice: priceData.ndp || 0,
        min: 5,
        demand: Math.ceil(consQty / 4), 
        consumption30d: consQty,
        last_receipt: ''
      });
    }
  });

  // Calculate stock values
  for (const part of grouped.values()) {
    part.stockValue = part.ndpPrice * part.currentStock;
  }

  return Array.from(grouped.values());
}`;
mainJS = mainJS.replace(processRawTarget, processRawReplacement);

// FIX 3: renderHealthTable
const renderHealthTarget = `        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = \`
          <td style="padding: 8px 12px; font-weight: 500;">\${part.partId}</td>
          <td style="padding: 8px 12px; color: var(--text-secondary);">\${part.model}</td>
          <td style="padding: 8px 12px;">\${part.location}</td>
          <td style="padding: 8px 12px;">\${part.productCategory || 'TATA'}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">\${part.currentStock}</td>
          <td style="padding: 8px 12px; text-align: right;">₹\${(part.stockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
          <td style="padding: 8px 12px; text-align: center;"><span class="h-badge \${badgeClass}">\${badgeText}</span></td>
        \`;
        tbody.appendChild(tr);`;

const renderHealthReplacement = `        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = \`
          <td style="padding: 8px 12px; font-weight: 500;">\${part.partId}</td>
          <td style="padding: 8px 12px; color: var(--text-secondary);">\${part.model}</td>
          <td style="padding: 8px 12px;">\${part.location}</td>
          <td style="padding: 8px 12px;">\${part.productCategory || 'TATA'}</td>
          <td style="padding: 8px 12px; text-align: right; color: #10b981; font-weight: 500;">₹\${(part.ndpPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">\${part.currentStock}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #3b82f6;">₹\${(part.stockValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px 12px; text-align: center;"><span class="h-badge \${badgeClass}">\${badgeText}</span></td>
        \`;
        tbody.appendChild(tr);`;

mainJS = mainJS.replace(renderHealthTarget, renderHealthReplacement);

fs.writeFileSync('main.js', mainJS);
console.log('Patch complete.');
