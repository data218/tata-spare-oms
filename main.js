import Chart from 'chart.js/auto';
import { supabase } from './supabase.js';

// Initialize Lucide Icons
lucide.createIcons();

// DOM Elements
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const sidebar = document.getElementById('sidebar');
const hamburgerBtn = document.getElementById('hamburger-btn');

// --- Session & Auth Logic ---
function initCharts() {
  console.log('Charts initialization placeholder - no charts implemented yet.');
}

function checkSession() {
  const session = sessionStorage.getItem('currentUser');
  if (session) {
    const user = JSON.parse(session);
    loginPage.classList.remove('active');
    dashboardPage.classList.add('active');
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.textContent = `Welcome ${user.username}!`;
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
window.activeSort = new Map();

function getFieldValue(obj, key, tableId) {
  if (key === 'statusText') {
    if (tableId === 'demand-table-body') {
      return obj.needsReorder ? 'REORDER' : 'SUFFICIENT';
    } else if (tableId === 'health-table-body') {
      if (obj.currentStock === 0) return 'Out of Stock';
      if (obj.currentStock < 5) return 'Low Stock';
      return 'Healthy';
    } else {
      const text = obj.status?.text || '';
      return text.replace(/<[^>]*>?/gm, '').trim();
    }
  }
  return obj[key];
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
  if (!table || !table.classList.contains('control-tower-table')) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  const tableId = tbody.id;

  const text = th.textContent.trim();
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
    'Total Price (₹)': 'stockValue', '30D Cons.': 'avgConsumption'
  };
  
  const key = keyMap[text];
  if (!key) return; // Action columns

  if (!window.originalProcessedParts || window.originalProcessedParts.length === 0) return;
  
  // Ensure table filters exist
  if (!window.activeFilters.has(tableId)) window.activeFilters.set(tableId, {});
  if (!window.activeSort.has(tableId)) window.activeSort.set(tableId, { key: '', isAsc: true });

  const currentFilters = window.activeFilters.get(tableId)[key] || new Set();
  const currentSort = window.activeSort.get(tableId);

  // Get unique values for this column
  const uniqueValues = [...new Set(window.originalProcessedParts.map(item => {
    const val = getFieldValue(item, key);
    return String(val === null || val === undefined ? '' : val);
  }))];
  uniqueValues.sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB) && a !== '' && b !== '') {
      return numA - numB;
    }
    return a.localeCompare(b, undefined, {numeric: true});
  });

  if (dropdown) dropdown.remove();

  const rect = th.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'column-filter-dropdown';
  div.dataset.colKey = key;
  
  const leftPos = rect.left + window.scrollX;
  const finalLeft = (leftPos + 220 > window.innerWidth) ? (window.innerWidth - 240) : leftPos;
  div.style.top = `${rect.bottom + window.scrollY}px`;
  div.style.left = `${finalLeft}px`;

  // Escape HTML in values to prevent quote breakage
  const escapeHtml = (str) => String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  const checkboxesHtml = uniqueValues.map(val => {
    const isChecked = currentFilters.has(val) ? 'checked' : '';
    const displayVal = val === '' ? '(Blank)' : escapeHtml(val);
    const safeVal = escapeHtml(val);
    return `<label class="column-filter-checkbox" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.85rem; color: var(--text-primary);">
      <input type="checkbox" value="${safeVal}" ${isChecked} style="cursor: pointer;"> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${displayVal}</span>
    </label>`;
  }).join('');

  div.innerHTML = `
    <div style="padding: 8px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
      <button class="sort-asc-btn" style="padding: 6px; text-align: left; background: ${currentSort.key === key && currentSort.isAsc ? 'var(--blue-50)' : 'transparent'}; border: none; cursor: pointer; border-radius: 4px; font-size: 0.85rem; color: var(--text-primary);"><i data-lucide="arrow-up-az" style="width: 14px; height: 14px; display: inline-block; vertical-align: text-bottom; margin-right: 6px;"></i> Sort A to Z</button>
      <button class="sort-desc-btn" style="padding: 6px; text-align: left; background: ${currentSort.key === key && !currentSort.isAsc ? 'var(--blue-50)' : 'transparent'}; border: none; cursor: pointer; border-radius: 4px; font-size: 0.85rem; color: var(--text-primary);"><i data-lucide="arrow-down-za" style="width: 14px; height: 14px; display: inline-block; vertical-align: text-bottom; margin-right: 6px;"></i> Sort Z to A</button>
    </div>
    <div style="max-height: 200px; overflow-y: auto; padding: 4px 0;">
      <label class="column-filter-checkbox" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.85rem; font-weight: 500; border-bottom: 1px solid var(--border-color); margin-bottom: 4px;">
        <input type="checkbox" class="select-all-cb" ${currentFilters.size === 0 || currentFilters.size === uniqueValues.length ? 'checked' : ''}> Select All
      </label>
      ${checkboxesHtml}
    </div>
    <div style="padding: 10px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; gap: 8px;">
      <button class="clear-btn" style="padding: 6px 12px; background: transparent; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Clear</button>
      <button class="apply-btn" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 500;">Apply</button>
    </div>
  `;

  const container = document.getElementById('filter-dropdown-container') || document.body;
  container.appendChild(div);
  
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

  // Handle Select All
  const selectAll = div.querySelector('.select-all-cb');
  const checkboxes = Array.from(div.querySelectorAll('input[type="checkbox"]:not(.select-all-cb)'));
  selectAll.addEventListener('change', (e) => {
    checkboxes.forEach(cb => cb.checked = e.target.checked);
  });
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      selectAll.checked = checkboxes.every(c => c.checked);
    });
  });

  // Handle Clear
  div.querySelector('.clear-btn').addEventListener('click', () => {
    window.activeFilters.get(tableId)[key] = new Set();
    window.activeSort.set(tableId, { key: '', isAsc: true });
    th.classList.remove('th-filtered');
    applyFiltersAndSort();
    div.remove();
  });

  // Handle Apply
  div.querySelector('.apply-btn').addEventListener('click', () => {
    const checked = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
    
    // Un-escape HTML to match original string
    const unescapeHtml = (str) => {
      const txt = document.createElement("textarea");
      txt.innerHTML = str;
      return txt.value;
    };
    const finalChecked = checked.map(unescapeHtml);

    if (finalChecked.length === 0 || finalChecked.length === uniqueValues.length) {
      window.activeFilters.get(tableId)[key] = new Set();
      th.classList.remove('th-filtered');
    } else {
      window.activeFilters.get(tableId)[key] = new Set(finalChecked);
      th.classList.add('th-filtered');
    }
    applyFiltersAndSort();
    div.remove();
  });

  const applyFiltersAndSort = () => {
    const filters = window.activeFilters.get(tableId);
    let result = window.originalProcessedParts.filter(part => {
      for (const [fKey, fSet] of Object.entries(filters)) {
        if (fSet.size > 0) {
          const rawVal = getFieldValue(part, fKey);
          const val = String(rawVal === null || rawVal === undefined ? '' : rawVal);
          if (!fSet.has(val)) return false;
        }
      }
      return true;
    });

    const sortConfig = window.activeSort.get(tableId);
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = getFieldValue(a, sortConfig.key);
        let valB = getFieldValue(b, sortConfig.key);
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortConfig.isAsc ? -1 : 1;
        if (valA > valB) return sortConfig.isAsc ? 1 : -1;
        return 0;
      });
    }

    // Only update the global filtered list if we are updating the main table.
    // If updating sub-tables, we should theoretically maintain separate states, 
    // but for now we follow the existing pattern where they share the filtered state,
    // or just re-render them using the new result.
    filteredProcessedParts = result;
    
    if (tableId === 'inventory-table-body' && typeof renderTablePage === 'function') {
      currentPage = 1; renderTablePage();
    } else if (tableId === 'health-table-body' && typeof renderHealthTable === 'function') {
      window.hCurrentPage = 1; renderHealthTable();
    } else if (tableId === 'demand-table-body' && typeof renderDemandTable === 'function') {
      window.dCurrentPage = 1; renderDemandTable();
    }
  };
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
      
      const welcomeMessage = document.getElementById('welcome-message');
      if (welcomeMessage) welcomeMessage.textContent = `Welcome ${user.username}!`;

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
  document.getElementById('password').value = '';
  dashboardPage.classList.remove('active');
  loginPage.classList.add('active');
});

