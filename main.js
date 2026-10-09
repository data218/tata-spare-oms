import './movement_entry.js';
import './management_dashboard.js';
import { supabase } from './supabase.js';
import { initClaims } from './claims.js';

// Initialize Lucide Icons
lucide.createIcons();

// DOM Elements
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const sidebar = document.getElementById('sidebar');
const hamburgerBtn = document.getElementById('hamburger-btn');

// --- Live Clock & Beautiful Date Formatter ---
window.isLubePart = function(category, description) {
  const cat = (category || '').toUpperCase();
  if (['LUBRICANT', 'LUBRICANTS', 'LUBE', 'LUBES', 'OIL'].includes(cat)) return true;
  const desc = (description || '').toUpperCase();
  if (desc.includes('15W40') || desc.includes('MOBIL') || desc.includes('LUBE') || desc.includes('OIL') || desc.includes('GREASE') || desc.includes('DEF ')) return true;
  return false;
};

window.parseTataDate = function(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  if (typeof dateStr !== 'string') return new Date(dateStr);
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(dateStr);
  
  if (/^\d{5}(\.\d+)?$/.test(dateStr.trim())) {
      return new Date(Math.round((Number(dateStr.trim()) - 25569) * 86400 * 1000));
  }
  
  const datePart = dateStr.split(' ')[0];
  const parts = datePart.split(/[-/]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (m > 12 && d <= 12) { 
      return new Date(y, d - 1, m);
    }
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
};

function formatBeautifulDate(dateInput) {
  let d = window.parseTataDate(dateInput);
  if (!d || isNaN(d.getTime())) return dateInput;
  
  const day = d.getDate();
  const suffix = ["th", "st", "nd", "rd"][day % 10 > 3 ? 0 : (day - day % 10 !== 10) * day % 10];
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear().toString().slice(-2);
  const time = d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  return `${day}${suffix} ${month}'${year}, ${time}`;
}

function updateLiveClock() {
  const timeEl = document.getElementById('live-time');
  const dateEl = document.getElementById('live-date');
  if (timeEl && dateEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const day = now.getDate();
    const suffix = ["th", "st", "nd", "rd"][day % 10 > 3 ? 0 : (day - day % 10 !== 10) * day % 10];
    dateEl.textContent = `${day}${suffix} ${now.toLocaleString('en-US', { month: 'short' })}'${now.getFullYear().toString().slice(-2)}`;
  }
}
setInterval(updateLiveClock, 1000);
document.addEventListener('DOMContentLoaded', () => {
  updateLiveClock();
  
  const refreshBtn = document.getElementById('refresh-data-btn');
  if (refreshBtn) {
    const ensureSpin = () => {
      const iconEl = refreshBtn.querySelector('#refresh-icon');
      if (iconEl) iconEl.classList.add('spin-animation');
    };
    refreshBtn.addEventListener('click', async () => {
      if (refreshBtn.dataset.busy === '1') return;
      refreshBtn.dataset.busy = '1';
      refreshBtn.disabled = true;
      const textEl = document.getElementById('refresh-btn-text');
      if (textEl) textEl.textContent = 'Refreshing...';
      ensureSpin(); // Lucide re-creates icons on render, so re-apply after every data render
      
      const startTime = Date.now();
      try {
        // Quick connection check
        const { error } = await supabase.from('tata_spare_inventory').select('id').limit(1);
        if (error) throw error;
        await loadDataAndRender();
        ensureSpin();
      } catch (err) {
        console.error('Connection check failed:', err);
        alert('Database connection failed: ' + (err.message || err.toString() || JSON.stringify(err)));
      }
      
      // Always show spinning for at least 1.5s so a long refresh keeps the spinner visible
      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) {
        await new Promise(resolve => setTimeout(resolve, 1500 - elapsed));
      }
      
      refreshBtn.dataset.busy = '';
      refreshBtn.disabled = false;
      if (textEl) textEl.textContent = 'Refresh';
      const iconEl = refreshBtn.querySelector('#refresh-icon');
      if (iconEl) iconEl.classList.remove('spin-animation');
    });
  }
});

// --- Session & Auth Logic ---
function initCharts() {
  console.log('Charts initialization placeholder - no charts implemented yet.');
}

function applyAccessControls(user) {
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
  } else {
    if (syncBtn) syncBtn.style.display = 'flex';
    if (settingsMenu) settingsMenu.style.display = 'flex';
    if (devStatusMenu) devStatusMenu.style.display = 'flex';
    if (sidebarDivider) sidebarDivider.style.display = 'block';
    if (locationFilter) locationFilter.disabled = false;
  }
}
window.applyAccessControls = applyAccessControls;

function checkSession() {
  const session = sessionStorage.getItem('currentUser');
  if (session) {
    const user = JSON.parse(session);
    if (loginPage) loginPage.classList.remove('active');
    if (dashboardPage) dashboardPage.classList.add('active');

    
    const globalWelcomeName = document.getElementById('global-welcome-name');
    if (globalWelcomeName) globalWelcomeName.textContent = user.username;
    
    setTimeout(() => {
      initCharts();
      if(typeof applyAccessControls === 'function') applyAccessControls(user);
    }, 100);
  }
}

// --- Login Password Toggle ---
const toggleLoginPwdBtn = document.getElementById('toggle-login-pwd');
const loginPwdInput = document.getElementById('password');
if (toggleLoginPwdBtn && loginPwdInput) {
  toggleLoginPwdBtn.addEventListener('click', () => {
    if (loginPwdInput.type === 'password') {
      loginPwdInput.type = 'text';
      toggleLoginPwdBtn.innerHTML = '<i data-lucide="eye-off" style="width: 18px; height: 18px; position: static;"></i>';
    } else {
      loginPwdInput.type = 'password';
      toggleLoginPwdBtn.innerHTML = '<i data-lucide="eye" style="width: 18px; height: 18px; position: static;"></i>';
    }
    lucide.createIcons();
  });
}

// --- Excel-Style Advanced Table Filtering ---
window.activeFilters = new Map();
// Min/max ranges for numeric columns, parallel to activeFilters.
window.activeFilterRanges = new Map();
window.activeSort = new Map();
window.tableFilterData = {};

