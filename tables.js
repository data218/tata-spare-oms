// Pagination State for Dashboard Tables
window.healthPage = 1;
window.demandPage = 1;
window.consPage = 1;
window.healthSearch = '';
window.demandSearch = '';
window.consSearch = '';
const ITEMS_PER_PAGE = 10;

window.renderHealthTable = function() {
  const tbody = document.getElementById('health-table-body');
  if(!tbody) return;
  
  let data = window.originalProcessedParts || [];
  if (window.healthSearch) {
    const s = window.healthSearch.toLowerCase();
    data = data.filter(p => p.partId.toLowerCase().includes(s) || (p.model && p.model.toLowerCase().includes(s)));
  }
  
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  if (window.healthPage > totalPages) window.healthPage = totalPages;
  if (window.healthPage < 1) window.healthPage = 1;
  
  const start = (window.healthPage - 1) * ITEMS_PER_PAGE;
  const pageData = data.slice(start, start + ITEMS_PER_PAGE);
  
  tbody.innerHTML = '';
  pageData.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.partId}</td>
      <td title="${p.model}">${p.model.length > 35 ? p.model.substring(0,35)+'...' : p.model}</td>
      <td>${p.available}</td>
      <td>${p.consumption30d}</td>
      <td><span class="status-badge ${p.status.class}">${p.status.text}</span></td>
    `;
    tbody.appendChild(tr);
  });
  
  if(document.getElementById('h-page-start')) document.getElementById('h-page-start').textContent = totalItems === 0 ? 0 : start + 1;
  if(document.getElementById('h-page-end')) document.getElementById('h-page-end').textContent = Math.min(start + ITEMS_PER_PAGE, totalItems);
  if(document.getElementById('h-total-parts')) document.getElementById('h-total-parts').textContent = totalItems;
  if(document.getElementById('h-prev-page-btn')) document.getElementById('h-prev-page-btn').disabled = window.healthPage === 1;
  if(document.getElementById('h-next-page-btn')) document.getElementById('h-next-page-btn').disabled = window.healthPage === totalPages;
};

window.renderDemandTable = function() {
  const tbody = document.getElementById('demand-table-body');
  if(!tbody) return;
  
  // Filter only items that need reordering
  let data = (window.originalProcessedParts || []).filter(p => p.netRequirement > 0);
  
  // Update KPI counters for Demand tab
  const kpiTotal = document.getElementById('demand-kpi-total');
  const kpiReorder = document.getElementById('demand-kpi-reorder');
  const kpiCons = document.getElementById('demand-kpi-consumption');
  if (kpiTotal) kpiTotal.textContent = (window.originalProcessedParts || []).length;
  if (kpiReorder) kpiReorder.textContent = data.length;
  if (kpiCons) {
    const totalCons = data.reduce((acc, p) => acc + p.consumption30d, 0);
    kpiCons.textContent = data.length ? Math.round(totalCons / data.length) : 0;
  }

  if (window.demandSearch) {
    const s = window.demandSearch.toLowerCase();
    data = data.filter(p => p.partId.toLowerCase().includes(s) || (p.model && p.model.toLowerCase().includes(s)));
  }
  
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  if (window.demandPage > totalPages) window.demandPage = totalPages;
  if (window.demandPage < 1) window.demandPage = 1;
  
  const start = (window.demandPage - 1) * ITEMS_PER_PAGE;
  const pageData = data.slice(start, start + ITEMS_PER_PAGE);
  
  tbody.innerHTML = '';
  pageData.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.partId}</td>
      <td title="${p.model}">${p.model.length > 35 ? p.model.substring(0,35)+'...' : p.model}</td>
      <td>${p.available}</td>
      <td>${p.consumption30d}</td>
      <td style="font-weight:bold; color:var(--danger-color);">${p.netRequirement}</td>
      <td><span class="status-badge ${p.status.class}">${p.status.text}</span></td>
    `;
    tbody.appendChild(tr);
  });
  
  if(document.getElementById('d-page-start')) document.getElementById('d-page-start').textContent = totalItems === 0 ? 0 : start + 1;
  if(document.getElementById('d-page-end')) document.getElementById('d-page-end').textContent = Math.min(start + ITEMS_PER_PAGE, totalItems);
  if(document.getElementById('d-total-parts')) document.getElementById('d-total-parts').textContent = totalItems;
  if(document.getElementById('d-prev-page-btn')) document.getElementById('d-prev-page-btn').disabled = window.demandPage === 1;
  if(document.getElementById('d-next-page-btn')) document.getElementById('d-next-page-btn').disabled = window.demandPage === totalPages;
};

