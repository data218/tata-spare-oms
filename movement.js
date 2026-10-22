import { buildMovementTransactions, summarizeMovements, groupMovements } from './src/movement-math.js';
import { openMetricDetails } from './src/dashboard-display.js';
const qty = value => Number(value).toLocaleString('en-IN', {maximumFractionDigits:3});
const money = value => value == null ? '' : value.toLocaleString('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:2});
const unitLabel = unit => unit === 'EA' ? 'pcs' : unit;
let movementIssues = {};
// movement.js
// Handles IN / OUT Movement Logic

import { escapeHtml } from './escape.js';

window.movementData = [];
window.movementFiltered = [];
window.movCurrentPage = 1;
window.movDateFilter = 'all'; // Default to all time - history is 6 months deep
let isMovementInitialized = false;
const MOV_ITEMS_PER_PAGE = 50;

window.initMovementModule = async function(force = false) {
  if (isMovementInitialized && !force) {
    filterMovementData();
    return;
  }
  isMovementInitialized = true;
  
  console.log('[Movement] Init started');
  const tbody = document.getElementById('movement-table-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);"><div class="spin-animation" style="display:inline-block; margin-right:12px; width:24px; height:24px; border:3px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; vertical-align:middle;"></div><span style="font-size: 1.1rem; vertical-align:middle;">Loading movement data... Please wait...</span></td></tr>';
  
  // Use setTimeout to allow UI to update the loading message before heavy processing
  setTimeout(async () => {
    try {
      console.log('[Movement] Generating data...');
      await generateMovementData();
      console.log('[Movement] Attaching listeners...');
      attachMovementListeners();
      console.log('[Movement] Filtering data...');
      filterMovementData();
      setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);
      console.log('[Movement] Init complete');
    } catch (e) {
      console.error('[Movement] Error:', e);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: red;">Error loading movement data: ${escapeHtml(e.message)}</td></tr>`;
      alert("Error loading movement data: " + e.message);
      isMovementInitialized = false; // Reset so they can try again
    }
  }, 50);
};

async function generateMovementData() {
  const result = buildMovementTransactions(window.rawInventoryData || {});
  window.movementData = result.transactions;
  movementIssues = result.issues;
  if (window.tableFilterData) delete window.tableFilterData['movement-table-body'];
}

function attachMovementListeners() {
  const toggleContainer = document.getElementById('movement-toggle');
  if (toggleContainer && !toggleContainer.dataset.bound) {
    toggleContainer.dataset.bound = 'true';
    const typeBtns = toggleContainer.querySelectorAll('.toggle-btn');
    typeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        typeBtns.forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = 'var(--text-secondary)';
          b.style.boxShadow = 'none';
        });
        const t = e.currentTarget || e.target;
        t.classList.add('active');
        t.style.background = 'white';
        t.style.color = 'var(--text-primary)';
        t.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
        
        window.movCurrentType = t.dataset.type;
        filterMovementData();
      });
    });
  }

  const sInput = document.getElementById('movement-search');
  if (sInput && !sInput.dataset.bound) {
    sInput.dataset.bound = 'true';
    sInput.addEventListener('input', (e) => {
      window.movSearchQuery = (e.target.value || '').toLowerCase().trim();
      filterMovementData();
    });
  }

  const dFilter = document.getElementById('movement-date-filter');
  if (dFilter && !dFilter.dataset.bound) {
    dFilter.dataset.bound = 'true';
    dFilter.addEventListener('change', (e) => {
      window.movDateFilter = e.target.value;
      filterMovementData();
    });
  }

  const exportBtn = document.getElementById('movement-export-btn');
  if (exportBtn && !exportBtn.dataset.bound) {
    exportBtn.dataset.bound = 'true';
    exportBtn.addEventListener('click', () => {
      if (!window.movementFiltered.length) {alert('No movement records to export.');return;}
      if (typeof XLSX === 'undefined') {alert('Export library is still loading. Try again.');return;}
      const rows = window.movementFiltered.map(t=>({Date:t.date?.toISOString() || '',Direction:t.direction,Type:t.type,'Part No':t.partNo,Description:t.description,Location:t.location,Qty:t.qty,Unit:t.unitKnown?unitLabel(t.uom):'', 'Value (NDP)':t.value??'',Reference:t.reference}));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(rows),'Movements');
      XLSX.writeFile(workbook,'Inventory_Movements.xlsx');
    });
  }

  const prevBtn = document.getElementById('mov-prev-btn');
  if (prevBtn && !prevBtn.dataset.bound) {
    prevBtn.dataset.bound = 'true';
    prevBtn.addEventListener('click', () => {
      if (window.movCurrentPage > 1) {
        window.movCurrentPage--;
        renderMovementTable();
      }
    });
  }

  const nextBtn = document.getElementById('mov-next-btn');
  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = 'true';
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(window.movementFiltered.length / MOV_ITEMS_PER_PAGE);
      if (window.movCurrentPage < totalPages) {
        window.movCurrentPage++;
        renderMovementTable();
      }
    });
  }

  const refreshBtn = document.getElementById('movement-refresh-btn');
  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = 'true';
    refreshBtn.addEventListener('click', async () => {
      const icon = refreshBtn.querySelector('svg') || refreshBtn.querySelector('i');
      if (icon) icon.classList.add('lucide-spin');
      try {
        if (window.reloadDashboardData) await window.reloadDashboardData();
        else { await generateMovementData(); filterMovementData(); }
      } finally {
        setTimeout(() => {
          if (icon) icon.classList.remove('lucide-spin');
        }, 500);
      }
    });
  }
}