// Per-table filter config: header text -> field key, row source, and re-render callback.
const tableFilterConfigs = {
  
  'reorder-table-body': {
    getRows: () => window.reorderData || [],
    fields: {
      'Priority': 'priority',
      'Part Details': 'partNo',
      'Category': 'category',
      'Location': 'location',
      'Current Stock': 'currentStock',
      'Min / Max': 'minStock',
      'Avg Cons/Day': 'avgDailyCons',
      'Days Stock': 'daysOfStock',
      'Order Qty': 'recQty'
    },
    formatters: {
      currentStock: (r) => Number(r.currentStock || 0).toLocaleString('en-IN'),
      minStock: (r) => Number(r.minStock || 0).toLocaleString('en-IN'),
      avgDailyCons: (r) => Number(r.avgDailyCons || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 }),
      recQty: (r) => Number(r.recQty || 0).toLocaleString('en-IN')
    },
    render: (rows) => { 
      if (!window.tableFilterData) window.tableFilterData = {};
      window.tableFilterData['reorder-table-body'] = rows; 
      if(typeof window.filterReorderData === 'function') window.filterReorderData(); 
    }
  },
  'movement-table-body': {
    // Full dataset: the base that column filters are applied to. Must stay
    // unscoped so that date/type/search filters can always be relaxed again.
    getRows: () => window.movementData || [],
    // Rows reachable in the current view - used only to populate the dropdown
    getScopeRows: (excludeKey) => (typeof window.getScopedMovementRows === 'function'
      ? window.getScopedMovementRows(excludeKey)
      : (window.movementData || [])),
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
    formatters: {
      date: (r) => (r.date instanceof Date && !isNaN(r.date))
        ? r.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-',
      qty: (r) => Number(r.qty || 0).toLocaleString('en-IN'),
      value: (r) => '₹' + Number(r.value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
    },
    render: (rows) => { 
      if (!window.tableFilterData) window.tableFilterData = {};
      window.tableFilterData['movement-table-body'] = rows; 
      if(typeof window.filterMovementData === 'function') window.filterMovementData(); 
    }
  },

  'recent-activity-table': {
    getRows: () => (window.rawInventoryData && window.rawInventoryData.consumption) || [],
    fields: {
      'Date': 'date', 'Location': 'division', 'Part No.': 'part_no',
      'Description': 'part_desc', 'Qty': 'sold_qty', 'Value (Γé╣)': 'value'
    },
    render: (rows) => { window.tableFilterData['recent-activity-table'] = rows; renderRecentActivity(); }
  },
  'health-table-body': {
    getRows: () => window.filteredProcessedParts || window.originalProcessedParts || [],
    fields: {
      'Part No.': 'partId', 'Description': 'model', 'Location': 'location',
      'Category': 'productCategory', 'NDP (₹)': 'ndpPrice',
      'Stock Qty': 'currentStock', 'Total Amount (₹)': 'stockValue',
      'Ageing (Days)': 'ageingText', 'Status': 'statusText'
    },
    formatters: {
      ndpPrice: (r) => '₹' + Number(r.ndpPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      stockValue: (r) => '₹' + Number(r.stockValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ageingText: (r) => (r.ageingDays >= 0 ? `${r.ageingDays} Days` : 'N/A')
    },
    // Money/quantity columns have far too many distinct values for a checkbox
    // list (Total Amount is effectively unique per row), so they get a
    // min/max range control instead.
    numeric: { ndpPrice: 'ndpPrice', stockValue: 'stockValue', currentStock: 'currentStock' },
    render: (rows) => { window.tableFilterData['health-table-body'] = rows; window.hCurrentPage = 1; window.renderHealthTable(); }
  },
  'ppni-table-body': {
    getRows: () => window.filteredProcessedParts || window.originalProcessedParts || [],
    fields: {
      'Part No.': 'partId', 'Description': 'model', 'Location': 'location', 'Category': 'productCategory',
      'Ageing (Days)': 'ageingDays', 'Receipt Date': 'last_receipt', 'Qty': 'currentStock', 'Value (₹)': 'stockValue'
    },
    numeric: { currentStock: 'currentStock', stockValue: 'stockValue' },
    render: (rows) => { window.tableFilterData['ppni-table-body'] = rows; window.pCurrentPage = 1; if(typeof window.renderPPNI === 'function') window.renderPPNI();
  if(typeof window.initMovementModule === 'function') window.initMovementModule();
  if(typeof window.initReorderModule === 'function') window.initReorderModule(); }
  },
  'demand-table-body': {
    getRows: () => window.filteredProcessedParts || window.originalProcessedParts || [],
    fields: {
      'Part No.': 'partId', 'Description': 'model', 'Location': 'location', 'Curr. Stock': 'currentStock',
      'In-Transit': 'inTransit', '6-Mth Avg Cons.': 'consumption6m', 'Safety Stock': 'safetyStock',
      'Open Demand': 'demand', 'Reorder Qty': 'orderQty', 'Status': 'statusText'
    },
    render: (rows) => { window.tableFilterData['demand-table-body'] = rows; window.dCurrentPage = 1; window.renderDemandTable(); }
  },
  'cons-table-body': {
    getRows: () => {
      const allCons = (window.rawInventoryData && window.rawInventoryData.consumption) ? [...window.rawInventoryData.consumption] : [];
      const locationSelect = document.getElementById('location-select');
      const selectedLoc = locationSelect ? locationSelect.value : 'ALL';
      if (selectedLoc === 'ALL') return allCons;
      
      const sLoc = (selectedLoc || '').toUpperCase().replace(/\s+/g, '');
      const mapLocation = (d) => {
        if (!d) return 'Narwal';
        const lowerD = d.toLowerCase();
        if (lowerD.includes('channirama') || lowerD.includes('chhanirama')) return 'Channi Rama';
        if (lowerD.includes('smamsamba') || lowerD.includes('supwal')) return 'Supwal';
        if (lowerD.includes('smamkathua') || lowerD.includes('kathua')) return 'Kathua';
        if (lowerD.includes('jammu') || lowerD.includes('narwal') || lowerD.includes('narval')) return 'Narwal';
        if (lowerD.includes('lambheri')) return 'Lambheri';
        if (lowerD.includes('poonch')) return 'Poonch';
        return d;
      };
      
      return allCons.filter(r => mapLocation(r.division || r.dealer).toUpperCase().replace(/\s+/g, '') === sLoc);
    },
    fields: {
      'Month/Year': 'monthYear', 'Part No.': 'part_no', 'Description': 'part_desc',
      'Cons. (Qty)': 'sold_qty', 'Value (₹)': 'value', 'NDP (₹)': 'ndpPrice',
      'Tax (₹)': 'tax_amount', 'Billing Type': 'billing_type', 'Order Type': 'order_type',
      'Mode of Pmt': 'mode_of_payment',
      'Velocity Trend': 'velocityTrend'
    },
    formatters: {
      // sold_qty is deliberately unformatted: the cell prints the raw number
      value: (r) => '₹' + Number(r.value || 0).toLocaleString('en-IN'),
      ndpPrice: (r) => '₹' + consNdp(r).toLocaleString('en-IN'),
      tax_amount: (r) => '₹' + Number(r.tax_amount || 0).toLocaleString('en-IN'),
      monthYear: (r) => consMonthYear(r),
      velocityTrend: (r) => consVelocityTrend(r.part_no)
    },
    numeric: {
      ndpPrice: (r) => consNdp(r),
      value: 'value',
      sold_qty: 'sold_qty',
      tax_amount: 'tax_amount'
    },
    render: (rows) => { window.tableFilterData['cons-table-body'] = rows; window.cCurrentPage = 1; window.renderConsumptionTable(); }
  },
  'users-table-body': {
    getRows: () => (typeof window.getDashboardUsers === 'function' ? window.getDashboardUsers() : []),
    fields: {
      'ID': 'id', 'Username': 'username', 'Password': 'password',
      'Role': 'role', 'Location': 'location'
    },
    render: (rows) => { window.tableFilterData['users-table-body'] = rows; if (typeof window.renderUsers === 'function') window.renderUsers(); }
  }
};

// Cap on how many distinct values a column filter will list at once.
const MAX_FILTER_VALUES = 300;

// Lifetime consumed qty per part, used for the Velocity Trend bucket.
// Cached against the row array so the column filter can classify every row in
// O(1) instead of re-summing 40k+ consumption rows per call.
function getConsVelocityMap() {
  const rows = (window.rawInventoryData && window.rawInventoryData.consumption) || [];
  if (!window._consVelocityCache || window._consVelocityCacheSource !== rows) {
    const m = {};
    rows.forEach(r => {
      const pn = r.part_no || 'Unknown';
      m[pn] = (m[pn] || 0) + (Number(r.sold_qty) || 0);
    });
    window._consVelocityCache = m;
    window._consVelocityCacheSource = rows;
  }
  return window._consVelocityCache;
}

// Single source of truth for the Velocity Trend label
function consVelocityTrend(partNo) {
  const total = getConsVelocityMap()[String(partNo || 'Unknown')] || 0;
  if (total >= 20) return 'Fast';
  if (total >= 5) return 'Mid';
  if (total > 0) return 'Slow';
  return '-';
}

// NDP for a consumption row: part number first, then normalised description.
// The value is derived, never stored on the row, so the column filter has to
// resolve it exactly the way the cell does. Cached against the price list.
function getConsNdpLookup() {
  const rows = (window.rawInventoryData && window.rawInventoryData.priceList) || [];
  if (!window._consNdpCache || window._consNdpCacheSource !== rows) {
    const byPart = {};
    const byDesc = {};
    rows.forEach(p => {
      const pn = String(p.part_number || '').trim();
      if (pn) byPart[pn] = Number(p.ndp) || 0;
      const desc = String(p.description || '').trim().toUpperCase().replace(/\s+/g, ' ');
      if (desc && !byDesc[desc]) byDesc[desc] = Number(p.ndp) || 0;
    });
    window._consNdpCache = { byPart, byDesc };
    window._consNdpCacheSource = rows;
  }
  return window._consNdpCache;
}

function consNdp(row) {
  const { byPart, byDesc } = getConsNdpLookup();
  const byNo = byPart[String(row.part_no || '').trim()];
  if (byNo) return byNo;
  const descKey = String(row.part_desc || '').trim().toUpperCase().replace(/\s+/g, ' ');
  return (descKey && byDesc[descKey]) || 0;
}

// Month/Year label, identical to the badge in the cell
function consMonthYear(row) {
  const dStr = row.date || row.fetched_at || '';
  const d = dStr ? new Date(dStr) : null;
  return d && !isNaN(d) ? d.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '-';
}

function getPriceMapCache() {
  const rows = (window.rawInventoryData && window.rawInventoryData.priceList) || [];
  if (!window._priceMapCache || window._priceMapCacheSource !== rows) {
    const map = {};
    rows.forEach(p => {
      const k = String(p.part_number || '').trim().toUpperCase();
      if (k) map[k] = Number(p.ndp) || 0;
    });
    window._priceMapCache = map;
    window._priceMapCacheSource = rows;
  }
  return window._priceMapCache;
}

function getFieldValue(obj, key, tableId) {
  const fmt = tableFilterConfigs[tableId]?.formatters?.[key];
  if (fmt) return fmt(obj);
  if (key === 'statusText') {
    if (tableId === 'demand-table-body') {
      return (obj.orderQty || 0) > 0 ? 'REORDER' : 'SUFFICIENT';
    } else if (tableId === 'health-table-body') {
      if (obj.currentStock === 0) return 'Out of Stock';
      if (obj.currentStock < obj.min) return 'Low Stock';
      return 'Healthy';
    } else {
      const text = obj.status?.text || '';
      return text.replace(/<[^>]*>?/gm, '').trim();
    }
  }
  if (key === 'monthYear') {
    const dStr = obj.date || obj.fetched_at || '';
    if (!dStr) return '-';
    if (!obj._monthYearCache) {
      const dateObj = new Date(dStr);
      obj._monthYearCache = !isNaN(dateObj) ? dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '-';
    }
    return obj._monthYearCache;
  }
  if (key === 'ndpPrice') {
    if (obj.ndpPrice !== undefined && obj.ndpPrice !== null && obj.ndpPrice !== '') {
      return Number(obj.ndpPrice) || 0;
    }
    const pn = String(obj.partId || obj.part_no || obj.part_number || '').trim().toUpperCase();
    if (!pn) return 0;
    const cache = getPriceMapCache();
    return cache[pn] || 0;
  }
  return obj[key];
}

// Exposed so other modules can resolve a field for column-filter scoping
window.getFilterFieldValue = function(row, key, tableId) {
  return getFieldValue(row, key, tableId);
};

// --- Numeric (min/max) column filtering ---
// Money and quantity columns are effectively unique per row, so a checkbox
// list capped at MAX_FILTER_VALUES can never reach most values. Those columns
// get a min/max range control instead.
// `cfg.numeric[key]` is either a raw field name or a getter for derived values.
// Formatters are display-only, so the raw number must never be parsed back out
// of them.
function getNumericValue(row, key, tableId) {
  const spec = tableFilterConfigs[tableId]?.numeric?.[key];
  let v;
  if (typeof spec === 'function') v = Number(spec(row));
  else if (typeof spec === 'string') v = Number(row[spec]);
  else v = Number(row[key]);
  return isNaN(v) ? 0 : v;
}

function isNumericColumn(tableId, key) {
  return !!tableFilterConfigs[tableId]?.numeric?.[key];
}

function getRange(tableId, key) {
  return window.activeFilterRanges.get(tableId)?.[key] || null;
}

function setRange(tableId, key, range) {
  if (!window.activeFilterRanges.has(tableId)) window.activeFilterRanges.set(tableId, {});
  const store = window.activeFilterRanges.get(tableId);
  if (range) store[key] = range;
  else delete store[key];
}

function clearRange(tableId, key) {
  setRange(tableId, key, null);
}

// Keep a column-filter dropdown glued to its header cell.
// The dropdown is position:fixed, so we re-place it on every scroll/resize
// (capture phase catches scrolling of nested overflow containers as well as
// window scrolling). If the header scrolls out of view the dropdown closes.
function placeFilterDropdown(div, th) {
  const r = th.getBoundingClientRect();
  const width = div.offsetWidth || 220;
  const height = div.offsetHeight || 340;

  let left = r.left;
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
  if (left < 8) left = 8;

  let top = r.bottom + 4;
  // Flip above the header when there is no room below
  if (top + height > window.innerHeight - 8 && r.top - height - 4 > 8) {
    top = Math.max(8, r.top - height - 4);
  }

  div.style.left = `${left}px`;
  div.style.top = `${top}px`;
}

function trackFilterDropdown(div, th) {
  if (div._trackHandler) {
    div._trackHandler();
  }
  const handler = () => {
    if (!document.body.contains(div)) {
      if (div._trackHandler) div._trackHandler();
      return;
    }
    const r = th.getBoundingClientRect();
    const offscreen = r.bottom < 0 || r.top > window.innerHeight;
    if (offscreen || !th.closest('table')) {
      div.remove();
      if (div._trackHandler) div._trackHandler();
      return;
    }
    placeFilterDropdown(div, th);
  };
  div._trackHandler = null;
  const register = () => {
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
  };
  const unregister = () => {
    window.removeEventListener('scroll', handler, true);
    window.removeEventListener('resize', handler);
  };
  const observer = new MutationObserver(() => {
    if (!document.body.contains(div)) unregister();
  });
  observer.observe(document.body, { childList: true });

  div._trackHandler = () => {
    unregister();
    observer.disconnect();
  };
  register();
  // Re-place once the dropdown has its real measured size
  requestAnimationFrame(() => placeFilterDropdown(div, th));
}

// Single place that paints the "filter active" look, so the class and the
// tooltip can never disagree.
function paintFilterState(th, count, isRange) {
  const filtered = count > 0;
  th.classList.toggle('th-filtered', filtered);
  th.title = filtered
    ? (isRange ? 'Filtered by value range. Click to change.' : `Filtered - ${count} value(s) selected. Click to change.`)
    : 'Click to filter this column';
}

// Add an Excel-style caret to every filterable header
function markFilterHeaders() {
  Object.entries(tableFilterConfigs).forEach(([tableId, cfg]) => {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    const table = tbody.closest('table');
    if (!table) return;
    const active = window.activeFilters.get(tableId) || {};
    table.querySelectorAll('thead th').forEach(th => {
      const text = th.textContent.trim();
      const key = cfg.fields[text];
      if (!key) return;
      th.classList.add('has-filter');
      th.style.cursor = 'pointer';
      th.dataset.colKey = key;
      // Derive the "filter active" look from state, not from the click that set
      // it, so the green survives re-renders, navigation and data reloads.
      const range = window.activeFilterRanges.get(tableId)?.[key];
      paintFilterState(th, (active[key]?.size || 0) || (range ? 1 : 0), !!range);
      if (!th.querySelector('.th-filter-caret')) {
        const caret = document.createElement('span');
        caret.className = 'th-filter-caret';
        caret.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 5px; vertical-align: -2px; display: inline-block;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>';
        th.appendChild(caret);
      }
    });
  });
}

document.addEventListener('click', (e) => {
  // Safe closest check
  let target = e.target;
  if (!target || typeof target.closest !== 'function') return;

  const dropdown = document.querySelector('.column-filter-dropdown');
  const th = target.closest('th');

  // Close dropdown if clicking outside
  if (dropdown && !dropdown.contains(target)) {
    if (!th || th.dataset.colKey !== dropdown.dataset.colKey) {
      dropdown.remove();
      if (!th) return;
    } else {
      // Clicked the same TH, toggle off
      dropdown.remove();
      return;
    }
  }
  
  if (!th) return;

  const table = th.closest('table');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  const tableId = tbody.id;
  
  const cfg = tableFilterConfigs[tableId];
  if (!cfg) return;

  // Prefer the dataset colKey added by markFilterHeaders
  let key = th.dataset.colKey;
  
  if (!key) {
    const text = Array.from(th.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent)
      .join('').trim();
      
    const keyMap = {
      'Part': 'partId', 'Part No.': 'partId',
      'Part Name': 'model', 'Description': 'model',
      'Stock': 'currentStock', 'Quantity': 'currentStock',
      'Reserved': 'reserved', 'Available': 'available',
      'In Transit': 'inTransit', 'Min': 'min', 'Safety Min': 'min',
      'Demand': 'demand', 'Pending': 'demand', 'Req': 'netRequirement',
      'Order Qty': 'orderQty', 'Suggested': 'suggestedOrder',
      'Status': 'statusText', 'Health Status': 'statusText', 'Forecast Action': 'statusText',
      'Location': 'location', 'Bin Location': 'binLocation', 'Category': 'productCategory',
      'Total Price (?)': 'stockValue', 'Total Amount (₹)': 'stockValue', '30D Cons.': 'avgConsumption',
      'NDP (₹)': 'ndpPrice', 'Stock Qty': 'currentStock'
    };
    key = keyMap[text];
  }
  
  if (!key) return; // Action columns

  // The dropdown only lists values that are reachable in the current view.
  // The base row set (getRows, used by applyFiltersAndSort) must stay
  // unscoped, otherwise applying a column filter would permanently narrow the
  // data and page-level filters could never broaden the results back.
  let sourceRows;
  try {
    sourceRows = (typeof cfg.getScopeRows === 'function')
      ? cfg.getScopeRows(key)
      : cfg.getRows();
  } catch (err) {
    console.error('Column filter: failed to resolve scope for', key, err);
    sourceRows = cfg.getRows();
  }
  if (!Array.isArray(sourceRows)) sourceRows = [];

  if (sourceRows.length === 0) {
    // Nothing reachable in the current view - explain instead of failing silently
    const note = document.createElement('div');
    note.className = 'column-filter-dropdown';
    note.style.padding = '12px 14px';
    note.style.fontSize = '0.8rem';
    note.style.color = 'var(--text-secondary)';
    note.textContent = 'No rows in the current view to filter.';
    document.body.appendChild(note);
    trackFilterDropdown(note, th);
    setTimeout(() => {
      if (document.body.contains(note)) note.remove();
    }, 2500);
    return;
  }
  
  // Ensure table filters exist
  if (!window.activeFilters.has(tableId)) window.activeFilters.set(tableId, {});
  if (!window.activeSort.has(tableId)) window.activeSort.set(tableId, { key: '', isAsc: true });
  if (!window.activeFilterRanges.has(tableId)) window.activeFilterRanges.set(tableId, {});

  const currentFilters = window.activeFilters.get(tableId)[key] || new Set();
  const currentSort = window.activeSort.get(tableId);
  const applyFiltersAndSort = () => {
    const cfg = tableFilterConfigs[tableId];
    if (!cfg) return;
    const filters = window.activeFilters.get(tableId);
    const ranges = window.activeFilterRanges.get(tableId) || {};
    let result = cfg.getRows().filter(part => {
      // Min/max ranges win over the value set for the same column
      for (const [rKey, range] of Object.entries(ranges)) {
        if (!range) continue;
        const n = getNumericValue(part, rKey, tableId);
        if (range.min !== null && n < range.min) return false;
        if (range.max !== null && n > range.max) return false;
      }
      for (const [fKey, fSet] of Object.entries(filters)) {
        if (fSet.size > 0) {
          const rawVal = getFieldValue(part, fKey, tableId);
          const val = String(rawVal === null || rawVal === undefined ? '' : rawVal);
          if (!fSet.has(val)) return false;
        }
      }
      return true;
    });

    const sortConfig = window.activeSort.get(tableId);
    if (sortConfig.key) {
      const sortIsNumeric = isNumericColumn(tableId, sortConfig.key);
      result.sort((a, b) => {
        // "₹9.00" > "₹100.00" as strings, which is nonsense for money columns
        if (sortIsNumeric) {
          const numA = getNumericValue(a, sortConfig.key, tableId);
          const numB = getNumericValue(b, sortConfig.key, tableId);
          if (numA !== numB) return sortConfig.isAsc ? numA - numB : numB - numA;
          return 0;
        }
        let valA = getFieldValue(a, sortConfig.key, tableId);
        let valB = getFieldValue(b, sortConfig.key, tableId);
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortConfig.isAsc ? -1 : 1;
        if (valA > valB) return sortConfig.isAsc ? 1 : -1;
        return 0;
      });
    }

    if (typeof cfg.render === 'function') cfg.render(result);
  };


  // Get unique values for this column
  const allUniqueValues = [...new Set(sourceRows.map(item => {
    const val = getFieldValue(item, key, tableId);
    return String(val === null || val === undefined ? '' : val);
  }))];
  allUniqueValues.sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB) && a !== '' && b !== '') {
      return numA - numB;
    }
    return a.localeCompare(b, undefined, {numeric: true});
  });

  // Guard against high-cardinality columns (dates, invoice numbers, values).
  // Rendering tens of thousands of checkboxes freezes the tab, so we cap the
  // list and let the user narrow it with the search box.
  const uniqueValues = allUniqueValues;
  const isCapped = uniqueValues.length > MAX_FILTER_VALUES;

  if (dropdown) dropdown.remove();

  const rect = th.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'column-filter-dropdown';
  div.dataset.colKey = key;

  // Attach before branching: both the numeric range UI and the value checklist
  // need the dropdown in the DOM, and trackFilterDropdown keeps it anchored.
  const container = document.getElementById('filter-dropdown-container') || document.body;
  container.appendChild(div);
  trackFilterDropdown(div, th);
  placeFilterDropdown(div, th);

  // Escape HTML in values to prevent quote breakage
  const escapeHtml = (str) => String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  // --- Numeric columns: min/max range instead of a value checklist ---
  if (isNumericColumn(tableId, key)) {
    const nums = sourceRows.map(r => getNumericValue(r, key, tableId));
    const dataMin = nums.length ? Math.min(...nums) : 0;
    const dataMax = nums.length ? Math.max(...nums) : 0;
    const existing = getRange(tableId, key);
    const curMin = existing && existing.min !== null ? existing.min : dataMin;
    const curMax = existing && existing.max !== null ? existing.max : dataMax;
    const isMoney = /Price|Value|Amount|ndp|stock/i.test(key);

    div.innerHTML = `
      <div class="col-filter-header">
        <div class="fil-sort">
          <button class="fil-sort-btn sort-asc-btn ${currentSort.key === key && currentSort.isAsc ? 'active-sort' : ''}"><i data-lucide="arrow-up-az" style="width: 14px; height: 14px; display: inline-block;"></i> Smallest first</button>
          <button class="fil-sort-btn sort-desc-btn ${currentSort.key === key && !currentSort.isAsc ? 'active-sort' : ''}"><i data-lucide="arrow-down-za" style="width: 14px; height: 14px; display: inline-block;"></i> Largest first</button>
        </div>
      </div>
      <div class="col-filter-body" style="padding: 12px;">
        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 10px;">
          Showing ${sourceRows.length} row(s). Range: ${dataMin.toLocaleString('en-IN')} to ${dataMax.toLocaleString('en-IN')}
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="number" class="range-min" value="${curMin}" step="any"
            style="flex:1; min-width:0; padding:6px 8px; border:1px solid var(--border-color); border-radius:6px; font-size:0.8rem; font-family:inherit;">
          <span style="color:var(--text-secondary); font-size:0.8rem;">to</span>
          <input type="number" class="range-max" value="${curMax}" step="any"
            style="flex:1; min-width:0; padding:6px 8px; border:1px solid var(--border-color); border-radius:6px; font-size:0.8rem; font-family:inherit;">
        </div>
        <div class="range-presets" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
          ${(isMoney ? [[0, 100], [100, 500], [500, 1000], [1000, 5000], [5000, null]]
                      : [[0, 1], [1, 5], [5, 20], [20, 100], [100, null]])
            .map(([lo, hi]) => `<button class="fil-btn range-preset" data-lo="${lo}" data-hi="${hi === null ? '' : hi}" style="padding:3px 8px; font-size:0.7rem;">${isMoney ? '₹' : ''}${lo.toLocaleString('en-IN')}${hi === null ? '+' : ` - ${isMoney ? '₹' : ''}${hi.toLocaleString('en-IN')}`}</button>`).join('')}
        </div>
      </div>
      <div class="col-filter-footer">
        <button class="clear-btn" style="margin-right: auto;">Clear</button>
        <button class="fil-btn fil-btn-cancel">Cancel</button>
        <button class="fil-btn fil-btn-ok apply-btn">OK</button>
      </div>
    `;

    const minEl = div.querySelector('.range-min');
    const maxEl = div.querySelector('.range-max');
    div.querySelectorAll('.range-preset').forEach(b => b.addEventListener('click', () => {
      minEl.value = b.dataset.lo;
      maxEl.value = b.dataset.hi;
    }));

    div.querySelector('.sort-asc-btn').addEventListener('click', () => {
      window.activeSort.set(tableId, { key, isAsc: true });
      div.remove(); applyFiltersAndSort();
    });
    div.querySelector('.sort-desc-btn').addEventListener('click', () => {
      window.activeSort.set(tableId, { key, isAsc: false });
      div.remove(); applyFiltersAndSort();
    });
    div.querySelector('.fil-btn-cancel').addEventListener('click', () => div.remove());
    div.querySelector('.clear-btn').addEventListener('click', () => {
      clearRange(tableId, key);
      window.activeFilters.get(tableId)[key] = new Set();
      window.activeSort.set(tableId, { key: '', isAsc: true });
      paintFilterState(th, 0);
      applyFiltersAndSort();
      div.remove();
    });
    div.querySelector('.apply-btn').addEventListener('click', () => {
      const rawMin = minEl.value.trim();
      const rawMax = maxEl.value.trim();
      const min = rawMin === '' ? null : Number(rawMin);
      const max = rawMax === '' ? null : Number(rawMax);
      if (min !== null && max !== null && min > max) {
        div.querySelector('.col-filter-body').insertAdjacentHTML('afterbegin',
          '<div style="color:#ef4444;font-size:0.75rem;margin-bottom:8px;">Minimum cannot be greater than maximum.</div>');
        return;
      }
      // A range that spans the whole dataset is not a filter
      const unchanged = (min === null || min <= dataMin) && (max === null || max >= dataMax);
      if (unchanged) clearRange(tableId, key);
      else setRange(tableId, key, { min, max });
      // A range and a value set are mutually exclusive on the same column
      window.activeFilters.get(tableId)[key] = new Set();
      paintFilterState(th, unchanged ? 0 : 1, !unchanged);
      applyFiltersAndSort();
      div.remove();
    });
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({ root: div });
    return;
  }

  div.innerHTML = `
    <div class="col-filter-header">
      <div class="fil-sort">
        <button class="fil-sort-btn sort-asc-btn ${currentSort.key === key && currentSort.isAsc ? 'active-sort' : ''}"><i data-lucide="arrow-up-az" style="width: 14px; height: 14px; display: inline-block;"></i> Sort A to Z</button>
        <button class="fil-sort-btn sort-desc-btn ${currentSort.key === key && !currentSort.isAsc ? 'active-sort' : ''}"><i data-lucide="arrow-down-za" style="width: 14px; height: 14px; display: inline-block;"></i> Sort Z to A</button>
      </div>
      <input type="text" class="col-filter-search" placeholder="Search values..." style="padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; font-family: inherit; width: 100%; box-sizing: border-box;">
    </div>
    <div class="col-filter-body">
      <label class="col-filter-checkbox" style="font-weight: 600; border-bottom: 1px solid var(--border-color);">
        <input type="checkbox" class="select-all-cb" ${currentFilters.size === 0 || currentFilters.size === uniqueValues.length ? 'checked' : ''} style="cursor: pointer;"> <span>Select All</span>
      </label>
      <div class="col-filter-note" style="display: ${isCapped ? 'block' : 'none'}; padding: 6px 12px; font-size: 0.7rem; color: var(--text-secondary); background: #f8fafc; border-bottom: 1px solid var(--border-color);"></div>
      <div class="col-filter-options"></div>
    </div>
    <div class="col-filter-footer">
      <button class="clear-btn" style="margin-right: auto;">Clear</button>
      <button class="fil-btn fil-btn-cancel">Cancel</button>
      <button class="fil-btn fil-btn-ok apply-btn">OK</button>
    </div>
  `;

  const optionsEl = div.querySelector('.col-filter-options');
  const noteEl = div.querySelector('.col-filter-note');
  const selectAll = div.querySelector('.select-all-cb');
  // Values the user explicitly toggled in this session. Needed when the list is
  // capped or search-narrowed, so intent is not lost for values we cannot show.
  const touched = new Map();
  let currentScope = uniqueValues;
  let searchActive = false;
  // When the whole list is on screen the checkboxes ARE the selection, so we can
  // read it straight off the DOM. Otherwise we must reason about hidden values.
  const fullListVisible = () => !isCapped && !searchActive;

  // Only ever paint MAX_FILTER_VALUES rows, otherwise high-cardinality
  // columns (dates, invoice numbers) lock up the browser.
  const renderOptionList = (values) => {
    currentScope = values;
    const slice = values.slice(0, MAX_FILTER_VALUES);
    const allSelected = currentFilters.size === 0;
    optionsEl.innerHTML = slice.map(val => {
      const isChecked = touched.has(val)
        ? (touched.get(val) ? 'checked' : '')
        : (allSelected || currentFilters.has(val)) ? 'checked' : '';
      const displayVal = val === '' ? '(Blank)' : escapeHtml(val);
      const safeVal = escapeHtml(val);
      return `<label class="column-filter-checkbox" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
        <input type="checkbox" value="${safeVal}" ${isChecked} style="cursor: pointer;"> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${displayVal}</span>
      </label>`;
    }).join('');

    if (values.length > MAX_FILTER_VALUES) {
      noteEl.style.display = 'block';
      noteEl.textContent = `${values.length.toLocaleString('en-IN')} values — showing ${MAX_FILTER_VALUES}. Use the search box to narrow.`;
    } else {
      noteEl.style.display = 'none';
    }

    if (values.length === 0) {
      optionsEl.innerHTML = '<div style="padding: 12px; font-size: 0.8rem; color: var(--text-secondary); text-align: center;">No matching values</div>';
    }

    const visibleBoxes = Array.from(optionsEl.querySelectorAll('input[type="checkbox"]'));
    selectAll.checked = visibleBoxes.length > 0 && visibleBoxes.every(c => c.checked);
  };

  const readValue = (cb) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = cb.value;
    return txt.value;
  };

  optionsEl.addEventListener('change', (e) => {
    const cb = e.target;
    if (!cb || cb.type !== 'checkbox') return;
    touched.set(readValue(cb), cb.checked);
    const visibleBoxes = Array.from(optionsEl.querySelectorAll('input[type="checkbox"]'));
    selectAll.checked = visibleBoxes.length > 0 && visibleBoxes.every(c => c.checked);
  });

  renderOptionList(uniqueValues);

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons({ root: div });
  }

  // Handle Sort
  div.querySelector('.sort-asc-btn').addEventListener('click', () => {
    window.activeSort.set(tableId, { key, isAsc: true });
    applyFiltersAndSort();
    div.remove();
  });
  div.querySelector('.sort-desc-btn').addEventListener('click', () => {
    window.activeSort.set(tableId, { key, isAsc: false });
    applyFiltersAndSort();
    div.remove();
  });

  // Handle Select All (operates on the currently visible options)
  selectAll.addEventListener('change', (e) => {
    optionsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = e.target.checked;
      touched.set(readValue(cb), e.target.checked);
    });
  });

  // Search within dropdown (Excel-style live filter of the value list)
  const searchInput = div.querySelector('.col-filter-search');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    searchActive = !!q;
    if (!q) {
      renderOptionList(uniqueValues);
      return;
    }
    renderOptionList(uniqueValues.filter(v => v.toLowerCase().includes(q)));
  });

  // Handle Clear
  div.querySelector('.clear-btn').addEventListener('click', () => {
    window.activeFilters.get(tableId)[key] = new Set();
    window.activeSort.set(tableId, { key: '', isAsc: true });
    paintFilterState(th, 0);
    applyFiltersAndSort();
    div.remove();
  });

  // Handle Cancel (close without applying)
  div.querySelector('.fil-btn-cancel').addEventListener('click', () => {
    div.remove();
  });

  // Handle OK (Apply)
  div.querySelector('.apply-btn').addEventListener('click', () => {
    let nextSet;
    if (fullListVisible()) {
      // Every value is on screen, so the ticked boxes are the selection
      nextSet = new Set(
        Array.from(optionsEl.querySelectorAll('input[type="checkbox"]'))
          .filter(cb => cb.checked)
          .map(readValue)
      );
    } else if (touched.size === 0) {
      // List is capped/narrowed and nothing was changed - leave the filter as is
      nextSet = new Set(currentFilters);
    } else if (currentFilters.size === 0) {
      // No active filter: the reachable scope becomes the filter
      nextSet = new Set(currentScope.filter(v => touched.get(v) !== false));
    } else {
      // Adjust the existing selection without disturbing hidden values
      nextSet = new Set(currentFilters);
      touched.forEach((on, v) => { if (on) nextSet.add(v); else nextSet.delete(v); });
    }

    if (nextSet.size === 0 || nextSet.size === uniqueValues.length) {
      window.activeFilters.get(tableId)[key] = new Set();
      paintFilterState(th, 0);
    } else {
      window.activeFilters.get(tableId)[key] = nextSet;
      paintFilterState(th, nextSet.size);
    }
    applyFiltersAndSort();
    div.remove();
  });

});

const loginFormElement = document.getElementById('login-form') || document.getElementById('loginForm');
if (loginFormElement) {
  loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username')?.value || document.getElementById('userId')?.value;
    const passwordInput = document.getElementById('password')?.value;
    const submitBtn = loginFormElement.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    // Local authentication check
    const users = JSON.parse(localStorage.getItem('dashboardUsers')) || [
      { id: 1, username: 'admin', password: 'password', role: 'Super Admin', location: 'ALL' },
      { id: 2, username: 'JS_3008420', password: 'secret', role: 'User', location: 'ALL' }
    ];
    
    const user = users.find(u => u.username === usernameInput && u.password === passwordInput);
    
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      if (!user) {
        alert('Invalid username or password.');
        return;
      }

      sessionStorage.setItem('currentUser', JSON.stringify(user));
      sessionStorage.setItem('tata_crm_auth', 'true');
      


      const globalWelcomeName = document.getElementById('global-welcome-name');
      if (globalWelcomeName) globalWelcomeName.textContent = user.username;

      // If we are on the single-page dashboard version
      const loginPage = document.getElementById('login-page');
      const dashboardPage = document.getElementById('dashboard-page');
      
      if (loginPage && dashboardPage) {
        loginPage.classList.remove('active');
        dashboardPage.classList.add('active');
        initCharts();
        if(typeof applyAccessControls === 'function') applyAccessControls(user);
      } else {
        // We are on the separate login page, redirect
        window.location.href = 'dashboard.html';
      }
    }, 500); // Simulate tiny network delay
  });
}