window.renderConsumptionTable = function() {
  const tbody = document.getElementById('cons-table-body');
  if(!tbody) return;
  
  // Aggregate consumption data
  const consMap = new Map();
  if (window.rawInventoryData && window.rawInventoryData.consumption) {
     window.rawInventoryData.consumption.forEach(row => {
        const pn = String(row.part_no || row.part_number || '').trim().toUpperCase();
        const qty = parseInt(row.sold_qty) || 0;
        if (consMap.has(pn)) {
          consMap.get(pn).qty += qty;
        } else {
          consMap.set(pn, { pn, qty, desc: 'Unknown' });
        }
     });
  }
  
  // Try to enrich with description from priceList or inventory
  if (window.rawInventoryData && window.rawInventoryData.priceList) {
     window.rawInventoryData.priceList.forEach(p => {
        const pNum = String(p.part_number || '').trim().toUpperCase();
        if (consMap.has(pNum)) consMap.get(pNum).desc = p.description || 'Unknown';
     });
  }
  
  let data = Array.from(consMap.values()).sort((a,b) => b.qty - a.qty);
  
  // Update KPI counters
  const kpiTotal = document.getElementById('cons-kpi-total');
  const kpiFast = document.getElementById('cons-kpi-fast');
  if (kpiTotal) kpiTotal.textContent = data.reduce((acc, c) => acc + c.qty, 0).toLocaleString();
  if (kpiFast) kpiFast.textContent = data.filter(c => c.qty > 10).length.toLocaleString(); // arbitrary threshold for 'fast'

  if (window.consSearch) {
    const s = window.consSearch.toLowerCase();
    data = data.filter(c => c.pn.toLowerCase().includes(s) || c.desc.toLowerCase().includes(s));
  }
  
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  if (window.consPage > totalPages) window.consPage = totalPages;
  if (window.consPage < 1) window.consPage = 1;
  
  const start = (window.consPage - 1) * ITEMS_PER_PAGE;
  const pageData = data.slice(start, start + ITEMS_PER_PAGE);
  
  tbody.innerHTML = '';
  pageData.forEach((c, idx) => {
    const rank = start + idx + 1;
    let trend = '<span style="color:#10b981"><i data-lucide="trending-up"></i> High</span>';
    if (c.qty < 5) trend = '<span style="color:#ef4444"><i data-lucide="trending-down"></i> Low</span>';
    else if (c.qty < 15) trend = '<span style="color:#f59e0b"><i data-lucide="minus"></i> Stable</span>';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:bold;">#${rank}</td>
      <td>${c.pn}</td>
      <td title="${c.desc}">${c.desc.length > 35 ? c.desc.substring(0,35)+'...' : c.desc}</td>
      <td style="font-weight:bold;">${c.qty}</td>
      <td>General</td>
      <td>${trend}</td>
    `;
    tbody.appendChild(tr);
  });
  
  if(document.getElementById('c-page-start')) document.getElementById('c-page-start').textContent = totalItems === 0 ? 0 : start + 1;
  if(document.getElementById('c-page-end')) document.getElementById('c-page-end').textContent = Math.min(start + ITEMS_PER_PAGE, totalItems);
  if(document.getElementById('c-total-parts')) document.getElementById('c-total-parts').textContent = totalItems;
  if(document.getElementById('c-prev-page-btn')) document.getElementById('c-prev-page-btn').disabled = window.consPage === 1;
  if(document.getElementById('c-next-page-btn')) document.getElementById('c-next-page-btn').disabled = window.consPage === totalPages;
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

// Event Listeners for Pagination & Search
document.addEventListener('DOMContentLoaded', () => {
  // Inventory
  const hPrev = document.getElementById('h-prev-page-btn');
  const hNext = document.getElementById('h-next-page-btn');
  const hSearch = document.getElementById('health-search-input');
  if (hPrev) hPrev.addEventListener('click', () => { if(window.healthPage > 1) { window.healthPage--; window.renderHealthTable(); } });
  if (hNext) hNext.addEventListener('click', () => { window.healthPage++; window.renderHealthTable(); });
  if (hSearch) hSearch.addEventListener('input', (e) => { window.healthSearch = e.target.value; window.healthPage = 1; window.renderHealthTable(); });

  // Demand
  const dPrev = document.getElementById('d-prev-page-btn');
  const dNext = document.getElementById('d-next-page-btn');
  const dSearch = document.getElementById('demand-search-input');
  if (dPrev) dPrev.addEventListener('click', () => { if(window.demandPage > 1) { window.demandPage--; window.renderDemandTable(); } });
  if (dNext) dNext.addEventListener('click', () => { window.demandPage++; window.renderDemandTable(); });
  if (dSearch) dSearch.addEventListener('input', (e) => { window.demandSearch = e.target.value; window.demandPage = 1; window.renderDemandTable(); });

  // Consumption
  const cPrev = document.getElementById('c-prev-page-btn');
  const cNext = document.getElementById('c-next-page-btn');
  const cSearch = document.getElementById('cons-search-input');
  if (cPrev) cPrev.addEventListener('click', () => { if(window.consPage > 1) { window.consPage--; window.renderConsumptionTable(); } });
  if (cNext) cNext.addEventListener('click', () => { window.consPage++; window.renderConsumptionTable(); });
  if (cSearch) cSearch.addEventListener('input', (e) => { window.consSearch = e.target.value; window.consPage = 1; window.renderConsumptionTable(); });
});
