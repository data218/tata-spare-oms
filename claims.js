import { supabase } from './supabase.js';

export let claimsData = [];
window.claimsCurrentPage = 1;
window.claimsEditModeId = null;
window.claimsTableFilters = {};
window.claimsSortConfig = { col: null, dir: null };
const CLAIMS_PER_PAGE = 15;

function toProperText(str) {
  if (!str) return '-';
  str = String(str).toLowerCase();
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// DOM Elements
const btnNewClaim = document.getElementById('btn-new-claim');
const btnCloseClaimForm = document.getElementById('btn-close-claim-form');
const claimFormContainer = document.getElementById('claim-form-container');
const btnRefreshClaims = document.getElementById('btn-refresh-claims');
const claimsSearchInput = document.getElementById('claims-search-input');
const claimsTableBody = document.getElementById('claims-table-body');

export function initClaims() {
  if (!document.getElementById('view-claims')) return;

  // Toggle Form
  if (btnNewClaim && claimFormContainer) {
    btnNewClaim.addEventListener('click', () => {
      claimFormContainer.style.display = 'block';
    });
  }
  if (btnCloseClaimForm && claimFormContainer) {
    btnCloseClaimForm.addEventListener('click', () => {
      claimFormContainer.style.display = 'none';
    });
  }

  // Hide form on successful submit (handled in main.js, but we can hook in)
  const cfStatusMessage = document.getElementById('cf-status-message');
  if (cfStatusMessage) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (cfStatusMessage.textContent === 'Claim submitted successfully!' && cfStatusMessage.style.display !== 'none') {
          setTimeout(() => {
            claimFormContainer.style.display = 'none';
            fetchClaimsData(); // Auto refresh
          }, 1500);
        }
      });
    });
    observer.observe(cfStatusMessage, { attributes: true, childList: true, characterData: true });
  }

  // Search & Refresh
  if (btnRefreshClaims) {
    btnRefreshClaims.addEventListener('click', fetchClaimsData);
  }
  if (claimsSearchInput) {
    claimsSearchInput.addEventListener('input', () => {
      window.claimsCurrentPage = 1;
      renderClaimsTable(claimsSearchInput.value);
    });
  }

  const prevBtn = document.getElementById('claims-prev-btn');
  const nextBtn = document.getElementById('claims-next-btn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (window.claimsCurrentPage > 1) {
        window.claimsCurrentPage--;
        renderClaimsTable(claimsSearchInput ? claimsSearchInput.value : '');
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      window.claimsCurrentPage++;
      renderClaimsTable(claimsSearchInput ? claimsSearchInput.value : '');
    });
  }

  const locFilter = document.getElementById('filter-location');
  const monthFilter = document.getElementById('filter-month');
  if (locFilter) locFilter.addEventListener('change', renderAllViews);
  if (monthFilter) monthFilter.addEventListener('change', renderAllViews);

  // Initial Fetch
  fetchClaimsData();
}

function getHeatmapColor(pct) {
  let r, g, b;
  if (pct <= 50) {
    const p = pct / 50;
    r = Math.round(99 + (255 - 99) * p);
    g = Math.round(190 + (235 - 190) * p);
    b = Math.round(123 + (132 - 123) * p);
  } else {
    const p = (pct - 50) / 50;
    r = Math.round(255 + (248 - 255) * p);
    g = Math.round(235 + (105 - 235) * p);
    b = Math.round(132 + (107 - 132) * p);
  }
  return `rgba(${r}, ${g}, ${b}, 0.7)`;
}

async function fetchClaimsData() {
  try {
    const { data, error } = await supabase
      .from('tata_part_claim_data')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    claimsData = data || [];
    
    populateFilters();
    renderAllViews();
  } catch (err) {
    console.error('Error fetching claims data:', err);
  }
}

function calculateGap(receivedDate, claimDate) {
  if (!receivedDate || !claimDate) return '-';
  const r = new Date(receivedDate);
  const c = new Date(claimDate);
  if (isNaN(r) || isNaN(c)) return '-';
  const diffTime = Math.abs(c - r);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}