logoutBtn.addEventListener('click', async () => {
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('tataUser');
  window.location.href = 'index.html';
});

// Run session check on load
checkSession();



// --- Sidebar Toggle Logic ---
hamburgerBtn.addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
});

// Sidebar active state logic
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
  // Give existing items a default target if they don't have one
  if(!item.hasAttribute('data-target') && item.querySelector('span')) {
     const text = item.querySelector('span').textContent.toLowerCase();
     if(text === 'dashboard') item.setAttribute('data-target', 'view-dashboard');
  }

  item.addEventListener('click', function(e) {
    e.preventDefault();
    navItems.forEach(nav => nav.classList.remove('active'));
    this.classList.add('active');
    
    // View switching
    const targetId = this.getAttribute('data-target');
    if (targetId) {
      viewSections.forEach(view => {
        if (view.id === targetId) {
          view.style.display = 'flex';
          if (targetId === 'view-orders' && typeof window.initReorderModule === 'function') window.initReorderModule();
          if (targetId === 'view-movement' && typeof window.initMovementModule === 'function') window.initMovementModule();
        } else {
          view.style.display = 'none';
        }
      });
      // Re-init icons when switching views just in case
      lucide.createIcons();
    }
  });
});

// "Upload Manually" shortcut inside the missing-data alert -> opens Settings > Inventory Manual Upload
const btnUploadMissingData = document.getElementById('btn-upload-missing-data');
if (btnUploadMissingData) {
  btnUploadMissingData.addEventListener('click', () => {
    const settingsNav = document.querySelector('[data-target="view-settings"]');
    if (settingsNav) settingsNav.click();

    const invCard = document.getElementById('inventory-upload-form');
    const invHeader = invCard ? invCard.closest('.settings-card').querySelector('.settings-header') : null;
    if (invHeader) {
      const content = invHeader.nextElementSibling;
      if (content && content.style.display === 'none') invHeader.click();
    }

    const fileInput = document.getElementById('inventory-upload-file');
    if (fileInput) fileInput.focus();
  });
}

// --- Locations Settings Logic ---
async function populateLocationSelect() {
  const select = document.getElementById('location-select');
  if (!select) return;
  try {
    const { data, error } = await supabase.from('tata_locations').select('location_name');
    if (error) throw error;
    const current = select.value || 'ALL';
    select.innerHTML = '<option value="ALL">All Locations</option>';
    (data || []).forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.location_name;
      opt.textContent = loc.location_name;
      select.appendChild(opt);
    });
    if ([...select.options].some(o => o.value === current)) {
      select.value = current;
    }
  } catch (e) {
    console.error('Error populating location select:', e);
  }
}

async function loadLocations() {
  const locList = document.getElementById('locations-list');
  if (!locList) return;

  try {
    const { data, error } = await supabase.from('tata_locations').select('*');
    if (error) throw error;
    
    locList.innerHTML = '';
    if (data.length === 0) {
      locList.innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">No locations saved yet.</div>';
      return;
    }
    
    data.forEach(loc => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '10px';
      row.style.background = '#f1f5f9';
      row.style.borderRadius = '4px';
      row.style.border = '1px solid #e2e8f0';
      
      row.innerHTML = `
        <div style="flex: 1; font-weight: 500;">${loc.location_name}</div>
        <div style="flex: 1; color: #475569;">${loc.username}</div>
        <div style="flex: 1; color: #475569;">••••••••</div>
        <button class="delete-loc-btn" data-id="${loc.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      `;
      locList.appendChild(row);
    });
    
    lucide.createIcons();
    
    // Attach delete listeners
    document.querySelectorAll('.delete-loc-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if(confirm('Delete this location?')) {
          await supabase.from('tata_locations').delete().eq('id', id);
          loadLocations();
        }
      });
    });

    // Populate dropdowns (Inventory Upload, New User Location & Fetch Target Location)
    const selects = ['inventory-upload-location', 'new-location', 'fetch-target-location'].map(id => document.getElementById(id)).filter(Boolean);
    selects.forEach(sel => {
      // For fetch-target-location, we keep "All Locations" as the default first option
      if (sel.id === 'fetch-target-location') {
        sel.innerHTML = '<option value="ALL" selected>All Locations</option>';
      } else {
        sel.innerHTML = '<option value="" disabled selected>Select Location</option>';
      }
      data.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc.location_name;
        opt.textContent = loc.location_name;
        sel.appendChild(opt);
      });
    });
    
  } catch (err) {
    console.error('Error loading locations:', err);
  }
}

async function loadLastSync() {
  const syncText = document.getElementById('last-updated-text');
  if(!syncText) return;
  try {
    const { data, error } = await supabase.from('tata_bot_settings').select('value').eq('key', 'last_sync').single();
    if(!error && data) {
       syncText.textContent = formatBeautifulDate(data.value);
    }
  } catch(e) {}
}

function showLocationAlert(type, message) {
  const existing = document.querySelector('.tata-location-alert');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'tata-location-alert';
  const icon = type === 'error' ? 'alert-triangle' : 'check-circle-2';
  const label = type === 'error' ? 'Failed' : 'Fetched';
  toast.innerHTML = `
    <div class="tata-location-alert-icon"><i data-lucide="${icon}"></i></div>
    <div>
      <div class="tata-location-alert-title">${label}: ${message}</div>
      <div class="tata-location-alert-close">&times;</div>
    </div>`;
  toast.style.background = type === 'error' ? '#fee2e2' : '#dcfce7';
  toast.style.border = '1px solid ' + (type === 'error' ? '#ef4444' : '#059669');
  document.body.appendChild(toast);
  toast.addEventListener('click', () => toast.remove());
  setTimeout(() => toast.remove(), 8000);
  try { lucide.createIcons(); } catch(e) {}
}

// --- Master Credentials Logic ---
const credForm = document.getElementById('tata-credentials-form');
const tataUserInput = document.getElementById('tata-username');
const tataPassInput = document.getElementById('tata-password');
const toggleTataPassBtn = document.getElementById('toggle-tata-password');

if (toggleTataPassBtn && tataPassInput) {
  toggleTataPassBtn.addEventListener('click', () => {
    if (tataPassInput.type === 'password') {
      tataPassInput.type = 'text';
      toggleTataPassBtn.innerHTML = '<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>';
    } else {
      tataPassInput.type = 'password';
      toggleTataPassBtn.innerHTML = '<i data-lucide="eye" style="width: 16px; height: 16px;"></i>';
    }
    lucide.createIcons();
  });
}

async function loadMasterCredentials() {
  if (!tataUserInput || !tataPassInput) return;
  try {
    const { data: userRow } = await supabase.from('tata_bot_settings').select('value').eq('key', 'master_username').single();
    const { data: passRow } = await supabase.from('tata_bot_settings').select('value').eq('key', 'master_password').single();
    if (userRow) tataUserInput.value = userRow.value;
    if (passRow) tataPassInput.value = passRow.value;
  } catch (err) {
    console.error('Error loading master credentials:', err);
  }
}
loadMasterCredentials();

if (credForm) {
  credForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = credForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin" style="width:16px;height:16px;"></i> Saving...';
    btn.disabled = true;
    
    try {
      await supabase.from('tata_bot_settings').upsert([
        { key: 'master_username', value: tataUserInput.value },
        { key: 'master_password', value: tataPassInput.value }
      ], { onConflict: 'key' });
      
      const msg = document.getElementById('settings-msg');
      if (msg) {
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 3000);
      }
    } catch (err) {
      console.error('Error saving master credentials:', err);
      alert('Error saving credentials');
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
    lucide.createIcons();
  });
}

const addLocForm = document.getElementById('add-location-form');
const toggleLocPassBtn = document.getElementById('toggle-loc-password');
const locPassInput = document.getElementById('loc-password');

if (toggleLocPassBtn && locPassInput) {
  toggleLocPassBtn.addEventListener('click', () => {
    if (locPassInput.type === 'password') {
      locPassInput.type = 'text';
      toggleLocPassBtn.innerHTML = '<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>';
    } else {
      locPassInput.type = 'password';
      toggleLocPassBtn.innerHTML = '<i data-lucide="eye" style="width: 16px; height: 16px;"></i>';
    }
    lucide.createIcons();
  });
}

if (addLocForm) {
  addLocForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = addLocForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const locName = document.getElementById('loc-name').value.trim().toUpperCase();
    const username = document.getElementById('loc-username').value;
    const password = document.getElementById('loc-password').value;
    
    try {
      await supabase.from('tata_locations').insert({ location_name: locName, username, password });
      addLocForm.reset();
      loadLocations();
    } catch (err) {
      console.error('Error saving location:', err);
      alert('Error saving location');
    }
    btn.disabled = false;
  });
}

const fetchForm = document.getElementById('fetch-data-form');
if (fetchForm) {
  fetchForm.addEventListener('submit', (e) => e.preventDefault());

  // Pre-fill the consumption date range so a fetch can never be submitted
  // with empty dates. The scraper rejects a missing range outright, and a
  // blank submission used to queue a unit that failed on every retry.
  const fromDateEl = document.getElementById('from-date');
  const toDateEl = document.getElementById('to-date');
  if (fromDateEl && toDateEl && !fromDateEl.value && !toDateEl.value) {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    const iso = (d) => d.toISOString().split('T')[0];
    fromDateEl.value = iso(from);
    toDateEl.value = iso(to);
  }

  const handleFetch = async (btnId, type) => {
    const btn = document.getElementById(btnId);
    const statusDiv = document.getElementById('fetch-status');
    const rawFromDate = document.getElementById('from-date').value;
    const rawToDate = document.getElementById('to-date').value;
    const targetLocation = document.getElementById('fetch-target-location').value;

    if (type === 'consumption' && (!rawFromDate || !rawToDate)) {
      statusDiv.style.display = 'block';
      statusDiv.style.color = '#ef4444';
      statusDiv.textContent = 'Please select both dates for consumption data.';
      return;
    }

    let fromDate = '', toDate = '';
    if (rawFromDate && rawToDate) {
      // Convert YYYY-MM-DD to MM/DD/YYYY
      const [fY, fM, fD] = rawFromDate.split('-');
      fromDate = `${fM}/${fD}/${fY}`;
      const [tY, tM, tD] = rawToDate.split('-');
      toDate = `${tM}/${tD}/${tY}`;
    }

    const originalText = btn.innerHTML;
    const originalBg = btn.style.background;
    btn.innerHTML = '<i data-lucide="loader" class="lucide-spin"></i> Fetching...';
    btn.disabled = true;
    
    // Disable the other button too
    const otherBtnId = type === 'consumption' ? 'fetch-inventory-btn' : 'fetch-consumption-btn';
    const otherBtn = document.getElementById(otherBtnId);
    otherBtn.disabled = true;
    
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--text-secondary)';
    statusDiv.textContent = 'Starting background scraper... please wait and do not close this page.';
    lucide.createIcons();
    
    function resetBtn() {
      btn.innerHTML = originalText;
      btn.style.background = originalBg;
      btn.disabled = false;
      otherBtn.disabled = false;
      lucide.createIcons();
    }
    
    try {
      // The server owns the queue so that a manual fetch merges into a run that
      // is already in flight instead of discarding the locations it had queued.
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, fromDate, toDate, targetLocation })
      });
      if (!response.ok) {
        // The server returns the real reason in the body. Surfacing only the
        // status code hid things like a missing date range behind "HTTP 500".
        let detail = 'HTTP ' + response.status;
        try {
          const payload = await response.json();
          if (payload && payload.message) detail = payload.message;
        } catch { /* keep the status-code fallback */ }
        throw new Error('Could not start the scraper: ' + detail);
      }

      // Progress is read from the job row below while it runs in the background.
      let pollInterval = setInterval(async () => {
          try {
              const { data } = await supabase.from('tata_bot_settings').select('value').eq('key', 'fetch_job');
              if (data && data.length > 0) {
                  const updatedJob = JSON.parse(data[0].value);
                  statusDiv.innerHTML = updatedJob.logs || 'Processing...';

                  // Step-by-step progress bar driven by job.progress
                  const wrap = document.getElementById('fetch-progress-wrap');
                  const bar = document.getElementById('fetch-progress-bar');
                  const pctEl = document.getElementById('fetch-progress-pct');
                  const labelEl = document.getElementById('fetch-progress-label');
                  const prog = updatedJob.progress;
                  if (wrap && bar && prog && prog.total > 0) {
                      wrap.style.display = 'block';
                      const pct = Math.max(0, Math.min(100, Math.round((prog.step / prog.total) * 100)));
                      bar.style.width = pct + '%';
                      if (pctEl) pctEl.textContent = pct + '%';
                      if (labelEl) {
                          const running = updatedJob.status === 'processing';
                          labelEl.textContent = running
                              ? `Step ${prog.step} of ${prog.total}`
                              : (updatedJob.status === 'completed' ? 'Completed' : 'Stopped');
                      }
                  } else if (wrap) {
                      wrap.style.display = 'none';
                  }
                  
                  // Better log parsing for alerts
                  if (!window.__tataLocationAlerts) window.__tataLocationAlerts = new Set();
                  
                  // Extract raw text lines from div tags
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = updatedJob.logs || '';
                  const lines = Array.from(tempDiv.querySelectorAll('div')).map(d => d.textContent.trim());
                  
                  for (const plain of lines) {
                    if (!plain) continue;
                    const sig = plain.slice(0, 90);
                    if (!window.__tataLocationAlerts.has(sig)) {
                      window.__tataLocationAlerts.add(sig);
                      if (plain.includes('ERROR:') || plain.includes('FATAL ERROR:')) {
                        let errMsg = plain.replace(/^.*FATAL ERROR:\s*/, '').replace(/^.*ERROR:\s*/, '');
                        // If it's a huge Cloudflare block, shorten it
                        if (errMsg.includes('url=') || errMsg.length > 100) {
                          const simple = errMsg.split('url=')[0].trim();
                          errMsg = simple || errMsg.substring(0, 100) + '...';
                        }
                        showLocationAlert('error', errMsg);
                      } else if (/UPLOADED \d+ ROWS/i.test(plain)) {
                        const loc = (plain.match(/^.*-\s+(.+?)\s+(?:CONSUMPTION|INVENTORY)?\s*DATA/i) || [])[1] || plain.split(' ')[0];
                        showLocationAlert('success', `${loc.trim().replace(/\s+$/, '')} data fetched successfully`);
                      } else if (plain.includes('successfully')) {
                        showLocationAlert('success', 'All requested scrapers finished successfully');
                      }
                    }
                  }

                  if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
                      clearInterval(pollInterval);
                      const doneBar = document.getElementById('fetch-progress-bar');
                      const donePct = document.getElementById('fetch-progress-pct');
                      const doneLabel = document.getElementById('fetch-progress-label');
                      if (updatedJob.status === 'completed') {
                          if (doneBar) doneBar.style.width = '100%';
                          if (donePct) donePct.textContent = '100%';
                          if (doneLabel) doneLabel.textContent = 'Completed';
                          setTimeout(() => location.reload(), 8000);
                      } else if (doneLabel) {
                          doneLabel.textContent = `Stopped at step ${(updatedJob.progress && updatedJob.progress.step) || 0}`;
                      }
                      if (updatedJob.status === 'completed') {
                          statusDiv.style.color = '#059669';
                          btn.innerHTML = '<i data-lucide="check"></i> Done!';
                          btn.style.background = '#059669';
                          lucide.createIcons();
                          
                          const newDateStr = new Date().toLocaleString();
                          await supabase.from('tata_bot_settings').upsert({ key: 'last_sync', value: newDateStr }, { onConflict: 'key' });
                          loadLastSync();
                          
                          const syncText = document.getElementById('last-updated-text');
                          if (syncText && typeof formatBeautifulDate === 'function') {
                            syncText.textContent = formatBeautifulDate(newDateStr);
                          }
                          
                          setTimeout(() => loadDataAndRender(), 1000);
                      } else {
                          statusDiv.style.color = '#ef4444';
                      }
                      
                      setTimeout(() => resetBtn(), 5000);
                  }
              }
          } catch(e) { console.error('Polling error', e); }
      }, 1000);
          
    } catch (err) {
      console.error('Error fetching data:', err);
      btn.innerHTML = '<i data-lucide="alert-triangle"></i> Error';
      statusDiv.style.color = '#ef4444';
      statusDiv.textContent = 'Failed to submit job to Supabase: ' + err.message;
      resetBtn();
    }
  };

  document.getElementById('fetch-consumption-btn').addEventListener('click', () => handleFetch('fetch-consumption-btn', 'consumption'));
  document.getElementById('fetch-inventory-btn').addEventListener('click', () => handleFetch('fetch-inventory-btn', 'inventory'));

  const stopBtn = document.getElementById('stop-fetch-btn');
  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      const originalHtml = stopBtn.innerHTML;
      stopBtn.innerHTML = '<i data-lucide="loader" class="lucide-spin" style="width: 16px; height: 16px;"></i> Cancelling...';
      try {
        await fetch('/api/cancel', { method: 'POST' });
      } catch (e) {
        console.error('Cancel failed', e);
      } finally {
        setTimeout(() => { stopBtn.innerHTML = originalHtml; lucide.createIcons(); }, 2000);
      }
    });
  }
}


// Removed old mock sync logic

// --- DASHBOARD LIVE DATA & CALCULATION LOGIC ---
let rawInventoryData = [];
let aggregatedParts = [];
let filteredProcessedParts = [];
let currentPage = 1;
const itemsPerPage = 50;

async function fetchTableData(tableName, locationFilter = null, columns = '*') {
  // 1. Get exact row count first (fast, head-only)
  let countQuery = supabase.from(tableName).select('id', { count: 'exact', head: true });
  if (locationFilter) {
    countQuery = countQuery.eq('division', locationFilter);
  }
  
  const { count, error: countErr } = await countQuery;
  if (countErr) {
    console.error(`Error counting ${tableName}:`, countErr);
    return [];
  }
  if (!count) return [];

  // 2. Fetch first chunk to detect Supabase's max-rows limit, but cap at 10,000 to avoid statement timeouts
  let firstQuery = supabase.from(tableName).select(columns).range(0, 9999);
  if (locationFilter) {
    firstQuery = firstQuery.eq('division', locationFilter);
  }
  const { data: firstData, error: firstErr } = await firstQuery;
  
  if (firstErr) {
    console.error(`Error fetching first chunk of ${tableName}:`, firstErr);
    return [];
  }
  if (!firstData || firstData.length === 0) return [];
  
  const tableData = [...firstData];
  const detectedLimit = firstData.length;
  
  // If we got everything, or if the count is within what we got, we are done! 100x faster!
  if (tableData.length >= count || detectedLimit < 1000) {
    return tableData;
  }

  // If Supabase truncated our request to its max-rows limit (e.g., 1000), we must paginate the rest
  const pageSize = detectedLimit;
  const remainingPages = Math.ceil((count - pageSize) / pageSize);
  
  const queries = [];
  for (let page = 1; page <= remainingPages; page++) {
    let query = supabase.from(tableName).select(columns).range(page * pageSize, (page + 1) * pageSize - 1);
    if (locationFilter) {
      query = query.eq('division', locationFilter);
    }
    queries.push(query);
  }
  
  if (queries.length > 0) {
    // Process in batches of 6 to avoid browser connection limit exhaustion
    for (let i = 0; i < queries.length; i += 6) {
      const batch = queries.slice(i, i + 6);
      const results = await Promise.all(batch);
      for (const { data, error } of results) {
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          continue;
        }
        if (data && data.length) tableData.push(...data);
      }
    }
  }
  
  return tableData;
}

function getDateRangeFilter() {
  const fromEl = document.getElementById('filter-from-date');
  const toEl = document.getElementById('filter-to-date');
  const from = fromEl && fromEl.value ? fromEl.value : null;
  const to = toEl && toEl.value ? toEl.value : null;
  if (!from && !to) return null;
  return { from, to };
}

function filterByDateRange(data, dateField, range) {
  if (!range) return data;
  return data.filter(row => {
    const val = row[dateField];
    if (!val) return false;
    const d = new Date(val);
    if (isNaN(d.getTime())) return false;
    if (range.from && d < new Date(range.from)) return false;
    if (range.to && d > new Date(range.to + 'T23:59:59')) return false;
    return true;
  });
}

async function fetchInventoryData() {
  try {
    const sessionStr = sessionStorage.getItem('currentUser') || '{}';
    const currentUser = JSON.parse(sessionStr);
    const userLocation = currentUser.location || 'ALL';
    const isAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || userLocation === 'ALL';
    const filter = isAdmin ? null : userLocation;
    const dateRange = getDateRangeFilter();

    let [inventoryData, consumptionData, priceListData, movementLogsData] = await Promise.all([
      fetchTableData('tata_spare_inventory', filter, 'part_no, division, qty, availability, product_category, description, last_receipt, fetched_at'),
      fetchTableData('tata_consumption_data', filter, '*'),
      fetchTableData('tata_price_list', null, 'part_number, ndp, description, category'),
      supabase.from('tata_movement_logs').select('*')
    ]);

    if (dateRange) {
      inventoryData = filterByDateRange(inventoryData, 'last_receipt', dateRange);
      consumptionData = filterByDateRange(consumptionData, 'date', dateRange);
    }
    
    let movementLogs = movementLogsData.data || [];
    if (filter) {
      movementLogs = movementLogs.filter(l => {
         if (!l.location) return false;
         const d1 = l.location.toLowerCase().replace(/\s+/g, '');
         const d2 = filter.toLowerCase().replace(/\s+/g, '');
         return d1 === d2;
      });
    }
    
    return { inventory: inventoryData, consumption: consumptionData, priceList: priceListData, movementLogs: movementLogs };
  } catch (err) {
    console.error('Network error fetching from Supabase:', err);
    return { inventory: [], consumption: [], priceList: [] };
  }
}