// Run session check on load
checkSession();

window.applyAccessControls = function(user) {
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
};

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
          view.style.display = 'block';
        } else {
          view.style.display = 'none';
        }
      });
      // Re-init icons when switching views just in case
      lucide.createIcons();
    }
  });
});

// --- Locations Settings Logic ---
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
       syncText.textContent = 'Last updated: ' + data.value;
    }
  } catch(e) {}
}

const addLocForm = document.getElementById('add-location-form');
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
  fetchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('fetch-data-btn');
    const statusDiv = document.getElementById('fetch-status');
    const rawFromDate = document.getElementById('from-date').value;
    const rawToDate = document.getElementById('to-date').value;
    
    if (!rawFromDate || !rawToDate) {
      statusDiv.style.display = 'block';
      statusDiv.style.color = '#ef4444';
      statusDiv.textContent = 'Please select both dates.';
      return;
    }
    
    // Convert YYYY-MM-DD to MM/DD/YYYY
    const [fY, fM, fD] = rawFromDate.split('-');
    const fromDate = `${fM}/${fD}/${fY}`;
    const [tY, tM, tD] = rawToDate.split('-');
    const toDate = `${tM}/${tD}/${tY}`;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" class="lucide-spin"></i> Fetching Data... This may take a few minutes.';
    btn.disabled = true;
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--text-secondary)';
    statusDiv.textContent = 'Starting background scraper... please wait and do not close this page.';
    lucide.createIcons();
    
    try {
      const response = await fetch('http://localhost:3000/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate })
      });
      
      const result = await response.json();
      
      if (result.success) {
        btn.innerHTML = '<i data-lucide="check"></i> Data Replaced!';
        btn.style.background = '#059669';
        statusDiv.style.color = '#059669';
        statusDiv.textContent = 'Success: ' + result.message;
        
        // Update last sync time
        await supabase.from('tata_bot_settings').upsert({ key: 'last_sync', value: new Date().toLocaleString() }, { onConflict: 'key' });
        loadLastSync();

        // Reload dashboard data
        setTimeout(() => {
          loadDataAndRender();
        }, 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      btn.innerHTML = '<i data-lucide="alert-triangle"></i> Error';
      statusDiv.style.color = '#ef4444';
      statusDiv.textContent = 'Error: ' + err.message;
    }
    
    lucide.createIcons();
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '#ef4444';
      btn.disabled = false;
      lucide.createIcons();
    }, 5000);
  });
}