function populateFilters() {
  const locFilter = document.getElementById('filter-location');
  const monthFilter = document.getElementById('filter-month');
  if (!locFilter || !monthFilter) return;

  const currentLoc = locFilter.value;
  const currentMonth = monthFilter.value;

  const locations = new Set();
  const months = new Set();

  claimsData.forEach(c => {
    if (c.dealer_name) locations.add(c.dealer_name);
    if (c.claim_request_date) {
      const d = new Date(c.claim_request_date);
      if (!isNaN(d)) {
        months.add(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
      }
    }
  });

  locFilter.innerHTML = '<option value="">All Locations</option>';
  Array.from(locations).sort().forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = toProperText(loc);
    if (loc === currentLoc) opt.selected = true;
    locFilter.appendChild(opt);
  });

  monthFilter.innerHTML = '<option value="">All Time</option>';
  Array.from(months).sort((a, b) => b.localeCompare(a)).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    const [yy, mm] = m.split('-');
    const dateObj = new Date(parseInt(yy), parseInt(mm) - 1, 1);
    opt.textContent = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (m === currentMonth) opt.selected = true;
    monthFilter.appendChild(opt);
  });
}

function getFilteredData() {
  const locFilter = document.getElementById('filter-location')?.value || '';
  const monthFilter = document.getElementById('filter-month')?.value || '';

  return claimsData.filter(c => {
    if (locFilter && c.dealer_name !== locFilter) return false;
    if (monthFilter && c.claim_request_date) {
      const d = new Date(c.claim_request_date);
      if (!isNaN(d)) {
        const m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (m !== monthFilter) return false;
      } else {
        return false;
      }
    }
    return true;
  });
}

function populateTableFilters(baseData) {
  const headers = document.querySelectorAll('#view-claims th[data-col]');
  headers.forEach(th => {
    const col = th.getAttribute('data-col');
    
    // Remove old <select> if present
    const oldSelect = th.querySelector('.col-filter');
    if (oldSelect) oldSelect.remove();
    
    // Add filter icon if not exists
    if (!th.querySelector('.excel-filter-icon')) {
      th.style.paddingRight = '24px'; // Make room for icon
      
      const iconWrap = document.createElement('span');
      iconWrap.className = 'excel-filter-icon';
      iconWrap.style.cssText = 'position:absolute; right:6px; top:50%; transform:translateY(-50%); cursor:pointer; color:#94a3b8; display:inline-flex; align-items:center;';
      iconWrap.innerHTML = '<i data-lucide="filter" style="width:14px; height:14px;"></i>';
      th.appendChild(iconWrap);
      
      if (window.lucide) {
        lucide.createIcons({ icons: { Filter: lucide.icons.Filter }, nameAttr: 'data-lucide', root: iconWrap });
      }
      
      iconWrap.addEventListener('click', (e) => {
        e.stopPropagation();
        openExcelFilterModal(col, th, baseData);
      });
    }
    
    // Highlight icon if filtered
    const iconSpan = th.querySelector('.excel-filter-icon');
    if (window.claimsTableFilters[col] && window.claimsTableFilters[col].size > 0) {
      iconSpan.style.color = '#3b82f6'; // active filter
    } else {
      iconSpan.style.color = '#94a3b8';
    }
  });
}