function processRawData({ inventory, consumption, priceList = [], movementLogs = [] }) {
  const grouped = new Map();
  
  // Pre-process price list data
  const priceByPart = new Map();
  priceList.forEach(row => {
    const pn = String(row.part_number || '').trim().toUpperCase();
    if (!pn) return;
    priceByPart.set(pn, {
      ndp: parseFloat(row.ndp) || 0,
      description: row.description || '',
      category: row.category || ''
    });
  });

  // Helper to map raw division strings to standard location names
  const mapLocation = (divisionStr) => {
    if (!divisionStr) return 'NARWAL';
    const lowerD = divisionStr.toLowerCase().replace(/\s+/g, '');
    if (lowerD.includes('channirama') || lowerD.includes('chhanirama')) return 'CHANNIRAMA';
    if (lowerD.includes('supwal') || lowerD.includes('smamsamba')) return 'SUPWAL';
    if (lowerD.includes('kathua') || lowerD.includes('smamkathua')) return 'KATHUA';
    if (lowerD.includes('jammu') || lowerD.includes('narwal') || lowerD.includes('narval')) return 'NARWAL';
      if (lowerD.includes('lambheri')) return 'LAMBHERI';
      if (lowerD.includes('poonch')) return 'POONCH';
    return divisionStr; // Default
  };

  // Pre-process consumption data grouped by Part + Location
  const consumptionByPartLoc = new Map();
  consumption.forEach(row => {
    const pn = String(row.part_no || row.part_number || '').trim().toUpperCase(); 
    const loc = mapLocation(row.division);
    const key = pn + '_' + loc;
    
    const qty = parseInt(row.sold_qty) || 0;
    if (consumptionByPartLoc.has(key)) {
      consumptionByPartLoc.set(key, consumptionByPartLoc.get(key) + qty);
    } else {
      consumptionByPartLoc.set(key, qty);
    }
  });

  // True rolling six-month consumption, per Part + Location.
  // `consumption30d` above is the sum of every loaded row regardless of date,
  // and the feed spans months, so it must not be divided by 30. Window each
  // row to the trailing 180 days before accumulating, and keep the location
  // in the key so a part is not summed across all depots.
  const ROLLING_6M_DAYS = 180;
  const rolling6mStart = new Date(Date.now() - ROLLING_6M_DAYS * 86400000);
  const consumption6mByPartLoc = new Map();
  consumption.forEach(row => {
    const pn = String(row.part_no || row.part_number || '').trim().toUpperCase();
    const loc = mapLocation(row.division);
    const key = pn + '_' + loc;

    const d = window.parseTataDate(row.date);
    if (!d || isNaN(d.getTime()) || d < rolling6mStart) return;

    const qty = parseInt(row.sold_qty) || 0;
    consumption6mByPartLoc.set(key, (consumption6mByPartLoc.get(key) || 0) + qty);
  });
  
  inventory.forEach(row => {
    const pn = String(row.part_no || row.part_number || '').trim().toUpperCase();
    const loc = row.division || row.location_1 || 'Narwal';
    const standardLoc = mapLocation(loc);
    const consKey = pn + '_' + standardLoc; const key = consKey;
    
    const consQty = consumptionByPartLoc.get(consKey) || 0;
    const priceData = priceByPart.get(pn) || {};
    const finalNdp = priceData.ndp || 0;
    const finalDesc = priceData.description || row.description || 'Unknown';
    const finalCategory = (row.product_category || priceData.category || 'Uncategorized').trim().toUpperCase();

    if (!grouped.has(key)) {
      grouped.set(key, {
        partId: pn,
        model: finalDesc,
        location: standardLoc,
        productCategory: finalCategory,
        currentStock: 0,
        reserved: 0,
        inTransit: 0,
        stockValue: 0,
        ndpPrice: finalNdp,
        min: 5,
        demand: Math.ceil(consQty / 4),
        consumption30d: consQty,
        consumption6mRolling: consumption6mByPartLoc.get(consKey) || 0,
        last_receipt: row.last_receipt || '',
        ageingDays: -1
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
    
    // Update last_receipt to the most recent one
    const lr = row.last_receipt;
    if (lr) {
      if (!existing.last_receipt || window.parseTataDate(lr) > window.parseTataDate(existing.last_receipt)) {
        existing.last_receipt = lr;
      }
    }
  });

  // Include consumption that has NO inventory record
  consumptionByPartLoc.forEach((consQty, key) => {
    if (!grouped.has(key)) {
      const parts = key.split('_');
      const loc = parts.pop();
      const pn = parts.join('_');
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
        last_receipt: '',
        ageingDays: -1
      });
    }
  });

  // Apply manual movement logs
  movementLogs.forEach(log => {
    const loc = mapLocation(log.location);
    const pn = String(log.part_id || '').trim().toUpperCase();
    const key = pn + '_' + loc;
    const existing = grouped.get(key);
    if (existing) {
      if (log.movement_type === 'IN') {
        existing.currentStock += Number(log.qty) || 0;
      } else if (log.movement_type === 'OUT') {
        existing.currentStock -= Number(log.qty) || 0;
      }
    } else {
      // Create it if it doesn't exist
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
        consumption6mRolling: 0,
        last_receipt: log.date || '',
        ageingDays: -1
      });
    }
  });

  // Stock value = available (on hand) qty x price list NDP
  const now = new Date();
  for (const part of grouped.values()) {
    part.stockValue = part.ndpPrice * part.currentStock;
    if (part.currentStock > 0 && part.last_receipt) {
      const lrDate = window.parseTataDate(part.last_receipt);
      if (lrDate && !isNaN(lrDate)) {
        part.ageingDays = Math.floor((now - lrDate) / (1000 * 60 * 60 * 24));
      }
    } else {
      part.ageingDays = -1; // No stock = no ageing
    }
  }

  return Array.from(grouped.values());
}

function calculateRequirements(parts) {
  let kpis = {
    critical: 0, toOrder: 0, pending: 0, openPo: 1, transit: 0, available: 0, overstock: 0, demand: 0, backorders: 1, stockValue: 0
  };
  
  let categoryTotals = {
    'ACCESSORIES': 0,
    'CO-BRANDED': 0,
    'FIAT SPARES': 0,
    'LUBRICANT': 0,
    'NANO SPARES': 0,
    'SPARE PART': 0
  };

  const ROLLING_6M_DAYS = 180;

  const processed = parts.map(part => {
    // Override lead time and safety stock based on business rule: 14 days (7 days internal + 7 days supplier)
    const leadTime = 14;
    // Precomputed per Part + Location over a trailing 180-day window.
    // Never fall back to consumption30d * 6: that field is an unfiltered sum of
    // every loaded row, so scaling it would not be a real six-month average.
    const consumption6m = Number(part.consumption6mRolling) || 0;
    const avgDailyConsumption = consumption6m / ROLLING_6M_DAYS;
    const safetyStock = Math.ceil(avgDailyConsumption * leadTime);
    
    const available = part.currentStock - part.reserved;
    // Net Requirement = Demand + Safety Stock - Available Stock - Confirmed In-Transit
    const netRequirement = part.demand + safetyStock - available - part.inTransit;
    const orderQty = Math.max(0, netRequirement);
    
    kpis.available += available;
    kpis.stockValue += part.stockValue;
    kpis.demand += part.demand;
    if (part.inTransit > 0) kpis.transit += part.inTransit;
    
    const cat = part.productCategory || 'Uncategorized';
    if (!categoryTotals[cat]) categoryTotals[cat] = 0;
    categoryTotals[cat] += (part.stockValue || 0);

    let status = { text: '<i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> OK', class: 'green' };
    if (orderQty > 0) {
      status = { text: '<i data-lucide="shopping-cart" style="width: 12px; height: 12px;"></i> To Order', class: 'blue' };
      kpis.toOrder++;
    } else if (available < part.min && part.inTransit > 0) {
      status = { text: '<i data-lucide="truck" style="width: 12px; height: 12px;"></i> In Transit', class: 'purple' };
    }
    
    if (available < part.min) kpis.critical++;

    // AI Reason String
    const aiReason = `<strong>Part ${part.partId} — Order ${orderQty} units</strong><br><br>
      Current available: ${available}<br>
      6-month consumption: ${consumption6m} (avg ~${Math.round(avgDailyConsumption*30)}/month)<br>
      Open demand: ${part.demand}<br>
      Safety stock (14 days): ${safetyStock}<br>
      In-transit: ${part.inTransit}<br>
      Supplier lead time: ${leadTime} days<br><br>
      <strong>Reason:</strong> ${orderQty > 0 ? 'Available stock is insufficient to cover current demand and safety stock after considering confirmed incoming stock.' : 'Current inventory and incoming stock are sufficient to meet demand and maintain safety thresholds.'}`;

    return { ...part, leadTime, safetyStock, consumption6m, available, netRequirement, orderQty, status, aiReason };
  });

  return { processed, kpis, categoryTotals };
}