// Removed old mock sync logic

// --- DASHBOARD LIVE DATA & CALCULATION LOGIC ---
let rawInventoryData = [];
let aggregatedParts = [];
let filteredProcessedParts = [];
let currentPage = 1;
const itemsPerPage = 50;

async function fetchTableData(tableName) {
  let tableData = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    tableData = tableData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  return tableData;
}

async function fetchInventoryData() {
  try {
    const [inventoryData, consumptionData, priceListData] = await Promise.all([
      fetchTableData('tata_spare_inventory'),
      fetchTableData('tata_consumption_data'),
      fetchTableData('tata_price_list')
    ]);
    
    return { inventory: inventoryData, consumption: consumptionData, priceList: priceListData };
  } catch (err) {
    console.error('Network error fetching from Supabase:', err);
    return { inventory: [], consumption: [], priceList: [] };
  }
}

function processRawData({ inventory, consumption, priceList = [] }) {
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

  const processed = parts.map(part => {
    // Override lead time and safety stock based on business rule: 7 days
    const leadTime = 7;
    const safetyStock = Math.ceil((part.consumption30d / 30) * leadTime);
    
    const available = part.currentStock - part.reserved;
    // Net Requirement = Demand + Safety Stock − Available Stock − Confirmed In-Transit
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
      30-day average consumption: ${part.consumption30d}/month<br>
      Open demand: ${part.demand}<br>
      Safety stock (7 days): ${safetyStock}<br>
      In-transit: ${part.inTransit}<br>
      Supplier lead time: ${leadTime} days<br><br>
      <strong>Reason:</strong> ${orderQty > 0 ? 'Available stock is insufficient to cover current demand and safety stock after considering confirmed incoming stock.' : 'Current inventory and incoming stock are sufficient to meet demand and maintain safety thresholds.'}`;

    return { ...part, leadTime, safetyStock, available, netRequirement, orderQty, status, aiReason };
  });

  return { processed, kpis, categoryTotals };
}

async function loadDataAndRender() {
  const tbody = document.getElementById('inventory-table-body');
  if(tbody) tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px;">Loading live data from Supabase...</td></tr>';
  
  rawInventoryData = await fetchInventoryData();
  aggregatedParts = processRawData(rawInventoryData);
  
  const updatedEl = document.querySelector('#last-updated-text span');
  if (updatedEl && rawInventoryData.length > 0) {
    // Grab the updated_at from the first row (they should all be similar from the bulk insert)
    const latestDateStr = rawInventoryData[0].updated_at;
    if (latestDateStr) {
      const d = new Date(latestDateStr);
      updatedEl.textContent = d.toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      });
    } else {
      updatedEl.textContent = 'Unknown';
    }
  } else if (updatedEl) {
    updatedEl.textContent = 'No data available';
  }

  renderDashboard();
}

function renderDashboard() {
  const locationSelect = document.getElementById('location-select');
  const selectedLoc = locationSelect ? locationSelect.value : 'ALL';
  
  const filteredParts = aggregatedParts.filter(part => {
    if (selectedLoc === 'ALL') return true;
    return part.location === selectedLoc;
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

function renderTablePage() {
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
    locSelect.addEventListener('change', renderDashboard);
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
        const response = await fetch('http://localhost:3000/api/sync', {
          method: 'POST'
        });
        const result = await response.json();
        
        let currentIcon = syncBtn.querySelector('svg') || syncBtn.querySelector('i');
        if (currentIcon) currentIcon.classList.remove('lucide-spin');
        syncBtn.disabled = false;
        syncBtn.style.opacity = '1';
        
        if(result.success) {
          btnText.textContent = 'Synced!';
          await supabase.from('tata_bot_settings').upsert({ key: 'last_sync', value: new Date().toLocaleString() }, { onConflict: 'key' });
          loadLastSync();
          setTimeout(() => {
            console.log('Sync successful, refreshing dashboard data from Supabase...');
            loadDataAndRender();
            btnText.textContent = originalText;
          }, 1000);
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
  
  // Settings Form Logic - Multi Location
  const credForm = document.getElementById('tata-credentials-form');
  const locContainer = document.getElementById('locations-container');
  const addLocBtn = document.getElementById('add-location-btn');
  
  if(credForm && locContainer) {
    // Render a single location row
    function createLocationRow(locData = { location: '', username: '', password: '' }) {
      const row = document.createElement('div');
      row.className = 'location-row';
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1fr 1fr 1fr auto';
      row.style.gap = '12px';
      row.style.alignItems = 'end';
      
      row.innerHTML = `
        <div>
          <label style="display:block; margin-bottom:4px; font-size:0.85rem;">Location Name</label>
          <input type="text" class="loc-name" value="${locData.location}" required style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:4px;" placeholder="e.g. NARWAL">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; font-size:0.85rem;">User ID</label>
          <input type="text" class="loc-user" value="${locData.username}" style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:4px;" placeholder="Username">
        </div>
        <div>
          <label style="display:block; margin-bottom:4px; font-size:0.85rem;">Password</label>
          <div style="position: relative; display: flex; align-items: center;">
            <input type="password" class="loc-pass" value="${locData.password}" style="width:100%; padding:8px; padding-right:36px; border:1px solid var(--border-color); border-radius:4px;" placeholder="Password">
            <button type="button" class="toggle-pass-btn" style="position: absolute; right: 8px; background: transparent; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; padding: 4px;" title="Toggle Password Visibility">
              <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </div>
        <button type="button" class="remove-loc-btn" style="padding:8px; border:none; background:transparent; color:#ef4444; cursor:pointer;" title="Remove Location">
          <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
        </button>
      `;
      
      row.querySelector('.remove-loc-btn').addEventListener('click', () => {
        row.remove();
      });

      const passInput = row.querySelector('.loc-pass');
      const toggleBtn = row.querySelector('.toggle-pass-btn');
      
      toggleBtn.addEventListener('click', () => {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          toggleBtn.innerHTML = '<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>';
        } else {
          passInput.type = 'password';
          toggleBtn.innerHTML = '<i data-lucide="eye" style="width: 16px; height: 16px;"></i>';
        }
        lucide.createIcons();
      });
      
      locContainer.appendChild(row);
      lucide.createIcons();
    }

    // Load existing credentials
    async function loadCredentials() {
      try {
        const res = await fetch('http://localhost:3000/api/credentials');
        const data = await res.json();
        locContainer.innerHTML = '';
        if (data && data.length > 0) {
          data.forEach(d => createLocationRow(d));
        } else {
          createLocationRow(); // Add empty row if none
        }
      } catch (e) {
        console.error('Failed to load credentials', e);
        createLocationRow({ location: 'NARWAL' });
        createLocationRow({ location: 'SUPWAL' });
        createLocationRow({ location: 'KATHUA' });
      }
    }
    
    // Load on start
    loadCredentials();

    addLocBtn.addEventListener('click', () => {
      createLocationRow();
    });

    credForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const rows = document.querySelectorAll('.location-row');
      const creds = [];
      rows.forEach(row => {
        creds.push({
          location: row.querySelector('.loc-name').value,
          username: row.querySelector('.loc-user').value,
          password: row.querySelector('.loc-pass').value
        });
      });
      
      try {
        await fetch('http://localhost:3000/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds)
        });
        
        const msg = document.getElementById('settings-msg');
        msg.style.display = 'block';
        msg.textContent = 'Credentials saved for ' + creds.length + ' locations!';
        msg.style.color = '#10b981';
        setTimeout(() => {
          msg.style.display = 'none';
        }, 3000);
      } catch (err) {
        const msg = document.getElementById('settings-msg');
        msg.style.display = 'block';
        msg.textContent = 'Failed to save credentials.';
        msg.style.color = '#ef4444';
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
    dashboardUsers.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.id}</td>
        <td><strong>${user.username}</strong></td>
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
    document.getElementById('add-user-btn').addEventListener('click', () => {
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
      }
      alert('Password updated successfully for ' + document.getElementById('change-pwd-username').textContent);
      changePwdForm.reset();
      changePwdForm.style.display = 'none';
    });
    
    renderUsers();
  }

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

  window.renderHealthTable = function() {
    const tbody = document.getElementById('health-table-body');
    if (!tbody) return;
    
    // Filter the raw aggregatedParts (before requirement engine logic if we want raw data, but filteredProcessedParts has location filter applied)
    let displayParts = [...filteredProcessedParts];
    
    // 1. Search Query Filter
    if (window.hSearchQuery) {
      const q = window.hSearchQuery.toLowerCase();
      displayParts = displayParts.filter(p => 
        (p.partId && p.partId.toLowerCase().includes(q)) || 
        (p.model && p.model.toLowerCase().includes(q))
      );
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
    const totalPages = Math.ceil(totalItems / window.hItemsPerPage) || 1;
    if (window.hCurrentPage > totalPages) window.hCurrentPage = totalPages;
    
    const startIndex = (window.hCurrentPage - 1) * window.hItemsPerPage;
    const endIndex = Math.min(startIndex + window.hItemsPerPage, totalItems);
    const paginatedParts = displayParts.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    
    if (paginatedParts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-secondary);">No parts found matching criteria.</td></tr>';
    } else {
      paginatedParts.forEach(part => {
        // Determine health badge
        let badgeClass = 'healthy';
        let badgeText = 'Healthy';
        if (part.currentStock === 0) {
          badgeClass = 'critical'; badgeText = 'Out of Stock';
        } else if (part.currentStock < 5) {
          badgeClass = 'low'; badgeText = 'Low Stock';
        }
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 8px 12px; font-weight: 500;">${part.partId}</td>
          <td style="padding: 8px 12px; color: var(--text-secondary);">${part.model}</td>
          <td style="padding: 8px 12px;">${part.location}</td>
          <td style="padding: 8px 12px;">${part.bin || 'N/A'}</td>
          <td style="padding: 8px 12px;">${part.productCategory || 'TATA'}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${part.currentStock}</td>
          <td style="padding: 8px 12px; text-align: right;">₹${(part.stockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
  }

  const hFilterBtns = document.querySelectorAll('.health-filter-btn');
  hFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      hFilterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      window.hCurrentFilter = e.target.getAttribute('data-filter');
      window.hCurrentPage = 1;
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
    const tbody = document.getElementById('demand-table-body');
    if (!tbody) return;
    
    let displayParts = [...filteredProcessedParts];
    
    // Process "needs reorder" status
    displayParts.forEach(p => {
      p.needsReorder = (p.currentStock + p.inTransit) < (p.min + p.demand);
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
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No parts found matching criteria.</td></tr>';
    } else {
      paginatedParts.forEach(part => {
        let actionBadgeClass = part.needsReorder ? 'critical' : 'healthy';
        let actionBadgeText = part.needsReorder ? 'Reorder' : 'Sufficient';
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 8px 12px; font-weight: 500;">${part.partId}</td>
          <td style="padding: 8px 12px; color: var(--text-secondary);">${part.model}</td>
          <td style="padding: 8px 12px; text-align: center;">${part.currentStock}</td>
          <td style="padding: 8px 12px; text-align: center;">${part.min}</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: ${part.demand > 0 ? 'var(--orange)' : 'inherit'};">${part.demand}</td>
          <td style="padding: 8px 12px; text-align: center;">${part.consumption30d}</td>
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

  const renderConsumptionTable = () => {
    const tbody = document.getElementById('cons-table-body');
    if (!tbody) return;
    
    // Filter and sort by consumption30d (descending)
    let cParts = filteredProcessedParts.filter(p => p.consumption30d > 0);
    
    if (window.cSearchQuery) {
      const q = window.cSearchQuery.toLowerCase();
      cParts = cParts.filter(p => p.partId.toLowerCase().includes(q) || p.model.toLowerCase().includes(q));
    }
    
    cParts.sort((a, b) => b.consumption30d - a.consumption30d);
    
    const totalItems = cParts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (window.cCurrentPage > totalPages) window.cCurrentPage = totalPages;
    
    const startIndex = (window.cCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedParts = cParts.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    if (paginatedParts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No consumption data found.</td></tr>';
    } else {
      paginatedParts.forEach((part, index) => {
        const rank = startIndex + index + 1;
        const trendIcon = part.consumption30d > 50 ? '<i data-lucide="trending-up" style="color:var(--green);"></i>' : '<i data-lucide="minus" style="color:var(--text-secondary);"></i>';
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 8px 12px; font-weight: 500; text-align: center;">#${rank}</td>
          <td style="padding: 8px 12px; font-weight: 500;">${part.partId}</td>
          <td style="padding: 8px 12px; color: var(--text-secondary);">${part.model}</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold;">${part.consumption30d}</td>
          <td style="padding: 8px 12px; text-align: center;"><span style="background:var(--bg-secondary); padding:4px 8px; border-radius:4px; font-size:0.8rem;">${part.productCategory}</span></td>
          <td style="padding: 8px 12px; text-align: center;">${trendIcon}</td>
        `;
        tbody.appendChild(tr);
      });
    }
    
    if(typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    
    // Update KPIs
    const totalConsumed = cParts.reduce((sum, p) => sum + p.consumption30d, 0);
    const fastMoving = cParts.filter(p => p.consumption30d > 20).length;
    const tEl = document.getElementById('cons-kpi-total');
    if (tEl) tEl.textContent = totalConsumed;
    const fEl = document.getElementById('cons-kpi-fast');
    if (fEl) fEl.textContent = fastMoving;
    
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
