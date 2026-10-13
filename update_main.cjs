const fs = require('fs');

function updateMain(filename) {
    let content = fs.readFileSync(filename, 'utf8');

    // 1. Save masterPriceList globally in fetchDashboardData
    const target1 = `return { inventory: inventoryData, consumption: consumptionData, priceList: priceListData, movementLogs: movementLogs };`;
    const inject1 = `window.masterPriceList = priceListData || [];\n    ` + target1;
    if (!content.includes('window.masterPriceList = priceListData')) {
        content = content.replace(target1, inject1);
    }

    // 2. Add Price List UI Logic at the bottom
    if (!content.includes('function renderPriceList')) {
        const uiLogic = `\n
// --- TATA PRICE LIST LOGIC ---
let currentPriceListPage = 0;
const PRICE_LIST_PAGE_SIZE = 50;
let filteredPriceList = [];

function renderPriceList(page = 0) {
  const tbody = document.getElementById('price-list-body');
  if (!tbody) return;
  
  if (page === 0) {
    const searchVal = (document.getElementById('price-list-search')?.value || '').toLowerCase();
    let sourceData = window.masterPriceList || [];
    
    if (searchVal) {
      filteredPriceList = sourceData.filter(p => 
        (p.part_number && p.part_number.toLowerCase().includes(searchVal)) || 
        (p.description && p.description.toLowerCase().includes(searchVal)) ||
        (p.category && p.category.toLowerCase().includes(searchVal))
      );
    } else {
      filteredPriceList = sourceData;
    }
  }
  
  const start = page * PRICE_LIST_PAGE_SIZE;
  const end = Math.min(start + PRICE_LIST_PAGE_SIZE, filteredPriceList.length);
  const pageData = filteredPriceList.slice(start, end);
  
  if (page === 0) tbody.innerHTML = '';
  
  if (filteredPriceList.length === 0 && page === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No price records found.</td></tr>';
    return;
  }
  
  let html = '';
  pageData.forEach(p => {
    html += \`<tr data-part="\${p.part_number}">
      <td class="font-medium">\${p.part_number}</td>
      <td>\${p.description || '-'}</td>
      <td><span class="status-badge status-good">\${p.category || '-'}</span></td>
      <td style="text-align: right; font-weight: bold;">₹\${Number(p.ndp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      <td style="text-align: right;">
        <button class="btn btn-primary btn-edit-price" style="padding: 4px 8px; font-size: 12px; margin-right: 5px;" data-part="\${p.part_number}" data-ndp="\${p.ndp}">Edit</button>
        <button class="btn btn-remove-price" style="padding: 4px 8px; font-size: 12px; background-color: #ef4444; color: white;" data-part="\${p.part_number}">Remove</button>
      </td>
    </tr>\`;
  });
  
  if (page === 0) {
    tbody.innerHTML = html;
  } else {
    tbody.insertAdjacentHTML('beforeend', html);
  }
  
  // Attach Event Listeners
  document.querySelectorAll('.btn-edit-price').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const partNo = e.target.getAttribute('data-part');
      const oldNdp = e.target.getAttribute('data-ndp');
      const newNdpStr = prompt(\`Enter new NDP for part \${partNo}:\`, oldNdp);
      
      if (newNdpStr !== null && newNdpStr.trim() !== '') {
        const newNdp = parseFloat(newNdpStr);
        if (isNaN(newNdp)) {
           alert('Invalid number');
           return;
        }
        
        try {
          const { error } = await supabase.from('tata_price_list').update({ ndp: newNdp }).eq('part_number', partNo);
          if (error) throw error;
          
          // Update local data
          const idx = window.masterPriceList.findIndex(p => p.part_number === partNo);
          if (idx > -1) window.masterPriceList[idx].ndp = newNdp;
          
          alert(\`NDP for \${partNo} successfully updated to ₹\${newNdp}\`);
          
          // Trigger a silent reload of dashboard logic if necessary
          if (typeof loadDashboardData === 'function') loadDashboardData(true);
          else renderPriceList(0); // At least refresh the list
          
        } catch (err) {
          alert('Error updating: ' + err.message);
        }
      }
    });
  });
  
  document.querySelectorAll('.btn-remove-price').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const partNo = e.target.getAttribute('data-part');
      if (confirm(\`Are you sure you want to completely remove \${partNo} from the Master Price List?\`)) {
        try {
          const { error } = await supabase.from('tata_price_list').delete().eq('part_number', partNo);
          if (error) throw error;
          
          // Update local data
          window.masterPriceList = window.masterPriceList.filter(p => p.part_number !== partNo);
          
          alert(\`Part \${partNo} removed.\`);
          renderPriceList(0);
          
        } catch (err) {
          alert('Error removing: ' + err.message);
        }
      }
    });
  });
}

// Setup Search Listener
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('price-list-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPriceListPage = 0;
      renderPriceList(0);
    });
  }
  
  // Tie the view switch to loading data
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-target');
      if (target === 'view-price-list') {
        renderPriceList(0);
      }
    });
  });
});
`;
        content += uiLogic;
    }

    fs.writeFileSync(filename, content);
}

updateMain('main.js');
updateMain('main_debug.js');