async function checkMissingDataAlerts() {
  // Always-visible error alert when a configured Tata location has no inventory data
  // in Supabase (e.g. the Siebel login failed and the data could not be fetched).
  const existing = document.getElementById('missing-locations-alert');
  if (existing) existing.remove();

  const renderAlertBanner = (title, message, locations) => {
    const banner = document.createElement('div');
    banner.id = 'missing-locations-alert';
    banner.style.cssText = 'background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; z-index: 20;';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <i data-lucide="alert-triangle" style="color: #ef4444; width: 22px; height: 22px;"></i>
        <div>
          <h4 style="margin: 0; color: #ef4444; font-size: 0.95rem; font-weight: 600;">${title}</h4>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.85rem;">${message}${locations && locations.length ? ' (Locations: ' + locations.join(', ') + ')' : ''}</p>
        </div>
      </div>`;

    const dashboardContent = document.querySelector('#view-dashboard .dashboard-content') || document.getElementById('view-dashboard');
    if (dashboardContent) {
      dashboardContent.prepend(banner);
    } else {
      document.body.prepend(banner);
    }
    try { lucide.createIcons(); } catch (e) {}
  };

  // Server-reported alert, e.g. the MIS Spares report is hidden during the
  // last 2 days of the month while Tata closes the books.
  let inventoryAlert = null;
  try {
    const { data } = await supabase.from('tata_bot_settings').select('value').eq('key', 'inventory_alert').maybeSingle();
    if (data && data.value) inventoryAlert = JSON.parse(data.value);
  } catch (e) {
    console.error('Error reading inventory alert:', e);
  }

  if (inventoryAlert && inventoryAlert.type === 'month_end_closing') {
    renderAlertBanner(
      'MIS Spares data option not found due to month closing',
      inventoryAlert.message || 'The report is hidden for the last 2 days of the month and reappears 2-3 days after the 1st.',
      inventoryAlert.locations
    );
    return;
  }

  let locations = [];
  try {
    const { data, error } = await supabase.from('tata_locations').select('location_name');
    if (error) throw error;
    locations = data || [];
  } catch (e) {
    console.error('Error loading locations for alert:', e);
    return;
  }

  const missing = [];
  for (const loc of locations) {
    if (!loc.location_name) continue;
    try {
      const { count, error } = await supabase
        .from('tata_spare_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('division', loc.location_name);
      if (error) throw error;
      if (!count) missing.push(loc.location_name);
    } catch (e) {
      console.error('Error counting inventory for', loc.location_name, e);
    }
  }

  if (!missing.length) return;

  renderAlertBanner(
    `Inventory data not fetched for: ${missing.join(', ')}`,
    'Unable to fetch data for the above location(s). Check the Tata DMS login credentials and retry the fetch. This alert hides automatically once data is available.'
  );
}

async function loadDataAndRender() {
  // Show the full-screen spinner for the whole fetch + render cycle. The network
  // round-trip dominates here (40k+ consumption rows), so this stays up for far
  // longer than the brief render pass that renderDashboard() wraps.
  showLoadingOverlay('Fetching inventory, consumption and price list...');

  const tbody = document.getElementById('inventory-table-body');
  if(tbody) tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 40px; color: var(--text-secondary);"><div class="spin-animation" style="display:inline-block; margin-right:12px; width:24px; height:24px; border:3px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; vertical-align:middle;"></div><span style="font-size: 1.1rem; vertical-align:middle;">Loading live data from Supabase...</span></td></tr>';
  
  try {
    rawInventoryData = await fetchInventoryData();
    window.rawInventoryData = rawInventoryData;
    aggregatedParts = processRawData(rawInventoryData);

    const updatedEl = document.getElementById('last-updated-text');
    if (updatedEl && rawInventoryData.inventory && rawInventoryData.inventory.length > 0) {
      // Grab the updated_at from the first row (they should all be similar from the bulk insert)
      const latestDateStr = rawInventoryData.inventory[0].updated_at || rawInventoryData.inventory[0].fetched_at;
      if (latestDateStr) {
        updatedEl.textContent = formatBeautifulDate(latestDateStr);
      } else {
        updatedEl.textContent = 'Unknown';
      }
    } else if (updatedEl) {
      updatedEl.textContent = 'No data available';
    }

    renderDashboard();
    renderDashboardAnalytics();
    await checkMissingDataAlerts();
    await populateLocationSelect();
    if (typeof window.renderRecentActivity === 'function' && typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    const banner = document.getElementById('data-load-error');
    if (banner) {
      banner.textContent = 'Failed to load data: ' + (err && err.message ? err.message : err);
      banner.style.display = 'block';
    }
  } finally {
    hideLoadingOverlay();
  }
}

// Full-screen loading spinner helpers. The overlay element lives in dashboard.html.
function showLoadingOverlay(detailText) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'flex';
  const detail = document.getElementById('loading-overlay-detail');
  if (detail) detail.textContent = detailText || '';
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
  const banner = document.getElementById('data-load-error');
  if (banner) banner.style.display = 'none';
}
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;

// --- Date Range Filter Event Listeners (all pages) ---
document.querySelectorAll('.filter-from-date').forEach(el => {
  el.addEventListener('change', () => {
    if (typeof loadDataAndRender === 'function') loadDataAndRender();
  });
});
document.querySelectorAll('.filter-to-date').forEach(el => {
  el.addEventListener('change', () => {
    if (typeof loadDataAndRender === 'function') loadDataAndRender();
  });
});
document.querySelectorAll('.filter-clear-btn').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.filter-from-date').forEach(f => f.value = '');
    document.querySelectorAll('.filter-to-date').forEach(t => t.value = '');
    const gInput = document.getElementById('global-search-input');
    if (gInput) gInput.value = '';
    window.hSearchQuery = '';
    window.filteredProcessedParts = window.originalProcessedParts || [];
    window._searchIndex = null;
    window._searchIndexParts = null;
    if (typeof loadDataAndRender === 'function') loadDataAndRender();
  });
});

function renderDashboard() {
  // The heavy lifting is already covered by the full-screen spinner in
  // loadDataAndRender. Keep renderDashboard instant to avoid double spinners.
  _renderDashboard_internal();
}

function _renderDashboard_internal() {
  const locationSelect = document.getElementById('location-select');
  const selectedLoc = locationSelect ? locationSelect.value : 'ALL';
  
  const filteredParts = aggregatedParts.filter(part => {
    if (selectedLoc === 'ALL') return true;
    const pLoc = (part.location || '').toUpperCase().replace(/\s+/g, '');
    const sLoc = (selectedLoc || '').toUpperCase().replace(/\s+/g, '');
    return pLoc === sLoc;
  });

  const { processed, kpis, categoryTotals } = calculateRequirements(filteredParts);
  filteredProcessedParts = processed;
  window.originalProcessedParts = [...processed];
  
  // Update KPIs
  if(document.getElementById('kpi-critical')) document.getElementById('kpi-critical').textContent = kpis.critical;
  if(document.getElementById('kpi-to-order')) document.getElementById('kpi-to-order').textContent = kpis.toOrder;
  if(document.getElementById('kpi-pending')) document.getElementById('kpi-pending').textContent = kpis.pending;
  if(document.getElementById('kpi-open-po')) document.getElementById('kpi-open-po').textContent = kpis.openPo;
  if(document.getElementById('kpi-in-transit')) document.getElementById('kpi-in-transit').textContent = kpis.transit;
  if(document.getElementById('kpi-available')) document.getElementById('kpi-available').textContent = kpis.available;
  if(document.getElementById('kpi-stock-value')) {
    document.getElementById('kpi-stock-value').textContent = '₹' + kpis.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  if(document.getElementById('kpi-overstock')) document.getElementById('kpi-overstock').textContent = kpis.overstock;
  if(document.getElementById('kpi-demand')) document.getElementById('kpi-demand').textContent = kpis.demand;
  if(document.getElementById('kpi-backorders')) document.getElementById('kpi-backorders').textContent = kpis.backorders;
  
  // Update Integration Status Calculations
  const devStatusTotal = document.getElementById('calc-total');
  const devStatusCritical = document.getElementById('calc-critical');
  const devStatusToOrder = document.getElementById('calc-to-order');
  const devStatusBadge = document.getElementById('calc-status');

  if (devStatusTotal) devStatusTotal.textContent = filteredProcessedParts.length.toLocaleString();
  if (devStatusCritical) devStatusCritical.textContent = kpis.critical.toLocaleString();
  if (devStatusToOrder) devStatusToOrder.textContent = kpis.toOrder.toLocaleString();
  if (devStatusBadge) {
    devStatusBadge.textContent = "Synced Successfully";
    devStatusBadge.className = "status-badge green";
  }
  
  if(typeof window.renderHealthTable === 'function') window.renderHealthTable();
  if(typeof window.renderDemandTable === 'function') window.renderDemandTable();
  if(typeof window.renderConsumptionTable === 'function') window.renderConsumptionTable();
  if(typeof window.renderConsumptionAnalytics === 'function') window.renderConsumptionAnalytics();
  if(typeof window.renderPPNI === 'function') window.renderPPNI();
  
  lucide.createIcons();
  if (typeof renderTablePage === 'function') renderTablePage();
  
  // Update Category Cards
  const catContainer = document.getElementById('category-cards-container');
  if (catContainer) {
    catContainer.innerHTML = '';
    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    
    sortedCats.forEach(([catName, total]) => {
      const card = document.createElement('div');
      card.style.cssText = 'background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; min-width: 120px; box-shadow: 0 2px 4px -1px rgba(0,0,0,0.03);';
      
      const title = document.createElement('span');
      title.style.cssText = 'font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 500; margin-bottom: 4px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;';
      title.textContent = catName;
      title.title = catName; 
      
      const val = document.createElement('span');
      val.style.cssText = 'font-size: 1.05rem; color: var(--text-primary); font-weight: 600;';
      val.textContent = '₹' + total.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      
      card.appendChild(title);
      card.appendChild(val);
      catContainer.appendChild(card);
    });
  }

  // Reset pagination
  currentPage = 1;
  renderTablePage();
}

window.locationChartInstance = null;
window.topPartsChartInstance = null;

window.oldRenderDashboardAnalytics = function() {
  if (!window.originalProcessedParts || window.originalProcessedParts.length === 0) return;
  
  // 1. Process data for charts & KPIs
  const locationMap = {};
  const partMap = {};
  let totalConsumptionValue = 0;
  let totalPartsConsumed = 0;
  
  window.originalProcessedParts.forEach(p => {
    // Value by location
    const val = p.currentStock * p.ndpPrice;
    locationMap[p.location] = (locationMap[p.location] || 0) + val;
    
    // Top parts by consumption
    partMap[p.partId] = {
       name: p.partId,
       qty: p.consumption30d
    };
    
    // Global KPIs
    totalConsumptionValue += p.consumption30d * p.ndpPrice;
    totalPartsConsumed += p.consumption30d;
  });
  
  const locLabels = Object.keys(locationMap);
  const locData = Object.values(locationMap);
  
  const topParts = Object.values(partMap).sort((a,b) => b.qty - a.qty).slice(0, 5);
  const partLabels = topParts.map(p => p.name);
  const partData = topParts.map(p => p.qty);
  
  // Update Dashboard View KPIs
  const kpiVal = document.getElementById('kpi-total-value');
  const kpiQty = document.getElementById('kpi-total-qty');
  const kpiSpares = document.getElementById('kpi-total-spares');
  const kpiLocs = document.getElementById('kpi-active-locations');
  
  if (kpiVal) kpiVal.textContent = '₹' + Math.round(totalConsumptionValue).toLocaleString('en-IN');
  if (kpiQty) kpiQty.textContent = totalPartsConsumed.toLocaleString('en-IN');
  if (kpiSpares) kpiSpares.textContent = window.originalProcessedParts.length.toLocaleString('en-IN');
  if (kpiLocs) kpiLocs.textContent = locLabels.length.toLocaleString('en-IN');

  // 2. Render Charts
  const locCtx = document.getElementById('locationChart');
  if (locCtx && typeof Chart !== 'undefined') {
    if (window.locationChartInstance) window.locationChartInstance.destroy();
    window.locationChartInstance = new Chart(locCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: locLabels,
        datasets: [{
          label: 'Stock Value (₹)',
          data: locData,
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const partsCtx = document.getElementById('topPartsChart');
  if (partsCtx && typeof Chart !== 'undefined') {
    if (window.topPartsChartInstance) window.topPartsChartInstance.destroy();
    window.topPartsChartInstance = new Chart(partsCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: partLabels,
        datasets: [{
          data: partData,
          backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

// 3. Render Recent Activity Table
    renderRecentActivity();
};

window.invLocationChartInstance = null;
window.invStatusChartInstance = null;
window.invTopValueChartInstance = null;

function renderInventoryAnalytics() {
  if (typeof Chart === 'undefined') return;
  const parts = window.originalProcessedParts || [];

  // 1. Stock value by location
  const locMap = {};
  parts.forEach(p => {
    const loc = p.location || 'Unknown';
    locMap[loc] = (locMap[loc] || 0) + (Number(p.stockValue) || 0);
  });
  const locLabels = Object.keys(locMap);
  const locData = locLabels.map(l => locMap[l]);

  const thresholdFor = (p) => {
    const d = Number(p.demand) || 0;
    return d >= 1 ? d : 5;
  };

  // 2. Stock status mix (Out of Stock / Low Stock / Healthy)
  let oos = 0, low = 0, healthy = 0;
  parts.forEach(p => {
    if (Number(p.currentStock) === 0) oos++;
    else if (Number(p.currentStock) < thresholdFor(p)) low++;
    else healthy++;
  });

  // 3. Top 10 parts by stock value
  const topParts = [...parts].sort((a, b) => (Number(b.stockValue) || 0) - (Number(a.stockValue) || 0)).slice(0, 10);
  const topLabels = topParts.map(p => p.partId);
  const topData = topParts.map(p => Number(p.stockValue) || 0);

  const renderBar = (canvasId, instanceKey, labels, data, color, isHorizontal, formatMoney) => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const ins = window[instanceKey];
    if (ins) ins.destroy();
    window[instanceKey] = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: isHorizontal ? 'Part No.' : 'Value (Γé╣)',
          data,
          backgroundColor: color,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: isHorizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => formatMoney ? 'Γé╣' + Number(c.parsed.x !== undefined ? c.parsed.x : c.parsed.y).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : String(c.parsed.y !== undefined ? c.parsed.y : c.parsed.x)
            }
          }
        },
        scales: {
          x: { ticks: { font: { size: 10 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (v) => formatMoney ? 'Γé╣' + v.toLocaleString('en-IN', { notation: 'compact' }) : v } }
        }
      }
    });
  };

  const renderDoughnut = (canvasId, instanceKey, labels, data, colors) => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const ins = window[instanceKey];
    if (ins) ins.destroy();
    window[instanceKey] = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } }
        }
      }
    });
  };

  renderBar('invLocationChart', 'invLocationChartInstance', locLabels, locData, '#3b82f6', false, true);
  renderDoughnut('invStatusMixChart', 'invStatusChartInstance', ['Out of Stock', 'Low Stock', 'Healthy'], [oos, low, healthy], ['#ef4444', '#f59e0b', '#10b981']);
  renderBar('invTopValueChart', 'invTopValueChartInstance', topLabels, topData, '#8b5cf6', true, true);
}
window.renderInventoryAnalytics = renderInventoryAnalytics;

function renderRecentActivity() {
  const tbody = document.getElementById('recent-activity-table');
  if (!tbody || !window.rawInventoryData || !window.rawInventoryData.consumption) return;
  const rows = window.tableFilterData['recent-activity-table'] || window.rawInventoryData.consumption;
  const recentCons = rows.slice(0, 5);
  tbody.innerHTML = '';
  if (recentCons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color:var(--text-secondary);">No data found.</td></tr>';
    return;
  }
  recentCons.forEach(c => {
     const tr = document.createElement('tr');
     tr.innerHTML = `
       <td style="padding:12px 16px; border-bottom:1px solid var(--border-color); font-size:0.85rem;">${c.date || c.fetched_at?.slice(0,10) || '-'}</td>
       <td style="padding:12px 16px; border-bottom:1px solid var(--border-color); font-size:0.85rem;">${c.division || 'ALL'}</td>
       <td style="padding:12px 16px; border-bottom:1px solid var(--border-color); font-size:0.85rem;">${c.part_no || c.part_number || 'Unknown'}</td>
       <td style="padding:12px 16px; border-bottom:1px solid var(--border-color); font-size:0.85rem;">${c.part_desc || '-'}</td>
       <td style="padding:12px 16px; border-bottom:1px solid var(--border-color); font-size:0.85rem; text-align:center;">${c.sold_qty || 0}</td>
       <td style="padding:12px 16px; border-bottom:1px solid var(--border-color); font-size:0.85rem; text-align:right;">Γé╣${(Number(c.value) || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
     `;
     tbody.appendChild(tr);
  }); 
  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);
}
window.renderRecentActivity = renderRecentActivity;

function renderTablePage() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'flex';
  setTimeout(() => {
    try {
      _renderTablePage_internal();
    } finally {
      if (overlay) overlay.style.display = 'none';
    }
  }, 50);
}

function _renderTablePage_internal() {
  const tbody = document.getElementById('inventory-table-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  const totalItems = filteredProcessedParts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  const pageItems = filteredProcessedParts.slice(startIndex, endIndex);
  
  pageItems.forEach(part => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${part.partId}</td>
      <td title="${part.model}">${part.model}</td>
      <td>${part.currentStock}</td>
      <td>${part.reserved}</td>
      <td>${part.available}</td>
      <td>${part.inTransit}</td>
      <td>${part.min}</td>
      <td>${part.demand}</td>
      <td>${part.netRequirement}</td>
      <td>${part.orderQty}</td>
      <td><span class="status-badge ${part.status.class}">${part.status.text}</span></td>
      <td><button class="ai-btn" data-reason="${encodeURIComponent(part.aiReason)}" title="View AI Insights"><i data-lucide="bar-chart-2"></i></button></td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
  
  // Update pagination UI
  if(document.getElementById('page-start')) document.getElementById('page-start').textContent = totalItems === 0 ? 0 : startIndex + 1;
  if(document.getElementById('page-end')) document.getElementById('page-end').textContent = endIndex;
  if(document.getElementById('total-parts')) document.getElementById('total-parts').textContent = totalItems;
  
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const pageNumbers = document.getElementById('page-numbers');
  
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;
  
  if (pageNumbers) {
     pageNumbers.innerHTML = `<span style="font-size: 0.85rem; font-weight: 500;">Page ${currentPage} of ${totalPages}</span>`;
  }
  
  // Attach AI Modal Listeners for the current page
  const aiBtns = document.querySelectorAll('.ai-btn');
  const modal = document.getElementById('ai-modal');
  const modalText = document.getElementById('ai-reasoning-text');
  
  if(modal && modalText) {
    aiBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const reason = decodeURIComponent(btn.getAttribute('data-reason'));
        modalText.innerHTML = reason;
        modal.style.display = 'flex';
      });
    });
    
    document.getElementById('close-ai-modal').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('close-ai-modal-btn').addEventListener('click', () => modal.style.display = 'none');
  }
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
  loadDataAndRender();
  loadLocations();
  loadLastSync();

  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTablePage();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredProcessedParts.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderTablePage();
      }
    });
  }

  // Location Filter & Refresh Logic
  const locSelect = document.getElementById('location-select');
  if (locSelect) {
    locSelect.addEventListener('change', () => {
      renderDashboard();
      renderDashboardAnalytics();
      
      // Also update consumption charts and table if location changes
      if (typeof window.renderConsumptionAnalytics === 'function') window.renderConsumptionAnalytics();
      
      if (typeof window.renderConsumptionTable === 'function') {
         const rows = tableFilterConfigs['cons-table-body'].getRows();
         window.tableFilterData['cons-table-body'] = rows;
         window.cCurrentPage = 1;
         window.renderConsumptionTable();
      }
    });
  }
  
  const refreshBtn = document.getElementById('refresh-dashboard-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      let icon = refreshBtn.querySelector('svg') || refreshBtn.querySelector('i');
      if (icon) icon.classList.add('lucide-spin');
      try {
        await loadDataAndRender();
      } finally {
        setTimeout(() => {
          icon = refreshBtn.querySelector('svg') || refreshBtn.querySelector('i');
          if (icon) icon.classList.remove('lucide-spin');
        }, 500);
      }
    });
  }

  // Sync Database Logic
  const syncBtn = document.getElementById('sync-data-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      const btnIcon = syncBtn.querySelector('svg') || syncBtn.querySelector('i');
      const btnText = document.getElementById('sync-text');
      const originalText = btnText.textContent;
      
      // UI Loading state
      if (btnIcon) btnIcon.classList.add('lucide-spin');
      btnText.textContent = 'Syncing...';
      syncBtn.disabled = true;
      syncBtn.style.opacity = '0.7';
      
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'all', targetLocation: 'ALL' })
        });
        const result = await response.json();
        
        let currentIcon = syncBtn.querySelector('svg') || syncBtn.querySelector('i');
        if (currentIcon) currentIcon.classList.remove('lucide-spin');
        syncBtn.disabled = false;
        syncBtn.style.opacity = '1';
        
        if(result.success) {
          // The run is queued unit by unit, so it finishes long after this
          // response. "last sync" is stamped by the run itself, not here.
          btnText.textContent = 'Sync started';
          setTimeout(() => {
            console.log('Sync started, refreshing dashboard data from Supabase...');
            loadDataAndRender();
            btnText.textContent = originalText;
          }, 2000);
        } else {
          btnText.textContent = 'Sync Failed';
          console.error(result.message);
          alert('Sync Failed:\n\n' + (result.message || 'Unknown error occurred.'));
          btnText.textContent = originalText;
        }
      } catch (err) {
        let currentIcon = syncBtn.querySelector('svg') || syncBtn.querySelector('i');
        if (currentIcon) currentIcon.classList.remove('lucide-spin');
        syncBtn.disabled = false;
        syncBtn.style.opacity = '1';
        
        console.error('API Error:', err);
        btnText.textContent = 'Network Error';
        alert('Network Error:\n\nCould not connect to the sync server.');
        btnText.textContent = originalText;
      }
    });
  }
  


  // --- Dashboard User Management Logic ---
  let dashboardUsers = JSON.parse(localStorage.getItem('dashboardUsers')) || [
    { id: 1, username: 'admin', password: 'password', role: 'Super Admin', location: 'ALL' },
    { id: 2, username: 'manager1', password: 'password', role: 'Manager', location: 'SUPWAL' }
  ];
  
  function saveUsers() {
    localStorage.setItem('dashboardUsers', JSON.stringify(dashboardUsers));
  }

  const usersTableBody = document.getElementById('users-table-body');
  const addUserForm = document.getElementById('add-user-form');
  const changePwdForm = document.getElementById('change-password-form');
  
  function renderUsers() {
    if(!usersTableBody) return;
    usersTableBody.innerHTML = '';
    const users = window.tableFilterData['users-table-body'] || dashboardUsers;
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.id}</td>
        <td><strong>${user.username}</strong></td>
        <td style="font-family: monospace; color: #475569;">${user.password || 'N/A'}</td>
        <td><span class="status-badge ${user.role === 'Super Admin' || user.role === 'Admin' ? 'purple' : 'blue'}">${user.role}</span></td>
        <td><span class="status-badge" style="background:#e2e8f0; color:#475569;">${user.location || 'ALL'}</span></td>
        <td style="text-align: right;">
          <button class="btn-change-pwd" data-id="${user.id}" data-username="${user.username}" style="background:none; border:none; cursor:pointer; color: #f59e0b; margin-right: 8px;" title="Change Password"><i data-lucide="key"></i></button>
          <button class="btn-delete-user" data-id="${user.id}" style="background:none; border:none; cursor:pointer; color: #ef4444;" title="Delete User"><i data-lucide="trash-2"></i></button>
        </td>
      `;
      usersTableBody.appendChild(tr);
    });
    lucide.createIcons();
    attachUserActionListeners();
  }
  window.renderUsers = renderUsers;
  window.getDashboardUsers = () => dashboardUsers;

  function attachUserActionListeners() {
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        if(confirm('Are you sure you want to delete this user?')) {
          dashboardUsers = dashboardUsers.filter(u => u.id !== id);
          saveUsers();
          renderUsers();
        }
      });
    });

    document.querySelectorAll('.btn-change-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const username = e.currentTarget.getAttribute('data-username');
        document.getElementById('change-pwd-id').value = id;
        document.getElementById('change-pwd-username').textContent = username;
        changePwdForm.style.display = 'block';
        addUserForm.style.display = 'none';
      });
    });
  }

  if (document.getElementById('add-user-btn')) {
    document.getElementById('add-user-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      addUserForm.style.display = 'block';
      changePwdForm.style.display = 'none';
    });
    
    document.getElementById('cancel-add-user').addEventListener('click', () => {
      addUserForm.style.display = 'none';
    });
    
    document.getElementById('cancel-change-pwd').addEventListener('click', () => {
      changePwdForm.style.display = 'none';
    });

    addUserForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newUsername = document.getElementById('new-username').value;
      const newPassword = document.getElementById('new-password').value;
      const newRole = document.getElementById('new-role').value;
      const newLocation = document.getElementById('new-location').value;
      const newId = dashboardUsers.length > 0 ? Math.max(...dashboardUsers.map(u => u.id)) + 1 : 1;
      dashboardUsers.push({ id: newId, username: newUsername, password: newPassword, role: newRole, location: newLocation });
      saveUsers();
      addUserForm.reset();
      addUserForm.style.display = 'none';
      renderUsers();
    });

    changePwdForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idToUpdate = parseInt(document.getElementById('change-pwd-id').value);
      const newPwd = document.getElementById('change-pwd-input').value;
      const user = dashboardUsers.find(u => u.id === idToUpdate);
      if (user) {
        user.password = newPwd;
        saveUsers();
        renderUsers();
      }
      alert('Password updated successfully for ' + document.getElementById('change-pwd-username').textContent);
      changePwdForm.reset();
      changePwdForm.style.display = 'none';
    });
    
    renderUsers();
  }

  // Reset form functions
  function resetForms() {
    if(addUserForm) addUserForm.reset();
    if(changePwdForm) changePwdForm.reset();
  }

  // --- Settings Tab Logic ---
  const settingsTabs = document.querySelectorAll('.settings-tab');
  const settingsPanels = document.querySelectorAll('.settings-panel');

  settingsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      settingsTabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');

      // Hide all panels
      settingsPanels.forEach(panel => panel.style.display = 'none');

      // Show target panel
      const targetId = tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.style.display = 'block';
      }
    });
  });

  // Settings Accordion Logic
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const content = document.getElementById(targetId);
      const icon = header.querySelector('i');
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        header.classList.add('active');
        if (icon) {
          icon.setAttribute('data-lucide', 'chevron-up');
          lucide.createIcons({ icons: { 'chevron-up': true }, nameAttr: 'data-lucide' });
        }
      } else {
        content.style.display = 'none';
        header.classList.remove('active');
        if (icon) {
          icon.setAttribute('data-lucide', 'chevron-down');
          lucide.createIcons({ icons: { 'chevron-down': true }, nameAttr: 'data-lucide' });
        }
      }
      // Re-initialize lucide icons for the changed ones
      lucide.createIcons();
    });
  });

  // Theme Selection Logic
  const themeCards = document.querySelectorAll('.theme-card');
  const applyTheme = (themeName) => {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('tata-oms-theme', themeName);
    
    // Update UI selection
    themeCards.forEach(card => {
      if(card.getAttribute('data-theme') === themeName) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  };

  // Load saved theme on boot
  const savedTheme = localStorage.getItem('tata-oms-theme') || 'light';
  applyTheme(savedTheme);

  // Click handlers
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      applyTheme(card.getAttribute('data-theme'));
    });
  });

  // --- Inventory Health Page Logic ---
  window.hCurrentPage = 1;
  window.hItemsPerPage = 50;
  window.hCurrentFilter = 'all';
  window.hSearchQuery = '';
  window.hLocationFilter = 'ALL';
  window.hBrandFilter = 'ALL';

  window.renderHealthTable = function() {
    const tbody = document.getElementById('health-table-body');
    if (!tbody) return;
    
    let displayParts;
    if (window.hSearchQuery) {
      const q = window.hSearchQuery.toLowerCase();
      const source = window.filteredProcessedParts || [...filteredProcessedParts];
      displayParts = source.filter(p =>
        (p.partId && p.partId.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q))
      );
    } else {
      displayParts = window.tableFilterData['health-table-body'] || [...filteredProcessedParts];
    }
    
    // 2. Health Filter
    if (window.hCurrentFilter === 'critical') {
      displayParts = displayParts.filter(p => p.currentStock === 0);
    } else if (window.hCurrentFilter === 'low') {
      displayParts = displayParts.filter(p => p.currentStock > 0 && p.currentStock < 5);
    } else if (window.hCurrentFilter === 'healthy') {
      displayParts = displayParts.filter(p => p.currentStock >= 5);
    }

    const totalItems = displayParts.length;
    
    // Update KPI metrics and Ageing Buckets for current display parts
    const kpiTotal = document.getElementById('invh-kpi-total');
    const kpiValue = document.getElementById('invh-kpi-value');
    const kpiOnhand = document.getElementById('invh-kpi-onhand');
    const kpiOnhandVal = document.getElementById('invh-kpi-onhand-val');
    const kpiTransit = document.getElementById('invh-kpi-transit');
    const kpiTransitVal = document.getElementById('invh-kpi-transit-val');
    const kpiReserved = document.getElementById('invh-kpi-reserved');
    const kpiReservedVal = document.getElementById('invh-kpi-reserved-val');
    const kpiOos = document.getElementById('invh-kpi-oos');
    const kpiLow = document.getElementById('invh-kpi-low');
    const kpiLube = document.getElementById('invh-kpi-lube');
    const kpiLubeVal = document.getElementById('invh-kpi-lube-val');
    
    let stats = { onhandQty: 0, onhandVal: 0, transitQty: 0, transitVal: 0, resQty: 0, resVal: 0, oos: 0, low: 0, lubeQty: 0, lubeVal: 0 };
    displayParts.forEach(p => {
       stats.onhandQty += p.currentStock || 0;
       stats.onhandVal += p.stockValue || 0;
       stats.transitQty += p.inTransit || 0;
       stats.transitVal += (p.inTransit || 0) * (p.ndpPrice || 0);
       stats.resQty += p.reserved || 0;
       stats.resVal += (p.reserved || 0) * (p.ndpPrice || 0);
       if (p.currentStock === 0) stats.oos++;
       else if (p.currentStock < p.min) stats.low++;
        if (window.isLubePart(p.productCategory, p.description || p.part_desc)) {
          const lubeQtyLtr = (p.currentStock || 0) / 1000;
          stats.lubeQty += lubeQtyLtr;
          stats.lubeVal += lubeQtyLtr * (p.ndpPrice || 0);
        }
    });

    if (kpiTotal) kpiTotal.textContent = totalItems.toLocaleString('en-IN');
    if (kpiValue) kpiValue.textContent = '₹' + stats.onhandVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    if (kpiOnhand) kpiOnhand.textContent = stats.onhandQty.toLocaleString('en-IN');
    if (kpiOnhandVal) kpiOnhandVal.textContent = '₹' + stats.onhandVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    
    if (kpiTransit) kpiTransit.textContent = stats.transitQty.toLocaleString('en-IN');
    if (kpiTransitVal) kpiTransitVal.textContent = '₹' + stats.transitVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    
    if (kpiReserved) kpiReserved.textContent = stats.resQty.toLocaleString('en-IN');
    if (kpiReservedVal) kpiReservedVal.textContent = '₹' + stats.resVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    
    if (kpiOos) kpiOos.textContent = stats.oos.toLocaleString('en-IN');
    if (kpiLow) kpiLow.textContent = stats.low.toLocaleString('en-IN');
    
    if (kpiLube) kpiLube.textContent = stats.lubeQty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
    if (kpiLubeVal) kpiLubeVal.textContent = '₹' + stats.lubeVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });

    let age0_30 = { qty: 0, val: 0 };
    let age31_60 = { qty: 0, val: 0 };
    let age61_90 = { qty: 0, val: 0 };
    let age91_180 = { qty: 0, val: 0 };
    let age180_plus = { qty: 0, val: 0 };

    displayParts.forEach(p => {
      if (p.ageingDays >= 0) {
        if (p.ageingDays <= 30) {
           age0_30.qty++; age0_30.val += p.stockValue;
        } else if (p.ageingDays <= 60) {
           age31_60.qty++; age31_60.val += p.stockValue;
        } else if (p.ageingDays <= 90) {
           age61_90.qty++; age61_90.val += p.stockValue;
        } else if (p.ageingDays <= 180) {
           age91_180.qty++; age91_180.val += p.stockValue;
        } else {
           age180_plus.qty++; age180_plus.val += p.stockValue;
        }
      }
    });

    const setAgeDOM = (idPrefix, bucket) => {
      const qtyEl = document.getElementById(idPrefix);
      const valEl = document.getElementById(idPrefix.replace('aging-', 'aging-val-'));
      if (qtyEl) qtyEl.textContent = bucket.qty;
      if (valEl) valEl.textContent = '₹' + bucket.val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };
    
    setAgeDOM('aging-0-30', age0_30);
    setAgeDOM('aging-31-60', age31_60);
    setAgeDOM('aging-61-90', age61_90);
    setAgeDOM('aging-91-180', age91_180);
    setAgeDOM('aging-180-plus', age180_plus);
    const totalPages = Math.ceil(totalItems / window.hItemsPerPage) || 1;
    if (window.hCurrentPage > totalPages) window.hCurrentPage = totalPages;
    
    const startIndex = (window.hCurrentPage - 1) * window.hItemsPerPage;
    const endIndex = Math.min(startIndex + window.hItemsPerPage, totalItems);
    const paginatedParts = displayParts.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    
    if (paginatedParts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: var(--text-secondary);">No parts found matching criteria.</td></tr>';
    } else {
      paginatedParts.forEach(part => {
        // Determine health badge
        let badgeClass = 'healthy';
        let badgeText = 'Healthy';
        if (part.currentStock === 0) {
          badgeClass = 'critical';
          badgeText = 'Out of Stock';
        } else if (part.currentStock < part.min) {
          badgeClass = 'low';
          badgeText = 'Low Stock';
        }
        
        let ageingText = part.ageingDays >= 0 ? `${part.ageingDays} Days` : 'N/A';
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 8px 12px; font-weight: 500;">${part.partId}</td>
          <td style="padding: 8px 12px; color: var(--text-secondary);">${part.model}</td>
          <td style="padding: 8px 12px;">${part.location}</td>
          <td style="padding: 8px 12px;">${part.productCategory || 'TATA'}</td>
          <td style="padding: 8px 12px; text-align: right; color: #10b981; font-weight: 500;">₹${(part.ndpPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${part.currentStock}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #3b82f6;">₹${(part.stockValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px 12px; text-align: right; color: var(--text-secondary);">${ageingText}</td>
          <td style="padding: 8px 12px; text-align: center;"><span class="h-badge ${badgeClass}">${badgeText}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
    
    // Update Pagination UI
    const startEl = document.getElementById('h-page-start');
    const endEl = document.getElementById('h-page-end');
    const totalEl = document.getElementById('h-total-parts');
    const prevBtn = document.getElementById('h-prev-page-btn');
    const nextBtn = document.getElementById('h-next-page-btn');
    const pageNumContainer = document.getElementById('h-page-numbers');
    
    if(startEl) startEl.textContent = totalItems === 0 ? 0 : startIndex + 1;
    if(endEl) endEl.textContent = endIndex;
    if(totalEl) totalEl.textContent = totalItems;
    
    if(prevBtn) prevBtn.disabled = window.hCurrentPage === 1;
    if(nextBtn) nextBtn.disabled = window.hCurrentPage === totalPages;
    if(pageNumContainer) pageNumContainer.innerHTML = `<span style="font-size: 0.85rem; font-weight: 500;">Page ${window.hCurrentPage} of ${totalPages}</span>`;
  };

  // Inventory Health Event Listeners
  const hSearchInput = document.getElementById('health-search-input');
  if (hSearchInput) {
    hSearchInput.addEventListener('input', (e) => {
      window.hSearchQuery = e.target.value;
      window.hCurrentPage = 1;
      renderHealthTable();
    });
    hSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        window.hSearchQuery = e.target.value;
        window.hCurrentPage = 1;
        renderHealthTable();
      }
    });
  }
  const hSearchBtn = document.getElementById('health-search-btn');
  if (hSearchBtn) {
    hSearchBtn.addEventListener('click', () => {
      window.hSearchQuery = hSearchInput ? hSearchInput.value : '';
      window.hCurrentPage = 1;
      renderHealthTable();
    });
  }

  const globalSearchInput = document.getElementById('global-search-input');
  const globalSearchBtn = document.getElementById('global-search-btn');
  if (globalSearchInput && globalSearchBtn) {
    const doGlobalSearch = () => {
      const q = globalSearchInput.value.trim().toLowerCase();
      window.hSearchQuery = globalSearchInput.value;
      window.hCurrentPage = 1;
      const dateRange = getDateRangeFilter();
      let parts = window.originalProcessedParts || [];
      if (dateRange) {
        parts = filterByDateRange(parts.map(p => ({ ...p, last_receipt: p.last_receipt || '' })), 'last_receipt', dateRange);
      }
      let filtered;
      if (!q) {
        filtered = parts;
      } else {
        if (!window._searchIndex || window._searchIndexParts !== parts) {
          window._searchIndex = parts.map(p => ({
            p,
            id: (p.partId || '').toLowerCase(),
            model: (p.model || '').toLowerCase()
          }));
          window._searchIndexParts = parts;
        }
        filtered = window._searchIndex.filter(e =>
          e.id.includes(q) || e.model.includes(q)
        ).map(e => e.p);
      }
      window.filteredProcessedParts = filtered;
      window._searchIndex = null;
      window._searchIndexParts = null;
      renderHealthTable();
      const kpiTotal = document.getElementById('invh-kpi-total');
      const kpiValue = document.getElementById('invh-kpi-value');
      const kpiOnhand = document.getElementById('invh-kpi-onhand');
      const kpiOnhandVal = document.getElementById('invh-kpi-onhand-val');
      const kpiTransit = document.getElementById('invh-kpi-transit');
      const kpiTransitVal = document.getElementById('invh-kpi-transit-val');
      const kpiReserved = document.getElementById('invh-kpi-reserved');
      const kpiReservedVal = document.getElementById('invh-kpi-reserved-val');
      const kpiOos = document.getElementById('invh-kpi-oos');
      const kpiLow = document.getElementById('invh-kpi-low');
      const kpiLube = document.getElementById('invh-kpi-lube');
      const kpiLubeVal = document.getElementById('invh-kpi-lube-val');
      let onhandQty = 0, onhandVal = 0, transitQty = 0, transitVal = 0, resQty = 0, resVal = 0, oos = 0, low = 0, lubeQty = 0, lubeVal = 0;
      filtered.forEach(p => {
        const avail = (p.currentStock || 0) - (p.reserved || 0);
        if (p.currentStock > 0) { onhandQty += p.currentStock; onhandVal += p.stockValue || 0; }
        if (p.inTransit > 0) { transitQty += p.inTransit; transitVal += (p.inTransit * (p.ndpPrice || 0)); }
        if (p.reserved > 0) { resQty += p.reserved; resVal += (p.reserved * (p.ndpPrice || 0)); }
        if (p.currentStock === 0) oos++;
        else if (p.currentStock < (p.min || 5)) low++;
        if (window.isLubePart(p.productCategory, p.description || p.part_desc)) {
          lubeQty += p.currentStock || 0;
          lubeVal += p.stockValue || 0;
        }
      });
      if (kpiTotal) kpiTotal.textContent = filtered.length.toLocaleString('en-IN');
      if (kpiValue) kpiValue.textContent = '₹' + onhandVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      if (kpiOnhand) kpiOnhand.textContent = onhandQty.toLocaleString('en-IN');
      if (kpiOnhandVal) kpiOnhandVal.textContent = '₹' + onhandVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      if (kpiTransit) kpiTransit.textContent = transitQty.toLocaleString('en-IN');
      if (kpiTransitVal) kpiTransitVal.textContent = '₹' + transitVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      if (kpiReserved) kpiReserved.textContent = resQty.toLocaleString('en-IN');
      if (kpiReservedVal) kpiReservedVal.textContent = '₹' + resVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      if (kpiOos) kpiOos.textContent = oos.toLocaleString('en-IN');
      if (kpiLow) kpiLow.textContent = low.toLocaleString('en-IN');
      if (kpiLube) kpiLube.textContent = (lubeQty / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
      if (kpiLubeVal) kpiLubeVal.textContent = '₹' + lubeVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };
    globalSearchBtn.addEventListener('click', doGlobalSearch);
    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doGlobalSearch();
    });
    const globalSearchCancel = document.getElementById('global-search-cancel');
    if (globalSearchCancel) {
      globalSearchCancel.addEventListener('click', () => {
        globalSearchInput.value = '';
        window.hSearchQuery = '';
        window.filteredProcessedParts = window.originalProcessedParts || [];
        window._searchIndex = null;
        window._searchIndexParts = null;
        window.hCurrentPage = 1;
        renderHealthTable();
        const parts = window.originalProcessedParts || [];
        const kpiTotal = document.getElementById('invh-kpi-total');
        const kpiValue = document.getElementById('invh-kpi-value');
        const kpiOnhand = document.getElementById('invh-kpi-onhand');
        const kpiOnhandVal = document.getElementById('invh-kpi-onhand-val');
        const kpiTransit = document.getElementById('invh-kpi-transit');
        const kpiTransitVal = document.getElementById('invh-kpi-transit-val');
        const kpiReserved = document.getElementById('invh-kpi-reserved');
        const kpiReservedVal = document.getElementById('invh-kpi-reserved-val');
        const kpiOos = document.getElementById('invh-kpi-oos');
        const kpiLow = document.getElementById('invh-kpi-low');
        const kpiLube = document.getElementById('invh-kpi-lube');
        const kpiLubeVal = document.getElementById('invh-kpi-lube-val');
        let onhandQty = 0, onhandVal = 0, transitQty = 0, transitVal = 0, resQty = 0, resVal = 0, oos = 0, low = 0, lubeQty = 0, lubeVal = 0;
        parts.forEach(p => {
          if (p.currentStock > 0) { onhandQty += p.currentStock; onhandVal += p.stockValue || 0; }
          if (p.inTransit > 0) { transitQty += p.inTransit; transitVal += (p.inTransit * (p.ndpPrice || 0)); }
          if (p.reserved > 0) { resQty += p.reserved; resVal += (p.reserved * (p.ndpPrice || 0)); }
          if (p.currentStock === 0) oos++;
          else if (p.currentStock < (p.min || 5)) low++;
          if (window.isLubePart(p.productCategory, p.description || p.part_desc)) {
            lubeQty += p.currentStock || 0;
            lubeVal += p.stockValue || 0;
          }
        });
        if (kpiTotal) kpiTotal.textContent = parts.length.toLocaleString('en-IN');
        if (kpiValue) kpiValue.textContent = '₹' + onhandVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        if (kpiOnhand) kpiOnhand.textContent = onhandQty.toLocaleString('en-IN');
        if (kpiOnhandVal) kpiOnhandVal.textContent = '₹' + onhandVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        if (kpiTransit) kpiTransit.textContent = transitQty.toLocaleString('en-IN');
        if (kpiTransitVal) kpiTransitVal.textContent = '₹' + transitVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        if (kpiReserved) kpiReserved.textContent = resQty.toLocaleString('en-IN');
        if (kpiReservedVal) kpiReservedVal.textContent = '₹' + resVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        if (kpiOos) kpiOos.textContent = oos.toLocaleString('en-IN');
        if (kpiLow) kpiLow.textContent = low.toLocaleString('en-IN');
        if (kpiLube) kpiLube.textContent = (lubeQty / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
        if (kpiLubeVal) kpiLubeVal.textContent = '₹' + lubeVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      });
    }
  }

  const cardBtns = document.querySelectorAll('#view-inventory .widget-card.clickable');
  const hFilterBtns = document.querySelectorAll('.health-filter-btn');
  hFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      hFilterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      window.hCurrentFilter = e.target.getAttribute('data-filter');
      window.hCurrentPage = 1;
      cardBtns.forEach(c => c.classList.remove('active'));
      renderHealthTable();
    });
  });

  // KPI cards act as filters too: clicking a card filters/sorts the table beneath
  cardBtns.forEach(card => {
    card.addEventListener('click', () => {
      cardBtns.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      window.hCurrentFilter = card.getAttribute('data-hfilter');
      window.hCurrentPage = 1;
      const filterName = window.hCurrentFilter === 'value' ? 'all' : window.hCurrentFilter;
      hFilterBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-filter') === filterName);
      });
      renderHealthTable();
    });
  });

  const hPrevBtn = document.getElementById('h-prev-page-btn');
  const hNextBtn = document.getElementById('h-next-page-btn');
  if (hPrevBtn) {
    hPrevBtn.addEventListener('click', () => {
      if (window.hCurrentPage > 1) {
        window.hCurrentPage--;
        renderHealthTable();
      }
    });
  }
  if (hNextBtn) {
    hNextBtn.addEventListener('click', () => {
      window.hCurrentPage++;
      renderHealthTable();
    });
  }

  // --- Demand & Forecast Page Logic ---
  window.dCurrentPage = 1;
  window.dItemsPerPage = 50;
  window.dCurrentFilter = 'all';
  window.dSearchQuery = '';

  window.renderDemandTable = function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    setTimeout(() => {
      try {
        _renderDemandTable_internal();
      } finally {
        if (overlay) overlay.style.display = 'none';
      }
    }, 50);
  };
  const _renderDemandTable_internal = function() {
    const tbody = document.getElementById('demand-table-body');
    if (!tbody) return;
    
    let displayParts = window.tableFilterData['demand-table-body'] || [...filteredProcessedParts];
    
    // Process "needs reorder" status
    displayParts.forEach(p => {
      p.needsReorder = p.orderQty > 0;
    });

    // 1. Search Query Filter
    if (window.dSearchQuery) {
      const q = window.dSearchQuery.toLowerCase();
      displayParts = displayParts.filter(p => 
        (p.partId && p.partId.toLowerCase().includes(q)) || 
        (p.model && p.model.toLowerCase().includes(q))
      );
    }
    
    // 2. Toolbar Filter
    if (window.dCurrentFilter === 'reorder') {
      displayParts = displayParts.filter(p => p.needsReorder);
    } else if (window.dCurrentFilter === 'high-demand') {
      displayParts = displayParts.filter(p => p.demand > 5);
    }

    // Update Demand KPIs based on current dataset (ignoring pagination)
    const kpiTotal = document.getElementById('demand-kpi-total');
    const kpiCons = document.getElementById('demand-kpi-consumption');
    const kpiReorder = document.getElementById('demand-kpi-reorder');
    
    if (kpiTotal) kpiTotal.textContent = displayParts.reduce((sum, p) => sum + (p.demand || 0), 0).toLocaleString();
    if (kpiCons) kpiCons.textContent = displayParts.reduce((sum, p) => sum + (p.consumption30d || 0), 0).toLocaleString();
    if (kpiReorder) kpiReorder.textContent = displayParts.filter(p => p.needsReorder).length.toLocaleString();

    // Pagination Calculation
    const totalItems = displayParts.length;
    const totalPages = Math.ceil(totalItems / window.dItemsPerPage) || 1;
    if (window.dCurrentPage > totalPages) window.dCurrentPage = totalPages;
    
    const startIndex = (window.dCurrentPage - 1) * window.dItemsPerPage;
    const endIndex = Math.min(startIndex + window.dItemsPerPage, totalItems);
    const paginatedParts = displayParts.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    
    if (paginatedParts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: var(--text-secondary);">No parts found matching criteria.</td></tr>';
    } else {
      paginatedParts.forEach(part => {
        let actionBadgeClass = part.needsReorder ? 'critical' : 'healthy';
        let actionBadgeText = part.needsReorder ? 'Reorder' : 'Sufficient';
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 8px 12px; font-weight: 500;">${part.partId}</td>
          <td style="padding: 8px 12px; color: var(--text-secondary);">${part.model}</td>
          <td style="padding: 8px 12px;">${part.location || 'Narwal'}</td>
          <td style="padding: 8px 12px; text-align: center;">${part.currentStock || 0}</td>
          <td style="padding: 8px 12px; text-align: center; color: var(--purple); font-weight: 500;">${part.inTransit || 0}</td>
          <td style="padding: 8px 12px; text-align: center;">${Math.round((part.consumption6m || 0) / 6)}/mo</td>
          <td style="padding: 8px 12px; text-align: center; color: var(--text-secondary);">${part.safetyStock || 0}</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: ${part.demand > 0 ? 'var(--orange)' : 'inherit'};">${part.demand || 0}</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: ${part.orderQty > 0 ? 'var(--red)' : 'var(--text-primary)'};">${part.orderQty || 0}</td>
          <td style="padding: 8px 12px; text-align: center;"><span class="h-badge ${actionBadgeClass}">${actionBadgeText}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
    
    // Update Pagination UI
    const startEl = document.getElementById('d-page-start');
    const endEl = document.getElementById('d-page-end');
    const totalEl = document.getElementById('d-total-parts');
    const prevBtn = document.getElementById('d-prev-page-btn');
    const nextBtn = document.getElementById('d-next-page-btn');
    const pageNumContainer = document.getElementById('d-page-numbers');
    
    if(startEl) startEl.textContent = totalItems === 0 ? 0 : startIndex + 1;
    if(endEl) endEl.textContent = endIndex;
    if(totalEl) totalEl.textContent = totalItems;
    
    if(prevBtn) prevBtn.disabled = window.dCurrentPage === 1;
    if(nextBtn) nextBtn.disabled = window.dCurrentPage === totalPages;
    if(pageNumContainer) pageNumContainer.innerHTML = `<span style="font-size: 0.85rem; font-weight: 500;">Page ${window.dCurrentPage} of ${totalPages}</span>`;
  };

  // --- Consumption Table Logic ---
  window.cCurrentPage = 1;
  window.cSearchQuery = '';

  window.consTrendChartInstance = null;
  window.consCategoryChartInstance = null;
  window.consBillingTypeChartInstance = null;

  const renderConsumptionAnalytics = () => {
    // Rely on global Chart and global ChartDataLabels from CDN
    if (typeof Chart !== 'undefined' && typeof window.ChartDataLabels !== 'undefined') {
      Chart.register(window.ChartDataLabels);
      Chart.defaults.set('plugins.datalabels', { display: false });
    }
    
    let cons = (window.rawInventoryData && window.rawInventoryData.consumption) || [];
    const locationSelect = document.getElementById('location-select');
    const selectedLoc = locationSelect ? locationSelect.value : 'ALL';
    
    if (selectedLoc !== 'ALL') {
      const sLoc = (selectedLoc || '').toUpperCase().replace(/\s+/g, '');
      const mapLocation = (d) => {
        if (!d) return 'Narwal';
        d = d.toLowerCase();
        if (d.includes('channirama') || d.includes('chhanirama')) return 'Channi Rama';
        if (d.includes('smamsamba') || d.includes('supwal')) return 'Supwal';
        if (d.includes('smamkathua') || d.includes('kathua')) return 'Kathua';
        if (d.includes('lambheri')) return 'Lambheri';
        if (d.includes('poonch')) return 'Poonch';
        return 'Narwal';
      };
      cons = cons.filter(r => mapLocation(r.division || r.dealer).toUpperCase().replace(/\s+/g, '') === sLoc);
    }
    
    if (cons.length === 0) {
      // Clear charts if no data
      ['consMonthlyChart', 'consTrendChart', 'consBillingTypeChart'].forEach(id => {
         const ctx = document.getElementById(id);
         if (ctx) {
           const ins = window[id + 'Instance'];
           if (ins) ins.destroy();
         }
      });
      const tvEl = document.getElementById('cons-kpi-value');
      const upEl = document.getElementById('cons-kpi-unique');
      const lqEl = document.getElementById('cons-kpi-total');
      if (tvEl) tvEl.textContent = '₹0';
      if (upEl) upEl.textContent = '0';
      if (lqEl) lqEl.textContent = '0';
      return;
    }

    // Aggregate by part_no to build top parts by value and unique count
    const partAgg = {};
    const locValues = {};
    const catQty = {};
    const dayQty = {};
    const billingTypeAggLocal = {};
    let totalValue = 0;

    cons.forEach(r => {
      const pn = r.part_no || r.part_number || 'Unknown';
      const qty = Number(r.sold_qty) || 0;
      const val = Number(r.value) || 0;
      totalValue += val;

      if (!partAgg[pn]) partAgg[pn] = { partId: pn, qty: 0, value: 0, desc: r.description || '' };
      partAgg[pn].qty += qty;
      partAgg[pn].value += val;

      const cat = (r.product_category || 'Uncategorized').trim() || 'Uncategorized';
      catQty[cat] = (catQty[cat] || 0) + qty;

      const btype = (r.billing_type || 'Unknown').trim() || 'Unknown';
      if (!window.billingTypeAgg) window.billingTypeAgg = {};
      
      // We must scope this to the current dataset since it recalculates
      billingTypeAggLocal[btype] = (billingTypeAggLocal[btype] || 0) + val;

      let day = '';
      if (r.date) {
        const d = window.parseTataDate(r.date);
        if (d && !isNaN(d.getTime())) {
          day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
      }
      if (day) dayQty[day] = (dayQty[day] || 0) + val;
    });

    const uniqueParts = Object.keys(partAgg).length;
    const kpiVal = document.getElementById('cons-kpi-value');
    const kpiUnique = document.getElementById('cons-kpi-unique');
    if (kpiVal) kpiVal.textContent = '₹' + Math.round(totalValue).toLocaleString('en-IN');
    if (kpiUnique) kpiUnique.textContent = uniqueParts.toLocaleString('en-IN');

    // Monthly breakdown (Month/Year wise Sales Value)
    const monthAgg = {};
    cons.forEach(r => {
      const val = Number(r.value) || 0;
      let dStr = r.date || r.fetched_at || '';
      if (!dStr) return;
      const d = window.parseTataDate(dStr);
      if (d && !isNaN(d.getTime())) {
        const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' }); // "Jan 2026"
        monthAgg[key] = (monthAgg[key] || 0) + val;
      }
    });

    const monthlyCanvas = document.getElementById('consMonthlyChart');
    if (monthlyCanvas) {
      if (window.consMonthlyChartInstance) window.consMonthlyChartInstance.destroy();
      try {
        const mKeys = Object.keys(monthAgg).sort((a, b) => new Date(a) - new Date(b));
        const mData = mKeys.map(k => Number(monthAgg[k]) || 0);
        
        window.consMonthlyChartInstance = new Chart(monthlyCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: mKeys,
          datasets: [{
            label: 'Sales Value (₹)',
            data: mData,
            backgroundColor: mKeys.map(k => k === window.consSelectedMonth ? '#f59e0b' : '#3b82f6'),
            hoverBackgroundColor: '#2563eb',
            borderRadius: 4,
            borderWidth: 0,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => '\u20B9' + Number(c.parsed.y).toLocaleString('en-IN', { maximumFractionDigits: 0 }) } },
            datalabels: { display: true, color: '#2563eb', align: 'end', anchor: 'end', font: { weight: 'bold' }, formatter: (v) => '\u20B9' + (Number(v) || 0).toLocaleString('en-IN', { notation: 'compact' }) }
          },
          layout: { padding: { top: 20 } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (v) => '\u20B9' + (Number(v) || 0).toLocaleString('en-IN', { notation: 'compact' }) } }
          },
          onClick: (e, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const selectedMonth = mKeys[index];
              if (window.consSelectedMonth === selectedMonth) {
                window.consSelectedMonth = null; // Toggle off
              } else {
                window.consSelectedMonth = selectedMonth; // Toggle on
              }
              if (typeof window.renderConsumptionTable === 'function') window.renderConsumptionTable();
            }
          }
        }
      });
      } catch (err) {
        monthlyCanvas.parentElement.innerHTML = `<div style="color:red; padding:10px; font-size:12px; overflow:auto;">Monthly Error: ${err.message}</div>`;
      }
    }

    // Daily trend (Current Month)
        const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonthPrefix = currentYear + '-' + String(currentMonthNum).padStart(2, '0');
    
    if (window.consTrendCurrentMonth === undefined) window.consTrendCurrentMonth = true;
    const isCurrentMonthOnly = window.consTrendCurrentMonth === true;
    
    let trendLabels = [];
    let trendData = [];
    
    if (isCurrentMonthOnly) {
      const today = now.getDate();
      for (let i = 1; i <= today; i++) {
        const dStr = currentMonthPrefix + '-' + String(i).padStart(2, '0');
        trendLabels.push(dStr);
        trendData.push(Number(dayQty[dStr]) || 0);
      }
    } else {
      trendLabels = Object.keys(dayQty).sort();
      trendData = trendLabels.map(d => Number(dayQty[d]) || 0);
    }

    const currentMonthBtn = document.getElementById('current-month-btn');
    if (currentMonthBtn) {
      const updateBtnStyle = () => {
        const active = window.consTrendCurrentMonth === true;
        currentMonthBtn.style.background = active ? '#3b82f6' : 'rgba(59,130,246,0.1)';
        currentMonthBtn.style.color = active ? 'white' : 'var(--text-secondary)';
      };
      currentMonthBtn.onclick = () => {
        window.consTrendCurrentMonth = !window.consTrendCurrentMonth;
        updateBtnStyle();
        if (typeof window.renderConsumptionAnalytics === 'function') window.renderConsumptionAnalytics();
      };
      updateBtnStyle();
    }

    // Top 5 consumed parts by value
    const tpKeys = Object.keys(partAgg).sort((a,b) => partAgg[b].value - partAgg[a].value).slice(0,5);
    const tpData = tpKeys.map(k => Number(partAgg[k].value) || 0);

    const trendCtx = document.getElementById('consTrendChart');
    if (trendCtx && window.consTrendChartInstance) window.consTrendChartInstance.destroy();
    if (trendCtx) {
      window.consTrendChartInstance = new Chart(trendCtx.getContext('2d'), {
        type: 'line',
        data: {
          labels: trendLabels,
          datasets: [{
            label: 'Consumption Value',
            data: trendData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: 'transparent',
            pointBorderColor: 'transparent',
            pointHoverRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { 
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => '\u20B9' + Number(c.parsed.y).toLocaleString('en-IN', { maximumFractionDigits: 0 }) } },
            datalabels: { display: true, color: '#3b82f6', align: 'top', anchor: 'end', font: { weight: 'bold', size: 9 }, formatter: (v) => '\u20B9' + (Number(v) || 0).toLocaleString('en-IN', { notation: 'compact' }) }
          },
          layout: { padding: { top: 20 } },
          scales: {
            x: { 
              ticks: { font: { size: 9, weight: 'bold' }, color: '#000000', autoSkip: false, maxRotation: 45, minRotation: 45 }, 
              grid: { display: false } 
            },
            y: { beginAtZero: true, ticks: { font: { size: 10, weight: 'bold' }, color: '#000000', callback: (v) => '\u20B9' + (Number(v) || 0).toLocaleString('en-IN', { notation: 'compact' }) } }
          }
        }
      });
    }



    // Billing Type Breakdown
    const btypeCanvas = document.getElementById('consBillingTypeChart');
    if (btypeCanvas && typeof billingTypeAggLocal !== 'undefined') {
      if (window.consBillingTypeChartInstance) window.consBillingTypeChartInstance.destroy();
      try {
        const bKeys = Object.keys(billingTypeAggLocal).sort((a,b) => billingTypeAggLocal[b] - billingTypeAggLocal[a]).slice(0, 5);
        const bData = bKeys.map(k => Number(billingTypeAggLocal[k]) || 0);
      window.consBillingTypeChartInstance = new Chart(btypeCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: bKeys,
          datasets: [{
            data: bData,
            backgroundColor: ['#14b8a6', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          animation: false,
          responsive: true, maintainAspectRatio: false, cutout: '45%', layout: { padding: 0 },
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
            tooltip: { callbacks: { label: (c) => '\u20B9' + Number(c.parsed).toLocaleString('en-IN', { maximumFractionDigits: 0 }) } },
            datalabels: { display: 'auto', color: '#fff', font: { weight: 'bold', size: 10 }, formatter: (v) => '\u20B9' + (Number(v) || 0).toLocaleString('en-IN', { notation: 'compact' }) }
          }
        }
      });
      } catch (err) {
        btypeCanvas.parentElement.innerHTML = `<div style="color:red; padding:10px; font-size:12px; overflow:auto;">BillingType Error: ${err.message}</div>`;
      }
    }
  };
  window.renderConsumptionAnalytics = renderConsumptionAnalytics;

  const renderConsumptionTable = () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    setTimeout(() => {
      try {
        _renderConsumptionTable_internal();
      } finally {
        if (overlay) overlay.style.display = 'none';
      }
    }, 50);
  };
  const _renderConsumptionTable_internal = () => {
    const tbody = document.getElementById('cons-table-body');
    if (!tbody) return;
    
    let consRecords = [];
    if (window.tableFilterData && window.tableFilterData['cons-table-body']) {
      consRecords = [...window.tableFilterData['cons-table-body']];
    } else {
      consRecords = (window.rawInventoryData && window.rawInventoryData.consumption) ? [...window.rawInventoryData.consumption] : [];
    }
    
    // Filter by selected month if active
    if (window.consSelectedMonth) {
      consRecords = consRecords.filter(r => {
        const dStr = r.date || r.fetched_at || '';
        if (!dStr) return false;
        const d = new Date(dStr);
        if (isNaN(d)) return false;
        const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        return key === window.consSelectedMonth;
      });
    }

    if (window.cSearchQuery) {
      const q = window.cSearchQuery.toLowerCase();
      consRecords = consRecords.filter(p => 
        (p.part_no && p.part_no.toLowerCase().includes(q)) || 
        (p.part_desc && p.part_desc.toLowerCase().includes(q))
      );
    }
    
    // Sort transactions by value descending
    consRecords.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    
    const totalItems = consRecords.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (window.cCurrentPage > totalPages) window.cCurrentPage = totalPages;
    
    const startIndex = (window.cCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedRecords = consRecords.slice(startIndex, endIndex);
    
    // Velocity Trend buckets come from the shared cached map so the badge and
    // the column filter always agree.
    const velocityMap = getConsVelocityMap();

    tbody.innerHTML = '';
    
    if (paginatedRecords.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px;">No consumption data found.</td></tr>';
    } else {
      paginatedRecords.forEach((part, index) => {
        const rank = startIndex + index + 1;
        const partNo = part.part_no || 'Unknown';
        const ndp = consNdp(part);
        
        const monthYear = consMonthYear(part);
        
        const trend = consVelocityTrend(partNo);
        const trendStyles = {
          Fast: 'background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2);',
          Mid: 'background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2);',
          Slow: 'background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2);'
        };
        const trendHtml = trend === '-'
          ? '-'
          : `<span style="${trendStyles[trend]} padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase;">${trend}</span>`;
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.style.transition = 'background-color 0.2s ease';
        tr.onmouseover = () => tr.style.backgroundColor = 'var(--bg-secondary)';
        tr.onmouseout = () => tr.style.backgroundColor = 'transparent';
        
        tr.innerHTML = `
          <td style="padding: 6px 8px; font-weight: 500; text-align: center; font-size: 0.7rem;">#${rank}</td>
          <td style="padding: 6px 8px; font-weight: 600;"><span style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="calendar" style="width: 12px; height: 12px;"></i>${monthYear}</span></td>
          <td style="padding: 6px 8px; font-weight: 500; white-space: nowrap; font-size: 0.7rem;">${partNo}</td>
          <td style="padding: 6px 8px; color: var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.7rem;" title="${part.part_desc || ''}">${part.part_desc || '-'}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: var(--text-primary);"><span style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${part.sold_qty || 0}</span></td>
          <td style="padding: 6px 8px; text-align: right; color: var(--text-primary); font-weight: 600; font-size: 0.7rem;">₹${(Number(part.value)||0).toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; text-align: right; color: var(--text-secondary); font-size: 0.7rem;">₹${ndp.toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; text-align: right; color: var(--text-secondary); font-size: 0.7rem;">₹${(Number(part.tax_amount)||0).toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; text-align: center;"><span style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; white-space: nowrap;">${part.billing_type || '-'}</span></td>
          <td style="padding: 6px 8px; text-align: center;"><span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; white-space: nowrap;">${part.order_type || '-'}</span></td>
          <td style="padding: 6px 8px; text-align: center;"><span style="color: var(--text-secondary); font-size: 0.7rem; font-weight: 500;">${part.mode_of_payment || '-'}</span></td>
          <td style="padding: 6px 8px; text-align: center;">${trendHtml}</td>
        `;
        tbody.appendChild(tr);
      });
    }
    
    if(typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    
    // Enable column filtering for the consumption table
    if (typeof markFilterHeaders === 'function') markFilterHeaders(tbody);
    
    // Update KPIs using ALL records (ignoring current page, but using search/month filters)
    // Wait, the KPI should probably reflect overall data not filtered data.
    // However, if we filter by month, it's nice if KPIs update.
    // Let's use the full `consRecords` for KPI calculations.
    
    // Actually, the previous implementation used `filteredProcessedParts` for Fast/Mid/Slow.
    // That means Fast/Mid/Slow depends on aggregating total quantity per part!
    const partAgg = {};
    consRecords.forEach(r => {
      const pn = r.part_no || 'Unknown';
      if (!partAgg[pn]) partAgg[pn] = 0;
      partAgg[pn] += (Number(r.sold_qty) || 0);
    });
    
    const uniquePartsArray = Object.values(partAgg);
    const totalConsumed = uniquePartsArray.reduce((sum, qty) => sum + qty, 0);
    const fastMoving = uniquePartsArray.filter(qty => qty >= 20).length;
    const midMoving = uniquePartsArray.filter(qty => qty >= 5 && qty < 20).length;
    const slowMoving = uniquePartsArray.filter(qty => qty > 0 && qty < 5).length;
    
    const tEl = document.getElementById('cons-kpi-total');
    if (tEl) tEl.textContent = totalConsumed.toLocaleString('en-IN');
    
    const fEl = document.getElementById('cons-kpi-fast');
    if (fEl) fEl.textContent = fastMoving;
    
    const mEl = document.getElementById('cons-kpi-mid');
    if (mEl) mEl.textContent = midMoving;
    
    const sEl = document.getElementById('cons-kpi-slow');
    if (sEl) sEl.textContent = slowMoving;

    // We don't call renderConsumptionAnalytics here anymore because renderConsumptionAnalytics sets up the charts,
    // and this function is called BY the chart click. If we call it, it might re-render the chart and kill the click focus.
    // If we want the charts to update based on search, we need a separate function.
    
    // Pagination UI
    const startEl = document.getElementById('c-page-start');
    const endEl = document.getElementById('c-page-end');
    const totalEl = document.getElementById('c-total-parts');
    const prevBtn = document.getElementById('c-prev-page-btn');
    const nextBtn = document.getElementById('c-next-page-btn');
    
    if(startEl) startEl.textContent = totalItems === 0 ? 0 : startIndex + 1;
    if(endEl) endEl.textContent = endIndex;
    if(totalEl) totalEl.textContent = totalItems;
    
    if(prevBtn) prevBtn.disabled = window.cCurrentPage === 1;
    if(nextBtn) nextBtn.disabled = window.cCurrentPage === totalPages;
  };
  
  // Expose to window so loadDataAndRender can call it
  window.renderConsumptionTable = renderConsumptionTable;

  // Consumption Event Listeners
  const cSearchInput = document.getElementById('cons-search-input');
  if (cSearchInput) {
    cSearchInput.addEventListener('input', (e) => {
      window.cSearchQuery = e.target.value;
      window.cCurrentPage = 1;
      renderConsumptionTable();
    });
    cSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        window.cSearchQuery = e.target.value;
        window.cCurrentPage = 1;
        renderConsumptionTable();
      }
    });
  }
  const cSearchBtn = document.getElementById('cons-search-btn');
  if (cSearchBtn) {
    cSearchBtn.addEventListener('click', () => {
      window.cSearchQuery = cSearchInput ? cSearchInput.value : '';
      window.cCurrentPage = 1;
      renderConsumptionTable();
    });
  }

  const cPrevBtn = document.getElementById('c-prev-page-btn');
  const cNextBtn = document.getElementById('c-next-page-btn');
  if (cPrevBtn) {
    cPrevBtn.addEventListener('click', () => {
      if (window.cCurrentPage > 1) {
        window.cCurrentPage--;
        renderConsumptionTable();
      }
    });
  }
  if (cNextBtn) {
    cNextBtn.addEventListener('click', () => {
      window.cCurrentPage++;
      renderConsumptionTable();
    });
  }

  // Demand Event Listeners
  const dSearchInput = document.getElementById('demand-search-input');
  if (dSearchInput) {
    dSearchInput.addEventListener('input', (e) => {
      window.dSearchQuery = e.target.value;
      window.dCurrentPage = 1;
      renderDemandTable();
    });
  }

  const dFilterBtns = document.querySelectorAll('#demand-filters .health-filter-btn');
  dFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      dFilterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      window.dCurrentFilter = e.target.getAttribute('data-filter');
      window.dCurrentPage = 1;
      renderDemandTable();
    });
  });

  const dPrevBtn = document.getElementById('d-prev-page-btn');
  const dNextBtn = document.getElementById('d-next-page-btn');
  if (dPrevBtn) {
    dPrevBtn.addEventListener('click', () => {
      if (window.dCurrentPage > 1) {
        window.dCurrentPage--;
        renderDemandTable();
      }
    });
  }
  if (dNextBtn) {
    dNextBtn.addEventListener('click', () => {
      window.dCurrentPage++;
      renderDemandTable();
    });
  }
  // Price List Upload Logic
  const priceListForm = document.getElementById('price-list-form');
  if (priceListForm) {
    priceListForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('price-list-file');
      const statusDiv = document.getElementById('price-list-status');
      const btn = document.getElementById('upload-price-list-btn');
      
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];
      
      statusDiv.style.display = 'block';
      statusDiv.style.color = 'var(--text-color)';
      statusDiv.textContent = 'Parsing Excel file...';
      
      btn.disabled = true;
      btn.style.opacity = '0.7';
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          if (jsonData.length === 0) {
            throw new Error("No data found in the Excel file.");
          }
          
          statusDiv.textContent = `Found ${jsonData.length} rows. Uploading to Supabase... (This might take a minute)`;
          
          // Map to table headers
          const formattedData = jsonData.map(row => {
            const getVal = (possibleKeys) => {
              for (const k of Object.keys(row)) {
                for (const pk of possibleKeys) {
                  if (k.toLowerCase().trim() === pk.toLowerCase().trim()) {
                    return row[k];
                  }
                }
              }
              return null;
            };

            return {
              s_no: String(getVal(['S.No', 'S. No', 'S.No.', 'S No'])),
              part_number: String(getVal(['Part Number', 'Part No', 'Part_Number'])),
              description: String(getVal(['Description', 'Desc'])),
              uom: String(getVal(['UOM'])),
              pf_code: String(getVal(['PF Code', 'PF_Code'])),
              ndp: parseFloat(getVal(['NDP'])) || 0,
              lp: parseFloat(getVal(['LP'])) || 0,
              dealer_discount: parseFloat(getVal(['Dealer discount', 'Dealer Discount'])) || 0,
              mrp: parseFloat(getVal(['MRP'])) || 0,
              hsn_code: String(getVal(['HSN Code', 'HSN'])),
              gst_rates: String(getVal(['GST Rates', 'GST'])),
              category: String(getVal(['Category'])),
              orderability_status: String(getVal(['Orderability Status', 'Status'])),
              valid_from: String(getVal(['Valid from', 'Valid From']))
            };
          }).filter(row => row.part_number && row.part_number !== 'null' && row.part_number.trim() !== '');
          
          const uniqueDataMap = new Map();
          formattedData.forEach(row => {
            if (!uniqueDataMap.has(row.part_number)) {
              uniqueDataMap.set(row.part_number, row);
            }
          });
          const uniqueData = Array.from(uniqueDataMap.values());
          
          if (uniqueData.length === 0) {
             throw new Error("Could not map rows correctly. Ensure 'Part Number' column exists.");
          }

          // Clear existing price list
          const { error: deleteError } = await supabase.from('tata_price_list').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (deleteError) {
              throw new Error("Failed to clear old price list before upload: " + deleteError.message);
          }
          
          // Insert in batches of 1000
          const BATCH_SIZE = 1000;
          for (let i = 0; i < uniqueData.length; i += BATCH_SIZE) {
             const batch = uniqueData.slice(i, i + BATCH_SIZE);
             const { error } = await supabase.from('tata_price_list').upsert(batch, { onConflict: 'part_number' });
             if (error) throw error;
             statusDiv.textContent = `Uploaded ${Math.min(i + BATCH_SIZE, uniqueData.length)} of ${uniqueData.length} unique rows...`;
          }
          
          statusDiv.style.color = '#10b981';
          statusDiv.innerHTML = '<i data-lucide="check"></i> Price List uploaded and saved successfully!';
          btn.innerHTML = '<i data-lucide="check"></i> Done';
          btn.style.background = '#059669';
          lucide.createIcons();
          
        } catch (err) {
          console.error(err);
          statusDiv.style.color = '#ef4444';
          statusDiv.textContent = 'Error: ' + err.message;
        } finally {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  // Inventory Upload Logic
  const inventoryUploadForm = document.getElementById('inventory-upload-form');
  if (inventoryUploadForm) {
    inventoryUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const locationInput = document.getElementById('inventory-upload-location').value.trim();
      const fileInput = document.getElementById('inventory-upload-file');
      const statusDiv = document.getElementById('inventory-upload-status');
      const btn = document.getElementById('upload-inventory-btn');
      
      if (!locationInput) {
          alert('Please enter a location!');
          return;
      }
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];
      
      statusDiv.style.display = 'block';
      statusDiv.style.color = 'var(--text-color)';
      statusDiv.textContent = 'Parsing Excel file...';
      btn.disabled = true;
      btn.style.opacity = '0.7';
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          if (jsonData.length === 0) throw new Error("No data found in the Excel file.");
          
          statusDiv.textContent = `Found ${jsonData.length} rows. Uploading to Supabase...`;
          
          const formattedData = jsonData.map(row => {
            const getVal = (possibleKeys) => {
              for (const k of Object.keys(row)) {
                for (const pk of possibleKeys) {
                  if (k.toLowerCase().trim() === pk.toLowerCase().trim() || k.toLowerCase().trim().startsWith(pk.toLowerCase().trim())) {
                    return row[k];
                  }
                }
              }
              return null;
            };

            return {
                division: locationInput,
                part_no: String(getVal(['Part #', 'Part Number', 'Part'])),
                description: String(getVal(['Description', 'Descriptic', 'Descriptio'])),
                qty: parseFloat(getVal(['Qty', 'Quantity'])) || 0,
                total_price: parseFloat(getVal(['Total Price'])) || 0,
                last_issue: String(getVal(['Last Issue']) || ''),
                last_receipt: String(getVal(['Last Receipt', 'Last Recei']) || ''),
                availability: String(getVal(['Availability', 'Availabilit']) || ''),
                status: String(getVal(['Status']) || ''),
                product_category: String(getVal(['Product Category', 'Product C']) || ''),
                dealer_name: String(getVal(['Dealer Name', 'Dealer Na']) || ''),
                hsn: String(getVal(['HSN']) || ''),
                location_3: String(getVal(['Location 3']) || ''),
                location_2: String(getVal(['Location 2']) || ''),
                location_1: String(getVal(['Location 1']) || ''),
                min: parseFloat(getVal(['Min', 'Minimum'])) || 0,
                max: parseFloat(getVal(['Max', 'Maximum'])) || 0,
                inventory_indicator: String(getVal(['Inventory Indicator', 'Inventory I']) || ''),
                xyz_class: String(getVal(['XYZ Class']) || ''),
                abc_class: String(getVal(['ABC Class']) || ''),
                vendor: String(getVal(['Vendor']) || ''),
                weighted_average: String(getVal(['Weighted Average', 'Weighted ']) || ''),
                safety_stock: String(getVal(['Safety Stock', 'Safety ']) || ''),
                tm_part_indicator: String(getVal(['TM Part Indicator', 'TM Part In']) || ''),
                product_line: String(getVal(['Product Line', 'Product Li']) || '')
            };
          }).filter(row => row.part_no && row.part_no !== 'null' && row.part_no.trim() !== '');

          if (formattedData.length === 0) throw new Error("Could not map rows. Ensure 'Part #' column exists.");

          const { error: deleteError } = await supabase.from('tata_spare_inventory').delete().eq('division', locationInput);
          await supabase.from('tata_movement_logs').delete().eq('location', locationInput);

          if (deleteError) throw new Error("Failed to clear old inventory: " + deleteError.message);
          
          const BATCH_SIZE = 1000;
          for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
             const batch = formattedData.slice(i, i + BATCH_SIZE);
             const { error } = await supabase.from('tata_spare_inventory').insert(batch);
             if (error) throw error;
             statusDiv.textContent = `Uploaded ${Math.min(i + BATCH_SIZE, formattedData.length)} of ${formattedData.length} rows...`;
          }
          
          statusDiv.style.color = '#10b981';
          statusDiv.innerHTML = '<i data-lucide="check"></i> Inventory uploaded successfully!';
          btn.innerHTML = '<i data-lucide="check"></i> Done';
          btn.style.background = '#059669';
          lucide.createIcons();
          
          // Track the successful upload for the daily alert
          localStorage.setItem('lastInventoryUploadDate', new Date().toDateString());
          document.getElementById('missing-data-alert').style.display = 'none';
          
        } catch (err) {
          console.error(err);
          statusDiv.style.color = '#ef4444';
          statusDiv.textContent = 'Error: ' + err.message;
        } finally {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Consumption Upload Logic
  const consumptionUploadForm = document.getElementById('consumption-upload-form');
  if (consumptionUploadForm) {
    consumptionUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('consumption-upload-file');
      const statusDiv = document.getElementById('consumption-upload-status');
      const btn = document.getElementById('upload-consumption-btn');
      
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];
      
      statusDiv.style.display = 'block';
      statusDiv.style.color = 'var(--text-color)';
      statusDiv.textContent = 'Parsing Excel file...';
      btn.disabled = true;
      btn.style.opacity = '0.7';
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          if (jsonData.length === 0) throw new Error("No data found in the Excel file.");
          
          statusDiv.textContent = `Found ${jsonData.length} rows. Uploading to Supabase...`;
          
          const formattedData = jsonData.map(row => {
            const getVal = (possibleKeys) => {
              for (const k of Object.keys(row)) {
                for (const pk of possibleKeys) {
                  if (k.toLowerCase().trim() === pk.toLowerCase().trim() || k.toLowerCase().trim().startsWith(pk.toLowerCase().trim())) {
                    return row[k];
                  }
                }
              }
              return null;
            };

            const firstKey = Object.keys(row)[0];
            const divisionValue = String(getVal(['Division']) || row[firstKey]);

            return {
                division: divisionValue,
                invoice_no: String(getVal(['Invoice Number', 'Invoice No'])),
                invoice_status: String(getVal(['Invoice Status']) || ''),
                mode_of_payment: String(getVal(['Mode of Payment']) || ''),
                invoice_type: String(getVal(['Invoice Type']) || ''),
                part_no: String(getVal(['Part No', 'Part Number', 'Part #'])),
                part_desc: String(getVal(['Part Desc', 'Description']) || ''),
                part_type: String(getVal(['Part Type']) || ''),
                tm_part_indicator: String(getVal(['TM Part Indicator']) || ''),
                product_category: String(getVal(['Product Category']) || ''),
                date: String(getVal(['Date']) || ''),
                category: String(getVal(['Category']) || ''),
                order_num: String(getVal(['Order Number', 'Order Num']) || ''),
                order_type: String(getVal(['Order Type']) || ''),
                order_sub: String(getVal(['Order Sub-Type', 'Order Sub']) || ''),
                rate: parseFloat(getVal(['Rate'])) || 0,
                billing_type: String(getVal(['Billing Type']) || ''),
                sold_qty: parseFloat(getVal(['Sold Qty', 'Qty'])) || 0,
                value: parseFloat(getVal(['Value', 'Total'])) || 0,
                tax_amount: parseFloat(getVal(['Tax Amount', 'Tax'])) || 0,
                mode_of_payment: String(getVal(['Mode of Payment', 'Payment Mode']) || ''),
                dealer: String(getVal(['Dealer', 'Dealer Name']) || '')
            };
          }).filter(row => row.part_no && row.part_no !== 'null' && row.part_no.trim() !== '');

          if (formattedData.length === 0) throw new Error("Could not map rows. Ensure 'Part No' column exists.");

          const { error: deleteError } = await supabase.from('tata_consumption_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (deleteError) throw new Error("Failed to clear old consumption: " + deleteError.message);
          
          const BATCH_SIZE = 1000;
          for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
             const batch = formattedData.slice(i, i + BATCH_SIZE);
             const { error } = await supabase.from('tata_consumption_data').insert(batch);
             if (error) throw error;
             statusDiv.textContent = `Uploaded ${Math.min(i + BATCH_SIZE, formattedData.length)} of ${formattedData.length} rows...`;
          }
          
          statusDiv.style.color = '#10b981';
          statusDiv.innerHTML = '<i data-lucide="check"></i> Consumption uploaded successfully!';
          btn.innerHTML = '<i data-lucide="check"></i> Done';
          btn.style.background = '#059669';
          lucide.createIcons();
          
        } catch (err) {
          console.error(err);
          statusDiv.style.color = '#ef4444';
          statusDiv.textContent = 'Error: ' + err.message;
        } finally {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Settings Accordion Logic
  const settingHeaders = document.querySelectorAll('.settings-header');
  settingHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const chevron = header.querySelector('.chevron');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        if (chevron) {
          chevron.style.transform = 'rotate(180deg)';
          chevron.style.transition = 'transform 0.3s ease';
        }
      } else {
        content.style.display = 'none';
        if (chevron) {
          chevron.style.transform = 'rotate(0deg)';
          chevron.style.transition = 'transform 0.3s ease';
        }
      }
    });
  });
});