function filterMovementData() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'flex';
  setTimeout(() => {
    try {
      _filterMovementData_internal();
    } finally {
      if (overlay) overlay.style.display = 'none';
    }
  }, 50);
}

// Applies the page-level filters (global location, IN/OUT toggle, search box and
// date range) to a set of movement rows.
function applyMovementFilters(rows) {
  let filtered = [...rows];

  const globalLoc = document.getElementById('location-select')?.value;
  const sLoc = (globalLoc || '').toUpperCase().replace(/\s+/g, '');
  if (sLoc && sLoc !== 'ALL') {
    filtered = filtered.filter(t => (t.location || '').toUpperCase().replace(/\s+/g, '') === sLoc);
  }

  const typeFilter = (window.movCurrentType || 'ALL').toUpperCase();
  if (typeFilter !== 'ALL') {
    filtered = filtered.filter(t => (t.direction || '').toUpperCase() === typeFilter);
  }

  if (window.movSearchQuery) {
    const q = window.movSearchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => 
      (t.partNo && t.partNo.toLowerCase().includes(q)) || 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.reference && t.reference.toLowerCase().includes(q)) ||
      (t.type && t.type.toLowerCase().includes(q)) ||
      (t.location && t.location.toLowerCase().includes(q))
    );
  }

  if (window.movDateFilter && window.movDateFilter !== 'all') {
    const now = new Date();
    filtered = filtered.filter(t => {
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      if (!d || isNaN(d.getTime())) return false;

      if (window.movDateFilter === 'today') {
        return d.toDateString() === now.toDateString();
      } else if (window.movDateFilter === 'yesterday') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        return d.toDateString() === yest.toDateString();
      } else if (window.movDateFilter === 'last7') {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      } else if (window.movDateFilter === 'last30') {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
      } else if (window.movDateFilter === 'thismonth') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  return filtered;
}

// Rows currently in scope for the header column filters: page-level filters
// plus any column filters already active on OTHER columns. The column being
// edited is excluded so its own selection doesn't hide the remaining options.
function applyMovementColumnFilters(rows, excludeKey) {
  const active = window.activeFilters?.get('movement-table-body') || {};
  for (const [key, values] of Object.entries(active)) {
    if (key === excludeKey || !values?.size) continue;
    rows = rows.filter(row => {
      const value = window.getFilterFieldValue ? window.getFilterFieldValue(row,key,'movement-table-body') : row[key];
      return values.has(String(value ?? ''));
    });
  }
  return rows;
}
window.getScopedMovementRows = excludeKey => applyMovementColumnFilters(applyMovementFilters(window.movementData || []),excludeKey);

function _filterMovementData_internal() {
  window.movCurrentPage = 1;
  const filtered = applyMovementColumnFilters(applyMovementFilters(window.movementData || []));

  window.movementFiltered = filtered;
  updateMovementKPIs();
  renderMovementTable();
  renderLocationMovement();
  renderTopParts();
}

function updateMovementKPIs() {
  const stats = summarizeMovements(window.movementFiltered);
  const primary = stats.units.find(u => u.uom === 'EA') || stats.units[0];
  const set = (id,value) => {const el=document.getElementById(id);if(el)el.textContent=value;};
  for (const [key,field,label] of [['in','inQty','Total IN'],['out','outQty','Total OUT'],['net','netQty','Net Movement']]) {
    set('mov-kpi-'+key,primary ? qty(primary[field]) : window.movementFiltered.length ? '—' : '0');
    set('mov-label-'+key,label+(primary ? ' · '+unitLabel(primary.uom) : ''));
  }
  set('mov-kpi-in-val',money(stats.pricedIn || !window.movementFiltered.some(t=>t.direction==='IN') ? stats.inValue : null));
  set('mov-kpi-out-val',money(stats.pricedOut || !window.movementFiltered.some(t=>t.direction==='OUT') ? stats.outValue : null));
  const notes = document.getElementById('movement-data-notes');
  if (notes) notes.querySelector('p').textContent = `IN includes recorded manual receipts and consumption returns. Values use current NDP, excluding unpriced or unclassified items. ${window.movementFiltered.filter(t=>!t.unitKnown).length.toLocaleString('en-IN')} filtered transactions have no catalogue unit; ${stats.unpriced.toLocaleString('en-IN')} cannot be valued. Unclassified quantities are excluded from quantity summaries. ${movementIssues.undated || 0} undated records are kept in All Time only; ${movementIssues.future || 0} future-dated and ${movementIssues.invalid || 0} invalid records are excluded. Net movement is recorded IN minus OUT, not closing stock.`;
}

window.showMovementKpi = key => {
  const stats = summarizeMovements(window.movementFiltered);
  const definitions = {
    in:['Total IN','Recorded manual IN entries plus consumption returns. Quantities are grouped by catalogue unit.','inQty'],
    out:['Total OUT','Positive consumption quantities plus recorded manual OUT entries. Quantities are grouped by catalogue unit.','outQty'],
    net:['Net Movement','Recorded IN minus recorded OUT, separately for each unit. This shows movement during the selected filters; it is not the current stock balance.','netQty'],
    'in-val':['IN Value','Recorded IN quantity × current NDP. Missing prices or units are excluded. This is a current NDP estimate.'],
    'out-val':['OUT Value','Recorded OUT quantity × current NDP. Missing prices or units are excluded. Sales invoice totals are kept separate from inventory valuation.']
  };
  const info = definitions[key]; if (!info) return;
  const breakdown = info[2] ? stats.units.map(u=>`${qty(u[info[2]])} ${unitLabel(u.uom)}`) : [money(key==='in-val'?stats.inValue:stats.outValue)];
  openMetricDetails('movement-kpi-details',info[0],info[1],[...breakdown,`${window.movementFiltered.length.toLocaleString('en-IN')} recorded transactions in the current filters.`,`${stats.unpriced.toLocaleString('en-IN')} transactions lack a usable price or unit.`]);
};

function renderMovementTable() {
  const tbody = document.getElementById('movement-table-body');
  if (!tbody) return;

  const totalRecords = window.movementFiltered.length;
  const totalPages = Math.ceil(totalRecords / MOV_ITEMS_PER_PAGE) || 1;
  
  if (window.movCurrentPage > totalPages) window.movCurrentPage = totalPages;
  if (window.movCurrentPage < 1) window.movCurrentPage = 1;

  const start = (window.movCurrentPage - 1) * MOV_ITEMS_PER_PAGE;
  const end = start + MOV_ITEMS_PER_PAGE;
  const currentData = window.movementFiltered.slice(start, end);

  tbody.innerHTML = '';
  
  if (currentData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: var(--text-secondary);">No movement records found.</td></tr>';
  } else {
    currentData.forEach(t => {
      const isOut = t.direction === 'OUT';
      const dirColor = isOut ? '#ef4444' : '#10b981';
      const dirBg = isOut ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
      const dateStr = t.date instanceof Date && !isNaN(t.date) 
        ? t.date.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})
        : '-';

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';
      
      const qtyStr = qty(t.qty);
      const qtyLabel = ''; // Units are available on hover and in card details.
      
      tr.innerHTML = `
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; color: var(--text-secondary);">${dateStr}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem;"><span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; background: ${dirBg}; color: ${dirColor};">${escapeHtml(t.direction)}</span></td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; font-weight: 500;">${escapeHtml(t.type)}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; font-weight: 600;">${escapeHtml(t.partNo)}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; color: var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(t.description)}">${escapeHtml(t.description)}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem;">${escapeHtml(t.location)}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; font-weight: 700; color: ${dirColor};" title="${escapeHtml(t.unitKnown ? unitLabel(t.uom) : 'Unit unavailable')}">${qtyStr}${qtyLabel}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; font-weight: 500; font-size: 0.65rem;">${money(t.value)}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; color: var(--text-secondary);">${escapeHtml(t.reference)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  const pInfo = document.getElementById('mov-page-info');
  if (pInfo) {
    pInfo.textContent = `${totalRecords ? start + 1 : 0} to ${Math.min(end, totalRecords)} of ${totalRecords}`;
  }
  
  const prevBtn = document.getElementById('mov-prev-btn');
  const nextBtn = document.getElementById('mov-next-btn');
  if (prevBtn) prevBtn.disabled = window.movCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = window.movCurrentPage === totalPages;
}

function renderLocationMovement() {
  const container = document.getElementById('location-movement-body');
  if (!container) return;
  const groups = groupMovements(window.movementFiltered).sort((a,b)=>a.name.localeCompare(b.name)||a.uom.localeCompare(b.uom));
  container.innerHTML = groups.map(s=>`<tr>
    <td>${escapeHtml(s.name)}</td><td>${escapeHtml(unitLabel(s.uom))}</td>
    <td>${qty(s.inQty)}</td><td>${qty(s.outQty)}</td><td class="${s.netQty<0?'movement-negative':'movement-positive'}">${qty(s.netQty)}</td>
    <td>${money(s.inQty && !s.pricedIn ? null : s.inValue)}</td><td>${money(s.outQty && !s.pricedOut ? null : s.outValue)}</td><td class="${s.netValue<0?'movement-negative':'movement-positive'}">${money(s.netValue)}</td>
  </tr>`).join('') || '<tr><td colspan="8">No classified movements</td></tr>';
}

function renderTopParts() {
  const container = document.getElementById('top-parts-body');
  if (!container) return;
  const groups = groupMovements(window.movementFiltered,'part').sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,10);
  container.innerHTML = groups.map(s=>`<tr>
    <td><strong>${escapeHtml(s.name)}</strong><div class="movement-part-description" title="${escapeHtml(s.description)}">${escapeHtml(s.description)}</div></td>
    <td>${escapeHtml(unitLabel(s.uom))}</td><td>${qty(s.inQty)}</td><td>${qty(s.outQty)}</td><td>${s.count.toLocaleString('en-IN')}</td><td class="${s.netQty<0?'movement-negative':'movement-positive'}">${qty(s.netQty)}</td>
  </tr>`).join('') || '<tr><td colspan="6">No classified movements</td></tr>';
}

window.filterMovementData = filterMovementData;
window.generateMovementData = generateMovementData;