function openExcelFilterModal(col, thElement, baseData) {
  // Remove existing modal if any
  const existing = document.getElementById('excel-filter-modal');
  if (existing) existing.remove();
  
  // Get unique values for this col
  const uniqueVals = new Set();
  baseData.forEach(c => {
    let val = c[col];
    if (col === 'issue_desc') val = c.other_issue_details || c.detailed_description;
    else if (col === 'gap_in_days') val = calculateGap(c.part_received_date, c.claim_request_date);
    
    if (val !== null && val !== undefined && val !== '') {
      uniqueVals.add(String(val));
    }
  });
  const valArray = Array.from(uniqueVals).sort();
  
  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'excel-filter-modal';
  modal.style.cssText = 'position:fixed; background:white; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 4px 15px rgba(0,0,0,0.15); width:250px; z-index:1000; display:flex; flex-direction:column; font-size:0.85rem; color:#334155;';
  
  const rect = thElement.getBoundingClientRect();
  modal.style.top = (rect.bottom + 5) + 'px';
  modal.style.left = rect.left + 'px';
  
  // HTML content for modal
  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; padding:8px 10px; border-bottom:1px solid #e2e8f0; background:#f8fafc; border-radius:6px 6px 0 0;">
      <button id="ef-sort-asc" style="background:none; border:none; cursor:pointer; color:#475569; display:flex; align-items:center; gap:4px; font-size:0.8rem;"><i data-lucide="arrow-down-a-z" style="width:14px;height:14px;"></i> Sort A to Z</button>
      <button id="ef-sort-desc" style="background:none; border:none; cursor:pointer; color:#475569; display:flex; align-items:center; gap:4px; font-size:0.8rem;"><i data-lucide="arrow-up-z-a" style="width:14px;height:14px;"></i> Sort Z to A</button>
    </div>
    <div style="padding:10px; border-bottom:1px solid #e2e8f0;">
      <input type="text" id="ef-search" placeholder="Search values..." style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:4px; outline:none; box-sizing:border-box;">
    </div>
    <div style="padding:5px 10px;">
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600;">
        <input type="checkbox" id="ef-select-all" checked> Select All
      </label>
    </div>
    <div id="ef-checkbox-list" style="flex:1; max-height:200px; overflow-y:auto; padding:5px 10px;">
      <!-- checkboxes injected here -->
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-top:1px solid #e2e8f0; background:#f8fafc; border-radius:0 0 6px 6px;">
      <button id="ef-clear" style="background:none; border:1px solid #cbd5e1; padding:4px 10px; border-radius:4px; cursor:pointer;">Clear</button>
      <div style="display:flex; gap:6px;">
        <button id="ef-cancel" style="background:white; border:1px solid #cbd5e1; padding:4px 10px; border-radius:4px; cursor:pointer;">Cancel</button>
        <button id="ef-ok" style="background:#3b82f6; color:white; border:none; padding:4px 12px; border-radius:4px; cursor:pointer;">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  if (window.lucide) {
    lucide.createIcons({ icons: { ArrowDownAZ: lucide.icons.ArrowDownAZ, ArrowUpZA: lucide.icons.ArrowUpZA }, nameAttr: 'data-lucide', root: modal });
  }
  
  const searchInput = document.getElementById('ef-search');
  const selectAll = document.getElementById('ef-select-all');
  const listContainer = document.getElementById('ef-checkbox-list');
  
  let currentSet = window.claimsTableFilters[col] ? new Set(window.claimsTableFilters[col]) : new Set(valArray);
  let isAllSelected = currentSet.size === valArray.length || currentSet.size === 0;
  if (!window.claimsTableFilters[col]) isAllSelected = true;
  selectAll.checked = isAllSelected;

  const renderCheckboxes = (query = '') => {
    listContainer.innerHTML = '';
    const q = query.toLowerCase();
    valArray.forEach(v => {
      const text = toProperText(v);
      if (text.toLowerCase().includes(q)) {
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:flex; align-items:center; gap:6px; cursor:pointer; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = v;
        cb.checked = isAllSelected || currentSet.has(v);
        
        cb.addEventListener('change', (e) => {
          if (e.target.checked) currentSet.add(v);
          else {
            currentSet.delete(v);
            selectAll.checked = false;
            isAllSelected = false;
          }
        });
        
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(text));
        listContainer.appendChild(lbl);
      }
    });
  };
  
  renderCheckboxes();
  
  searchInput.addEventListener('input', (e) => renderCheckboxes(e.target.value));
  
  selectAll.addEventListener('change', (e) => {
    isAllSelected = e.target.checked;
    if (isAllSelected) {
      valArray.forEach(v => currentSet.add(v));
    } else {
      currentSet.clear();
    }
    renderCheckboxes(searchInput.value);
  });
  
  document.getElementById('ef-sort-asc').addEventListener('click', () => {
    window.claimsSortConfig = { col: col, dir: 'asc' };
    window.claimsCurrentPage = 1;
    renderClaimsTable();
    modal.remove();
  });
  
  document.getElementById('ef-sort-desc').addEventListener('click', () => {
    window.claimsSortConfig = { col: col, dir: 'desc' };
    window.claimsCurrentPage = 1;
    renderClaimsTable();
    modal.remove();
  });
  
  document.getElementById('ef-clear').addEventListener('click', () => {
    delete window.claimsTableFilters[col];
    window.claimsCurrentPage = 1;
    renderClaimsTable();
    modal.remove();
  });
  
  document.getElementById('ef-cancel').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('ef-ok').addEventListener('click', () => {
    if (isAllSelected && searchInput.value === '') {
      delete window.claimsTableFilters[col];
    } else {
      window.claimsTableFilters[col] = currentSet;
    }
    window.claimsCurrentPage = 1;
    renderClaimsTable();
    modal.remove();
  });
  
  setTimeout(() => {
    const outsideClick = (e) => {
      if (!modal.contains(e.target) && !thElement.contains(e.target)) {
        modal.remove();
        document.removeEventListener('click', outsideClick);
      }
    };
    document.addEventListener('click', outsideClick);
  }, 10);
}