// --- PPNI Logic ---
window.pCurrentPage = 1;
window.pItemsPerPage = 50;
window.pSearchQuery = '';

window.ppniAgeingChartInstance = null;
window.ppniMonthChartInstance = null;
window.ppniCategoryChartInstance = null;

window.renderPPNI = function() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'flex';
  setTimeout(() => {
    try {
      window._renderPPNI_internal();
    } finally {
      if (overlay) overlay.style.display = 'none';
    }
  }, 50);
};

window._renderPPNI_internal = function() {
  const tbody = document.getElementById('ppni-table-body');
  if (!tbody) return;

  // Filter to parts that are actually in stock and older than 180 days (PPNI)
  const allParts = window.filteredProcessedParts || window.originalProcessedParts || [];
  let ppniParts = allParts.filter(p => p.currentStock > 0 && p.ageingDays > 180);

  // Apply column filters if any
  if (window.tableFilterData['ppni-table-body']) {
    // Intersect the column filtered data with the in-stock restriction
    const allowedIds = new Set(window.tableFilterData['ppni-table-body'].map(p => p.partId));
    ppniParts = ppniParts.filter(p => allowedIds.has(p.partId));
  }

  if (window.pSearchQuery) {
    const q = window.pSearchQuery.toLowerCase();
    ppniParts = ppniParts.filter(p => 
      (p.partId && p.partId.toLowerCase().includes(q)) || 
      (p.model && p.model.toLowerCase().includes(q))
    );
  }

  // Calculate KPIs
  let totalValue = 0;
  let maxAge = 0;
  let catSums = {};
  
  let locationSums = {};
  let yearSums = {};
  let monthSums = {}; // Format: "YYYY-MM"
  
  let bucketSums = {
    '0-30': { qty: 0, value: 0 },
    '30-60': { qty: 0, value: 0 },
    '60-90': { qty: 0, value: 0 },
    '90-180': { qty: 0, value: 0 },
    '180-365': { qty: 0, value: 0 },
    '>365': { qty: 0, value: 0 }
  };

  // Calculate bucket sums for ALL parts (not just >180)
  allParts.forEach(p => {
    if (p.currentStock > 0) {
      let val = p.stockValue || 0;
      let qty = p.currentStock || 0;
      let age = p.ageingDays || 0;
      if (age < 0) age = 0;

      if (age <= 30) {
        bucketSums['0-30'].qty += qty;
        bucketSums['0-30'].value += val;
      } else if (age <= 60) {
        bucketSums['30-60'].qty += qty;
        bucketSums['30-60'].value += val;
      } else if (age <= 90) {
        bucketSums['60-90'].qty += qty;
        bucketSums['60-90'].value += val;
      } else if (age <= 180) {
        bucketSums['90-180'].qty += qty;
        bucketSums['90-180'].value += val;
      } else if (age <= 365) {
        bucketSums['180-365'].qty += qty;
        bucketSums['180-365'].value += val;
      } else {
        bucketSums['>365'].qty += qty;
        bucketSums['>365'].value += val;
      }
    }
  });

  ppniParts.forEach(p => {
    totalValue += (p.stockValue || 0);
    if (p.ageingDays > maxAge) maxAge = p.ageingDays;
    
    let cat = p.productCategory || 'Uncategorized';
    catSums[cat] = (catSums[cat] || 0) + (p.stockValue || 0);
    
    let loc = p.location || 'Unknown';
    locationSums[loc] = (locationSums[loc] || 0) + (p.stockValue || 0);

    // Month & Year Wise
    if (p.last_receipt) {
      let d = window.parseTataDate ? window.parseTataDate(p.last_receipt) : new Date(p.last_receipt);
      if (d && !isNaN(d)) {
        let yr = d.getFullYear();
        yearSums[yr] = (yearSums[yr] || 0) + (p.stockValue || 0);
        let ym = yr + '-' + String(d.getMonth()+1).padStart(2, '0');
        monthSums[ym] = (monthSums[ym] || 0) + (p.stockValue || 0);
      }
    }
  });

  // Find top category
  let topCat = '-';
  let topCatVal = 0;
  for (const [c, val] of Object.entries(catSums)) {
    if (val > topCatVal) {
      topCatVal = val;
      topCat = c;
    }
  }

  // Render KPIs
  const elVal = document.getElementById('ppni-kpi-value');
  const elCount = document.getElementById('ppni-kpi-count');
  const elCat = document.getElementById('ppni-kpi-category');
  const elMaxAge = document.getElementById('ppni-kpi-max-age');

  if (elVal) elVal.textContent = '₹' + totalValue.toLocaleString('en-IN', {maximumFractionDigits: 0});
  if (elCount) elCount.textContent = ppniParts.length.toLocaleString('en-IN');
  if (elCat) elCat.textContent = topCat;
  if (elMaxAge) elMaxAge.textContent = maxAge + ' Days';

  // Render Charts
  renderPPNICharts(locationSums, yearSums, monthSums, bucketSums);

  // Pagination
  const totalItems = ppniParts.length;
  const totalPages = Math.ceil(totalItems / window.pItemsPerPage) || 1;
  if (window.pCurrentPage > totalPages) window.pCurrentPage = totalPages;
  const startIndex = (window.pCurrentPage - 1) * window.pItemsPerPage;
  const endIndex = Math.min(startIndex + window.pItemsPerPage, totalItems);
  const paginated = ppniParts.slice(startIndex, endIndex);

  tbody.innerHTML = '';
  if (paginated.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-secondary);">No parts found.</td></tr>';
  } else {
    paginated.forEach(part => {
      let lrText = part.last_receipt ? (window.parseTataDate(part.last_receipt) ? window.parseTataDate(part.last_receipt).toLocaleDateString('en-IN') : 'N/A') : 'N/A';
      let ageText = part.ageingDays >= 0 ? `${part.ageingDays} Days` : 'N/A';
      let badgeClass = part.ageingDays > 180 ? 'critical' : (part.ageingDays > 90 ? 'low' : 'healthy');
      
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 4px 8px; font-size: 0.85rem; font-weight: 500;">${part.partId}</td>
        <td style="padding: 4px 8px; font-size: 0.85rem; color: var(--text-secondary);">${part.model}</td>
        <td style="padding: 4px 8px; font-size: 0.85rem;">${part.location || 'Narwal'}</td>
        <td style="padding: 4px 8px; font-size: 0.85rem;">${part.productCategory || 'N/A'}</td>
        <td style="padding: 4px 8px; font-size: 0.85rem;"><span class="h-badge ${badgeClass}">${ageText}</span></td>
        <td style="padding: 4px 8px; font-size: 0.85rem;">${lrText}</td>
        <td style="padding: 4px 8px; font-size: 0.85rem; text-align: center; font-weight: bold;">${part.currentStock}</td>
        <td style="padding: 4px 8px; font-size: 0.85rem; text-align: right; color: var(--text-primary); font-weight: 500;">₹${(part.stockValue||0).toLocaleString('en-IN')}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Update Pagination UI
  const startEl = document.getElementById('p-page-start');
  const endEl = document.getElementById('p-page-end');
  const totalEl = document.getElementById('p-total-parts');
  const prevBtn = document.getElementById('p-prev-page-btn');
  const nextBtn = document.getElementById('p-next-page-btn');
  const pageNumContainer = document.getElementById('p-page-numbers');

  if(startEl) startEl.textContent = totalItems === 0 ? 0 : startIndex + 1;
  if(endEl) endEl.textContent = endIndex;
  if(totalEl) totalEl.textContent = totalItems;
  if(prevBtn) prevBtn.disabled = window.pCurrentPage === 1;
  if(nextBtn) nextBtn.disabled = window.pCurrentPage === totalPages;

  if(pageNumContainer) {
    pageNumContainer.innerHTML = '';
    const maxVisible = 5;
    let startPage = Math.max(1, window.pCurrentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.style.cssText = `padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-family: inherit; background: ${i === window.pCurrentPage ? '#3b82f6' : 'white'}; color: ${i === window.pCurrentPage ? 'white' : 'var(--text-primary)'};`;
      btn.onclick = () => {
        window.pCurrentPage = i;
        if (typeof window.renderPPNI === 'function') window.renderPPNI();
      };
      pageNumContainer.appendChild(btn);
    }
  }
};


window.ppniLocationChartInstance = null;
window.ppniYearChartInstance = null;
window.ppniMonthChartInstance = null;


window.ppniLocationChartInstance = null;
window.ppniYearChartInstance = null;
window.ppniMonthChartInstance = null;

function renderPPNICharts(locationSums, yearSums, monthSums, bucketSums) {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.set('plugins.datalabels', { display: false });

  const formatCurrency = (val) => {
    if (val >= 10000000) return '₹' + (val/10000000).toFixed(1) + 'Cr';
    if (val >= 100000) return '₹' + (val/100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val/1000).toFixed(1) + 'K';
    return '₹' + val.toLocaleString('en-IN');
  };

  const locCtx = document.getElementById('ppni-location-chart');
  if (locCtx) {
    if (window.ppniLocationChartInstance) window.ppniLocationChartInstance.destroy();
    const sortedLocs = Object.entries(locationSums).sort((a,b) => b[1] - a[1]);
    const labels = sortedLocs.map(l => l[0].length > 15 ? l[0].substring(0, 15)+'...' : l[0]);
    const data = sortedLocs.map(l => l[1]);

    window.ppniLocationChartInstance = new Chart(locCtx, {
      type: 'bar',
      data: { labels: labels, datasets: [{ label: 'Value (₹)', data: data, backgroundColor: '#3b82f6', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: true, align: 'end', anchor: 'end', formatter: formatCurrency, font: {size: 10, weight: 'bold'}, color: '#64748b', offset: -4 }, legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return '₹' + ctx.raw.toLocaleString('en-IN', {maximumFractionDigits:0}); } } } }, scales: { y: { beginAtZero: true, ticks: { callback: formatCurrency } } } }
    });
  }

  const yrCtx = document.getElementById('ppni-year-chart');
  if (yrCtx) {
    if (window.ppniYearChartInstance) window.ppniYearChartInstance.destroy();
    const sortedYrs = Object.keys(yearSums).sort();
    const data = sortedYrs.map(y => yearSums[y]);

    window.ppniYearChartInstance = new Chart(yrCtx, {
      type: 'bar',
      data: { labels: sortedYrs, datasets: [{ label: 'Value (₹)', data: data, backgroundColor: '#10b981', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: true, align: 'end', anchor: 'end', formatter: formatCurrency, font: {size: 10, weight: 'bold'}, color: '#64748b', offset: -4 }, legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return '₹' + ctx.raw.toLocaleString('en-IN', {maximumFractionDigits:0}); } } } }, scales: { y: { beginAtZero: true, ticks: { callback: formatCurrency } } } }
    });
  }

  const monthCtx = document.getElementById('ppni-month-chart');
  if (monthCtx) {
    if (window.ppniMonthChartInstance) window.ppniMonthChartInstance.destroy();
    let sortedMonths = Object.keys(monthSums).sort();
    if (sortedMonths.length > 12) sortedMonths = sortedMonths.slice(sortedMonths.length - 12);
    const mData = sortedMonths.map(m => monthSums[m]);
    const mLabels = sortedMonths.map(m => { const parts = m.split('-'); const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, 1); return d.toLocaleDateString('en-IN', {month: 'short', year: '2-digit'}); });

    window.ppniMonthChartInstance = new Chart(monthCtx, {
      type: 'line',
      data: { labels: mLabels, datasets: [{ label: 'Value (₹)', data: mData, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 2, fill: true, tension: 0.3, pointBackgroundColor: '#f59e0b' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: true, align: 'top', anchor: 'center', formatter: formatCurrency, font: {size: 10, weight: 'bold'}, color: '#64748b' }, legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return '₹' + ctx.raw.toLocaleString('en-IN', {maximumFractionDigits:0}); } } } }, scales: { y: { beginAtZero: true, ticks: { callback: formatCurrency } } } }
    });
  }

  // 4. Ageing Buckets Chart
  const ctxBucket = document.getElementById('ppni-ageing-bucket-chart');
  if (ctxBucket) {
    if (window.ppniAgeingBucketChartInstance) window.ppniAgeingBucketChartInstance.destroy();
    
    const bucketLabels = ['0-30 Days', '30-60 Days', '60-90 Days', '90-180 Days', '180-365 Days', '>365 Days'];
    const bucketKeys = ['0-30', '30-60', '60-90', '90-180', '180-365', '>365'];
    
    const valueData = bucketKeys.map(k => bucketSums[k].value);
    const qtyData = bucketKeys.map(k => bucketSums[k].qty);

    window.ppniAgeingBucketChartInstance = new Chart(ctxBucket, {
      type: 'bar',
      data: {
        labels: bucketLabels,
        datasets: [
          {
            label: 'Total Value (₹)',
            data: valueData,
            backgroundColor: '#10b981', // green for value
            borderRadius: 4,
            yAxisID: 'yValue'
          },
          {
            label: 'Total Qty',
            data: qtyData,
            type: 'line',
            borderColor: '#f59e0b', // amber for qty
            backgroundColor: '#f59e0b',
            borderWidth: 2,
            pointRadius: 4,
            yAxisID: 'yQty'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                let v = ctx.raw;
                if (ctx.datasetIndex === 0) return 'Value: ' + formatCurrency(v);
                return 'Qty: ' + v.toLocaleString();
              }
            }
          },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#666',
            font: { size: 10, weight: 'bold' },
            formatter: (val, ctx) => {
              if (val === 0) return '';
              if (ctx.datasetIndex === 0) return formatCurrency(val);
              return val.toLocaleString();
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          yValue: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            ticks: { callback: v => formatCurrency(v) }
          },
          yQty: {
            type: 'linear',
            display: false,
            position: 'right',
            beginAtZero: true
          }
        }
      }
    });
  }
}

// Attach Pagination Events
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const pPrevBtn = document.getElementById('p-prev-page-btn');
    const pNextBtn = document.getElementById('p-next-page-btn');
    const pSearchInput = document.getElementById('ppni-search-input');
    
    if (pSearchInput) {
      pSearchInput.addEventListener('input', (e) => {
        window.pSearchQuery = e.target.value;
        window.pCurrentPage = 1;
        if(typeof window.renderPPNI === 'function') window.renderPPNI();
      });
    }

    if (pPrevBtn) {
      pPrevBtn.addEventListener('click', () => {
        if (window.pCurrentPage > 1) {
          window.pCurrentPage--;
          if(typeof window.renderPPNI === 'function') window.renderPPNI();
        }
      });
    }

    if (pNextBtn) {
      pNextBtn.addEventListener('click', () => {
        window.pCurrentPage++;
        if(typeof window.renderPPNI === 'function') window.renderPPNI();
      });
    }

    const pPageSize = document.getElementById('p-page-size');
    if (pPageSize) {
      pPageSize.value = String(window.pItemsPerPage);
      pPageSize.addEventListener('change', (e) => {
        window.pItemsPerPage = parseInt(e.target.value) || 50;
        window.pCurrentPage = 1;
        if(typeof window.renderPPNI === 'function') window.renderPPNI();
      });
    }
  }, 1000);
});

// Initialize Claims section
initClaims();