function renderAllViews() {
  renderPivotDealer();
  renderPivotIssue();
  renderPivotAction();
  const searchInput = document.getElementById('claims-search-input');
  renderClaimsTable(searchInput ? searchInput.value : '');
}

function renderClaimsTable(searchQuery = '') {
  if (!claimsTableBody) return;
  claimsTableBody.innerHTML = '';
  
  const q = searchQuery.toLowerCase();
  const baseData = getFilteredData();
  
  // Populate the table column filters based on currently available data
  populateTableFilters(baseData);

  // Apply column-level filters
  let filtered = baseData.filter(c => {
    let matchesCols = true;
    for (const [col, filterSet] of Object.entries(window.claimsTableFilters)) {
      if (filterSet && filterSet.size > 0) {
        let val = c[col];
        if (col === 'issue_desc') {
          val = c.other_issue_details || c.detailed_description;
        } else if (col === 'gap_in_days') {
          val = calculateGap(c.part_received_date, c.claim_request_date);
        }
        if (!filterSet.has(String(val))) {
          matchesCols = false;
          break;
        }
      }
    }
    if (!matchesCols) return false;

    if (q) {
      return (c.dealer_name || '').toLowerCase().includes(q) ||
             (c.part_number || '').toLowerCase().includes(q) ||
             (c.invoice_number || '').toLowerCase().includes(q) ||
             (c.type_of_issue || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Apply Sorting
  if (window.claimsSortConfig && window.claimsSortConfig.col) {
    filtered.sort((a, b) => {
      let valA = a[window.claimsSortConfig.col];
      let valB = b[window.claimsSortConfig.col];
      
      if (window.claimsSortConfig.col === 'issue_desc') {
        valA = a.other_issue_details || a.detailed_description;
        valB = b.other_issue_details || b.detailed_description;
      } else if (window.claimsSortConfig.col === 'gap_in_days') {
        valA = calculateGap(a.part_received_date, a.claim_request_date);
        valB = calculateGap(b.part_received_date, b.claim_request_date);
      }
      
      let strA = String(valA || '').toLowerCase();
      let strB = String(valB || '').toLowerCase();
      
      // Numeric sorting for amount or gap
      if (window.claimsSortConfig.col === 'amount' || window.claimsSortConfig.col === 'gap_in_days') {
        strA = parseFloat(valA) || 0;
        strB = parseFloat(valB) || 0;
        if (strA < strB) return window.claimsSortConfig.dir === 'asc' ? -1 : 1;
        if (strA > strB) return window.claimsSortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      }
      
      if (strA < strB) return window.claimsSortConfig.dir === 'asc' ? -1 : 1;
      if (strA > strB) return window.claimsSortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const startIndex = (window.claimsCurrentPage - 1) * CLAIMS_PER_PAGE;
  const endIndex = startIndex + CLAIMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, endIndex);

  paginated.forEach(c => {
    const tr = document.createElement('tr');
    
    if (window.claimsEditModeId === c.id) {
      tr.innerHTML = `
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-dealer" value="${c.dealer_name || ''}"></td>
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-invoice" value="${c.invoice_number || ''}"></td>
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-req-action" value="${c.requested_action || ''}"></td>
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-part-no" value="${c.part_number || ''}"></td>
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-part-desc" value="${c.part_description || ''}"></td>
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-issue-type" value="${c.type_of_issue || ''}"></td>
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-issue-desc" value="${c.other_issue_details || c.detailed_description || ''}"></td>
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-remarks" value="${c.remarks || ''}"></td>
        <td><input type="date" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-recv-date" value="${c.part_received_date ? c.part_received_date.split('T')[0] : ''}"></td>
        <td><input type="date" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-claim-date" value="${c.claim_request_date ? c.claim_request_date.split('T')[0] : ''}"></td>
        <td><input type="text" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-claim-no" value="${c.claim_number || ''}"></td>
        <td>${calculateGap(c.part_received_date, c.claim_request_date)}</td>
        <td><input type="number" style="width:100%; box-sizing:border-box; padding:4px;" id="edit-amount" value="${c.amount || ''}"></td>
        <td>
          <button class="btn-save primary-btn" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;">Save</button>
          <button class="btn-cancel secondary-btn" style="padding:4px 8px; font-size:0.8rem;">Cancel</button>
        </td>
      `;
      
      const btnSave = tr.querySelector('.btn-save');
      btnSave.addEventListener('click', async () => {
        btnSave.disabled = true;
        btnSave.textContent = '...';
        try {
          const updates = {
            dealer_name: document.getElementById('edit-dealer').value,
            invoice_number: document.getElementById('edit-invoice').value,
            requested_action: document.getElementById('edit-req-action').value,
            part_number: document.getElementById('edit-part-no').value,
            part_description: document.getElementById('edit-part-desc').value,
            type_of_issue: document.getElementById('edit-issue-type').value,
            detailed_description: document.getElementById('edit-issue-desc').value,
            remarks: document.getElementById('edit-remarks').value,
            part_received_date: document.getElementById('edit-recv-date').value || null,
            claim_request_date: document.getElementById('edit-claim-date').value || null,
            claim_number: document.getElementById('edit-claim-no').value,
            amount: parseFloat(document.getElementById('edit-amount').value) || 0
          };
          const { error } = await supabase.from('tata_part_claim_data').update(updates).eq('id', c.id);
          if (error) throw error;
          window.claimsEditModeId = null;
          fetchClaimsData();
        } catch(e) {
          console.error(e);
          alert('Failed to save record.');
          btnSave.disabled = false;
          btnSave.textContent = 'Save';
        }
      });
      
      tr.querySelector('.btn-cancel').addEventListener('click', () => {
        window.claimsEditModeId = null;
        renderClaimsTable();
      });
      
    } else {
      tr.innerHTML = `
        <td>${toProperText(c.dealer_name)}</td>
        <td>${toProperText(c.invoice_number)}</td>
        <td>${toProperText(c.requested_action)}</td>
        <td>${toProperText(c.part_number)}</td>
        <td>${toProperText(c.part_description)}</td>
        <td>${toProperText(c.type_of_issue)}</td>
        <td>${toProperText(c.other_issue_details || c.detailed_description)}</td>
        <td>${toProperText(c.remarks)}</td>
        <td>${c.part_received_date ? new Date(c.part_received_date).toLocaleDateString() : '-'}</td>
        <td>${c.claim_request_date ? new Date(c.claim_request_date).toLocaleDateString() : '-'}</td>
        <td>${toProperText(c.claim_number)}</td>
        <td>${calculateGap(c.part_received_date, c.claim_request_date)}</td>
        <td>${c.amount ? '₹' + c.amount.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td>
        <td><button class="btn-edit secondary-btn" style="padding:4px 8px; font-size:0.8rem;">Edit</button></td>
      `;
      
      tr.querySelector('.btn-edit').addEventListener('click', () => {
        window.claimsEditModeId = c.id;
        renderClaimsTable();
      });
    }
    claimsTableBody.appendChild(tr);
  });

  const pageInfo = document.getElementById('claims-page-info');
  if (pageInfo) {
    const startText = filtered.length === 0 ? 0 : startIndex + 1;
    const endText = Math.min(endIndex, filtered.length);
    pageInfo.textContent = `Showing ${startText} to ${endText} of ${filtered.length} claims`;
  }
  
  const prevBtn = document.getElementById('claims-prev-btn');
  const nextBtn = document.getElementById('claims-next-btn');
  if (prevBtn) prevBtn.disabled = window.claimsCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = endIndex >= filtered.length;
}

function renderPivotDealer() {
  const container = document.getElementById('pivot-dealer');
  if (!container) return;

  const grouped = {};
  let totalCount = 0;
  let totalAmount = 0;

  getFilteredData().forEach(c => {
    const key = c.dealer_name || 'Unknown';
    if (!grouped[key]) grouped[key] = { count: 0, amount: 0 };
    grouped[key].count++;
    grouped[key].amount += (c.amount || 0);
    totalCount++;
    totalAmount += (c.amount || 0);
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1].amount - a[1].amount);
  
  // Find max for data bars
  const maxCount = Math.max(...sorted.map(s => s[1].count), 1);
  const maxAmount = Math.max(...sorted.map(s => s[1].amount), 1);

  container.innerHTML = '';
  sorted.forEach(([key, val], index) => {
    const countPct = (val.count / maxCount) * 100;
    const amountPct = (val.amount / maxAmount) * 100;
    
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '2fr 1fr 1.2fr';
    row.style.borderBottom = '1px solid #f1f5f9';
    row.style.fontSize = '0.85rem';
    
    row.innerHTML = `
      <div style="display: flex; gap: 10px; align-items: center; padding: 6px 12px; border-right: 1px solid #f1f5f9;">
        <span style="color: #94a3b8; font-size: 0.75rem;">${index + 1}..</span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${key}</span>
      </div>
      <div style="position: relative; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; padding: 6px 12px; border-right: 1px solid #f1f5f9;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${countPct}%; background-color: ${getHeatmapColor(countPct)}; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; font-weight: 500;">${val.count}</span>
      </div>
      <div style="position: relative; text-align: right; display: flex; align-items: center; justify-content: flex-end; height: 100%; padding: 6px 12px;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${amountPct}%; background-color: ${getHeatmapColor(amountPct)}; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; font-weight: 500;">${val.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
      </div>
    `;
    container.appendChild(row);
  });

  document.getElementById('pd-count').textContent = totalCount;
  document.getElementById('pd-amount').textContent = totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2});
}

function renderPivotIssue() {
  const container = document.getElementById('pivot-issue');
  if (!container) return;

  const grouped = {};
  let totalCount = 0;
  let totalAmount = 0;

  getFilteredData().forEach(c => {
    const key = c.type_of_issue || 'Unknown';
    if (!grouped[key]) grouped[key] = { count: 0, amount: 0 };
    grouped[key].count++;
    grouped[key].amount += (c.amount || 0);
    totalCount++;
    totalAmount += (c.amount || 0);
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1].amount - a[1].amount);
  
  const maxCount = Math.max(...sorted.map(s => s[1].count), 1);
  const maxAmount = Math.max(...sorted.map(s => s[1].amount), 1);

  container.innerHTML = '';
  sorted.forEach(([key, val], index) => {
    const countPct = (val.count / maxCount) * 100;
    const amountPct = (val.amount / maxAmount) * 100;
    
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '2fr 1fr 1.2fr';
    row.style.borderBottom = '1px solid #f1f5f9';
    row.style.fontSize = '0.85rem';
    
    row.innerHTML = `
      <div style="display: flex; gap: 10px; align-items: center; justify-content: center; padding: 6px 12px; border-right: 1px solid #f1f5f9; position: relative;">
        <span style="color: #94a3b8; font-size: 0.75rem; position: absolute; left: 12px;">${index + 1}..</span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;">${key}</span>
      </div>
      <div style="position: relative; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; padding: 6px 12px; border-right: 1px solid #f1f5f9;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${countPct}%; background-color: ${getHeatmapColor(countPct)}; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; font-weight: 500;">${val.count}</span>
      </div>
      <div style="position: relative; text-align: right; display: flex; align-items: center; justify-content: flex-end; height: 100%; padding: 6px 12px;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${amountPct}%; background-color: ${getHeatmapColor(amountPct)}; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; font-weight: 500;">${val.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
      </div>
    `;
    container.appendChild(row);
  });

  document.getElementById('pi-count').textContent = totalCount;
  document.getElementById('pi-amount').textContent = totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2});
}

function renderPivotAction() {
  const container = document.getElementById('pivot-action');
  if (!container) return;

  const grouped = {};
  let totalCount = 0;
  let totalAmount = 0;

  getFilteredData().forEach(c => {
    const key = c.requested_action || 'Unknown';
    if (!grouped[key]) grouped[key] = { count: 0, amount: 0 };
    grouped[key].count++;
    grouped[key].amount += (c.amount || 0);
    totalCount++;
    totalAmount += (c.amount || 0);
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1].amount - a[1].amount);
  
  const maxCount = Math.max(...sorted.map(s => s[1].count), 1);
  const maxAmount = Math.max(...sorted.map(s => s[1].amount), 1);

  container.innerHTML = '';
  sorted.forEach(([key, val], index) => {
    const countPct = (val.count / maxCount) * 100;
    const amountPct = (val.amount / maxAmount) * 100;
    const contribPct = totalCount ? ((val.count / totalCount) * 100).toFixed(2) : 0;
    const amtContribPct = totalAmount ? ((val.amount / totalAmount) * 100).toFixed(2) : 0;
    
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '2fr 1fr 1fr 1fr 1fr';
    row.style.borderBottom = '1px solid #f1f5f9';
    row.style.fontSize = '0.85rem';
    
    row.innerHTML = `
      <div style="display: flex; gap: 10px; align-items: center; justify-content: center; padding: 6px 12px; border-right: 1px solid #f1f5f9; position: relative;">
        <span style="color: #94a3b8; font-size: 0.75rem; position: absolute; left: 12px;">${index + 1}.</span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;">${key}</span>
      </div>
      
      <!-- Record Count -->
      <div style="position: relative; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; padding: 6px 12px; border-right: 1px solid #f1f5f9;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${countPct}%; background-color: ${getHeatmapColor(countPct)}; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; font-weight: 500;">${val.count}</span>
      </div>
      
      <!-- Contribution -->
      <div style="position: relative; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; padding: 6px 12px; border-right: 1px solid #f1f5f9;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${contribPct}%; background-color: ${getHeatmapColor(contribPct)}; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; font-weight: 500;">${contribPct}%</span>
      </div>

      <!-- Amount -->
      <div style="position: relative; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; padding: 6px 12px; border-right: 1px solid #f1f5f9;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${amountPct}%; background-color: ${getHeatmapColor(amountPct)}; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; font-weight: 500;">${val.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
      </div>

      <!-- Amount Contribution -->
      <div style="position: relative; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; padding: 6px 12px;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${amtContribPct}%; background-color: ${getHeatmapColor(amtContribPct)}; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; font-weight: 500;">${amtContribPct}%</span>
      </div>
    `;
    container.appendChild(row);
  });

  document.getElementById('pa-count').textContent = totalCount;
  document.getElementById('pa-amount').textContent = totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2});
}
