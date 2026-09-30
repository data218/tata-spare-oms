// reorder.js
// Handles intelligent Reorder Control Tower Logic

window.reorderData = [];
window.reorderFiltered = [];
window.roCurrentPage = 1;
const RO_ITEMS_PER_PAGE = 50;
window.reorderBasket = new Set();

window.initReorderModule = function() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  generateReorderData();
  populateReorderFilters();
  attachReorderListeners();
  filterReorderData();
};

function generateReorderData() {
  const recommendations = [];
  const partGroups = new Map();
  const partsList = window.originalProcessedParts || [];

  if (partsList.length === 0) {
    window.reorderData = [];
    return;
  }

  partsList.forEach(p => {
    if (!partGroups.has(p.partId)) partGroups.set(p.partId, []);
    partGroups.get(p.partId).push(p);
  });

  const now = new Date();
  const leadTime = 14;
  const reviewPeriod = 30;

  partsList.forEach((p, index) => {
    const loc = p.location.toUpperCase();
    const currentStock = Number(p.currentStock) || 0;
    const reserved = Number(p.reserved) || 0;
    const inTransit = Number(p.inTransit) || 0;
    const available = currentStock - reserved;
    const avgDailyCons = Number(p.consumption30d) || 0;
    const ndp = Number(p.ndpPrice) || 0;
    const cost = ndp;

    const minStock = Math.max(1, Math.ceil(avgDailyCons * leadTime));
    const maxStock = Math.max(minStock, Math.ceil(avgDailyCons * (leadTime + reviewPeriod)));
    const safetyStock = Math.ceil(avgDailyCons * leadTime);
    const reorderPoint = Math.ceil(avgDailyCons * leadTime) + safetyStock;

    let daysOfStock = 'NO CONSUMPTION';
    if (avgDailyCons > 0) {
      daysOfStock = (available / avgDailyCons).toFixed(1);
    } else if (available > 0) {
      daysOfStock = '>999';
    } else {
      daysOfStock = '0.0';
    }

    let recQty = 0;
    const netRequirement = reorderPoint - available - inTransit;
    if (netRequirement > 0) {
      recQty = Math.ceil(netRequirement);
    }

    let transferSource = null;
    if (recQty > 0) {
      const peers = partGroups.get(p.partId) || [];
      for (const peer of peers) {
        if (peer.location.toUpperCase() !== loc) {
          const peerAvail = (Number(peer.currentStock) || 0) - (Number(peer.reserved) || 0);
          const peerMin = Math.max(1, Math.ceil((Number(peer.consumption30d) || 0) * leadTime));
          const excess = peerAvail - peerMin;
          if (excess >= recQty) {
            transferSource = peer.location.toUpperCase();
            break;
          }
        }
      }
    }

    let priority = 'NONE';
    let risk = 'COVERED';
    let reason = 'Stock is adequate';

    if (recQty > 0) {
      if (transferSource) {
        priority = 'TRANSFER';
        risk = 'OPPORTUNITY';
        reason = `Transfer available from ${transferSource}`;
      } else if (available + inTransit === 0 && avgDailyCons > 0) {
        priority = 'CRITICAL';
        risk = 'STOCKOUT';
        reason = 'OUT OF STOCK + ACTIVE CONSUMPTION';
      } else if (available === 0 && inTransit > 0) {
        priority = 'HIGH';
        risk = 'STOCKOUT';
        reason = 'OUT OF STOCK (IN TRANSIT)';
      } else if (available + inTransit < minStock) {
        priority = 'HIGH';
        risk = 'SHORTAGE RISK';
        reason = 'BELOW MINIMUM STOCK LEVEL';
      } else if (available + inTransit <= reorderPoint) {
        priority = 'MEDIUM';
        risk = 'REORDER SOON';
        reason = 'AT/BELOW REORDER POINT';
      } else {
        priority = 'PLANNED';
        risk = 'MAINTAIN';
        reason = 'MAINTAIN TARGET STOCK';
      }
    }

    if (recQty > 0) {
      recommendations.push({
        id: `RO-${p.partId}-${index}`,
        partNo: p.partId,
        description: p.model,
        category: p.productCategory || '-',
        supplier: p.vendor || 'TATA MOTORS',
        location: loc,
        currentStock: currentStock,
        reserved: reserved,
        available: available,
        inTransit: inTransit,
        minStock: minStock,
        maxStock: maxStock,
        safetyStock: safetyStock,
        reorderPoint: reorderPoint,
        avgDailyCons: avgDailyCons,
        daysOfStock: daysOfStock,
        recQty: recQty,
        value: recQty * cost,
        priority: priority,
        risk: risk,
        reason: reason,
        transferSource: transferSource,
        ndpPrice: ndp,
        lastReceipt: p.last_receipt || '',
        ageingDays: p.ageingDays || -1
      });
    }
  });

  const pWeight = { 'CRITICAL': 5, 'HIGH': 4, 'MEDIUM': 3, 'TRANSFER': 2, 'PLANNED': 1, 'NONE': 0 };
  recommendations.sort((a, b) => pWeight[b.priority] - pWeight[a.priority] || b.value - a.value);

  window.reorderData = recommendations;
}

function populateReorderFilters() {
  const sFilter = document.getElementById('reorder-supplier-filter');
  if (!sFilter) return;
  const suppliers = new Set();
  window.reorderData.forEach(r => suppliers.add(r.supplier));
  suppliers.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sFilter.appendChild(opt);
  });
}

function attachReorderListeners() {
  document.getElementById('reorder-search')?.addEventListener('input', (e) => {
    window.roSearchQuery = e.target.value.toLowerCase();
    filterReorderData();
  });
  document.getElementById('reorder-priority-filter')?.addEventListener('change', (e) => {
    window.roPriorityFilter = e.target.value;
    filterReorderData();
  });
  document.getElementById('reorder-supplier-filter')?.addEventListener('change', (e) => {
    window.roSupplierFilter = e.target.value;
    filterReorderData();
  });
  document.getElementById('reorder-clear-filters')?.addEventListener('click', () => {
    document.getElementById('reorder-search').value = '';
    document.getElementById('reorder-priority-filter').value = 'ALL';
    document.getElementById('reorder-supplier-filter').value = 'ALL';
    window.roSearchQuery = '';
    window.roPriorityFilter = 'ALL';
    window.roSupplierFilter = 'ALL';
    window.roKpiFilter = null;
    filterReorderData();
  });

  document.getElementById('reorder-export-btn')?.addEventListener('click', () => {
    if (!window.reorderData || window.reorderData.length === 0) {
      alert("No data available to export.");
      return;
    }
    const dataToExport = window.reorderFiltered && window.reorderFiltered.length > 0 ? window.reorderFiltered : window.reorderData;
    const exportData = dataToExport.map(r => ({
      'Priority': r.priority,
      'Part Number': r.partNo,
      'Description': r.description,
      'Location': r.location,
      'Supplier': r.supplier,
      'Current Stock': r.currentStock,
      'Reserved': r.reserved,
      'Available': r.available,
      'In Transit Qty': r.inTransit,
      'Min Stock': r.minStock,
      'Max Stock': r.maxStock,
      'Safety Stock': r.safetyStock,
      'Reorder Point': r.reorderPoint,
      'Avg Daily Consumption': r.avgDailyCons,
      'Days of Stock': r.daysOfStock,
      'Suggested Order Qty': r.recQty,
      'NDP (₹)': r.ndpPrice,
      'Estimated Value (₹)': r.value,
      'Reason / Risk': r.reason
    }));
    try {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reorder_Recommendations");
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Reorder_Recommendations_${dateStr}.xlsx`);
    } catch (e) {
      console.error("Export failed: ", e);
      alert("Failed to export. Ensure XLSX library is loaded.");
    }
  });

  document.getElementById('ro-prev-btn')?.addEventListener('click', () => {
    if (window.roCurrentPage > 1) {
      window.roCurrentPage--;
      renderReorderTable();
    }
  });

  document.getElementById('ro-next-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(window.reorderFiltered.length / RO_ITEMS_PER_PAGE);
    if (window.roCurrentPage < totalPages) {
      window.roCurrentPage++;
      renderReorderTable();
    }
  });

  document.getElementById('ro-check-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    const currentData = window.reorderFiltered.slice((window.roCurrentPage - 1) * RO_ITEMS_PER_PAGE, window.roCurrentPage * RO_ITEMS_PER_PAGE);
    currentData.forEach(r => {
      if (checked) window.reorderBasket.add(r.id);
      else window.reorderBasket.delete(r.id);
    });
    updateBasketCount();
    renderReorderTable();
  });
}

window.filterReorderKPI = function(kpi) {
  window.roKpiFilter = kpi;
  filterReorderData();
};

function filterReorderData() {
  window.roCurrentPage = 1;
  let filtered = window.tableFilterData && window.tableFilterData['reorder-table-body'] ? [...window.tableFilterData['reorder-table-body']] : [...window.reorderData];

  if (window.roKpiFilter) {
    if (window.roKpiFilter === 'REQUIRED') {
      filtered = filtered.filter(r => r.recQty > 0);
    } else if (window.roKpiFilter === 'CRITICAL') {
      filtered = filtered.filter(r => r.priority === 'CRITICAL');
    } else if (window.roKpiFilter === 'OUT_OF_STOCK') {
      filtered = filtered.filter(r => r.currentStock === 0);
    }
  }

  const pF = window.roPriorityFilter || 'ALL';
  if (pF !== 'ALL') {
    filtered = filtered.filter(r => r.priority === pF);
  }
  const sF = window.roSupplierFilter || 'ALL';
  if (sF !== 'ALL') {
    filtered = filtered.filter(r => r.supplier === sF);
  }

  if (window.roSearchQuery) {
    const q = window.roSearchQuery;
    filtered = filtered.filter(r =>
      r.partNo.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.supplier.toLowerCase().includes(q)
    );
  }

  window.reorderFiltered = filtered;
  updateReorderKPIs();
  renderReorderTable();
  renderSupplierSummary();
}

function updateReorderKPIs() {
  let required = window.reorderFiltered.length;
  let critical = 0;
  let outOfStock = 0;
  let totalQty = 0;
  let totalVal = 0;
  let transfers = 0;
  let totalAvailable = 0;
  let totalInTransit = 0;

  window.reorderFiltered.forEach(r => {
    if (r.priority === 'CRITICAL') critical++;
    if (r.currentStock === 0) outOfStock++;
    if (r.priority === 'TRANSFER') transfers++;
    totalQty += r.recQty;
    totalVal += r.value;
    totalAvailable += r.available;
    totalInTransit += r.inTransit;
  });

  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT('ro-kpi-required', required.toLocaleString('en-IN'));
  setT('ro-kpi-critical', critical.toLocaleString('en-IN'));
  setT('ro-kpi-out', outOfStock.toLocaleString('en-IN'));
  setT('ro-kpi-qty', totalQty.toLocaleString('en-IN'));
  setT('ro-kpi-val', '₹' + totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 }));
  setT('ro-kpi-transfer', transfers.toLocaleString('en-IN'));
}

function updateBasketCount() {
  const el = document.getElementById('reorder-basket-count');
  if (el) el.textContent = window.reorderBasket.size;
}

window.toggleReorderBasket = function(id) {
  if (window.reorderBasket.has(id)) {
    window.reorderBasket.delete(id);
  } else {
    window.reorderBasket.add(id);
  }
  updateBasketCount();
};

function renderReorderTable() {
  const tbody = document.getElementById('reorder-table-body');
  if (!tbody) return;

  const totalRecords = window.reorderFiltered.length;
  const totalPages = Math.ceil(totalRecords / RO_ITEMS_PER_PAGE) || 1;

  if (window.roCurrentPage > totalPages) window.roCurrentPage = totalPages;
  if (window.roCurrentPage < 1) window.roCurrentPage = 1;

  const start = (window.roCurrentPage - 1) * RO_ITEMS_PER_PAGE;
  const end = start + RO_ITEMS_PER_PAGE;
  const currentData = window.reorderFiltered.slice(start, end);

  tbody.innerHTML = '';

  if (currentData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 40px; color: var(--text-secondary);">No reorder recommendations found based on current filters.</td></tr>';
  } else {
    currentData.forEach(r => {
      let badgeHtml = '';
      if (r.priority === 'CRITICAL') badgeHtml = '<span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">CRITICAL</span>';
      else if (r.priority === 'HIGH') badgeHtml = '<span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">HIGH</span>';
      else if (r.priority === 'MEDIUM') badgeHtml = '<span style="background: rgba(234, 179, 8, 0.1); color: #eab308; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">MEDIUM</span>';
      else if (r.priority === 'TRANSFER') badgeHtml = '<span style="background: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">TRANSFER</span>';
      else badgeHtml = '<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">PLANNED</span>';

      const isChecked = window.reorderBasket.has(r.id) ? 'checked' : '';

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';
      tr.style.background = isChecked ? '#f8fafc' : 'white';

      tr.innerHTML = `
        <td style="padding: 4px 4px; text-align: center;"><input type="checkbox" onchange="window.toggleReorderBasket('${r.id}'); this.closest('tr').style.background = this.checked ? '#f8fafc' : 'white';" ${isChecked}></td>
        <td style="padding: 4px 4px;">${badgeHtml}</td>
        <td style="padding: 4px 4px;">
          <div style="font-weight: 600; font-size: 0.8rem;">${r.partNo}</div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.description}">${r.description}</div>
        </td>
        <td style="padding: 4px 4px;">
          <div style="font-size: 0.7rem; font-weight: 500;">${r.location}</div>
          <div style="font-size: 0.7rem; color: var(--text-secondary);">${r.supplier}</div>
        </td>
        <td style="padding: 4px 4px; text-align: right;">
          <div style="font-weight: ${r.currentStock === 0 ? '700' : '500'}; color: ${r.currentStock === 0 ? '#ef4444' : 'inherit'};">${r.currentStock.toLocaleString('en-IN')}</div>
          <div style="font-size: 0.7rem; color: #8b5cf6;">In Transit: ${r.inTransit}</div>
          <div style="font-size: 0.7rem; color: #f59e0b;">Available: ${r.available}</div>
        </td>
        <td style="padding: 8px 4px; text-align: right; font-size: 0.7rem; color: var(--text-secondary);">${r.minStock} / ${r.maxStock}</td>
        <td style="padding: 8px 4px; text-align: right; font-size: 0.7rem;">${r.avgDailyCons.toFixed(1)}</td>
        <td style="padding: 8px 4px; text-align: right; font-size: 0.7rem; font-weight: 600;">${r.daysOfStock}</td>
        <td style="padding: 4px 4px; text-align: right;">
          <div style="font-weight: 700; color: #3b82f6;">${r.recQty.toLocaleString('en-IN')}</div>
          <div style="font-size: 0.7rem; color: var(--text-secondary);">₹${r.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </td>
        <td style="padding: 4px 4px;">
          <div style="font-size: 0.8rem; font-weight: 500; color: ${r.risk.includes('STOCKOUT') ? '#ef4444' : 'inherit'};">${r.risk}</div>
          <div style="font-size: 0.7rem; color: var(--text-secondary);">${r.reason}</div>
        </td>
        <td style="padding: 4px 4px; text-align: center;">
          <button class="btn btn-outline" onclick="window.viewReorderReason(this)" data-reason="${encodeURIComponent(r.reason)}" data-part="${r.partNo}" data-desc="${encodeURIComponent(r.description)}" data-loc="${r.location}" style="padding: 4px 8px; font-size: 0.7rem; color: #3b82f6; border-color: #3b82f6;">View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const pInfo = document.getElementById('ro-page-info');
  if (pInfo) pInfo.textContent = `${start + 1} to ${Math.min(end, totalRecords)} of ${totalRecords}`;

  const prevBtn = document.getElementById('ro-prev-btn');
  const nextBtn = document.getElementById('ro-next-btn');
  if (prevBtn) prevBtn.disabled = window.roCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = window.roCurrentPage === totalPages;

  const checkAll = document.getElementById('ro-check-all');
  if (checkAll) {
    const allOnPage = currentData.every(r => window.reorderBasket.has(r.id));
    checkAll.checked = currentData.length > 0 && allOnPage;
  }
}

function renderSupplierSummary() {
  const container = document.getElementById('reorder-supplier-body');
  if (!container) return;

  const stats = {};
  window.reorderFiltered.forEach(r => {
    if (!stats[r.supplier]) stats[r.supplier] = { count: 0, qty: 0, value: 0, critical: 0 };
    stats[r.supplier].count++;
    stats[r.supplier].qty += r.recQty;
    stats[r.supplier].value += r.value;
    if (r.priority === 'CRITICAL') stats[r.supplier].critical++;
  });

  const sorted = Object.entries(stats).sort((a, b) => b[1].value - a[1].value);

  container.innerHTML = '';
  if (sorted.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No supplier data</td></tr>';
  } else {
    sorted.forEach(([supp, s]) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';
      tr.innerHTML = `
        <td style="padding: 8px 4px; font-weight: 600; color: #3b82f6; cursor: pointer;">${supp}</td>
        <td style="padding: 8px 4px; text-align: right; font-weight: 500;">${s.count.toLocaleString('en-IN')} parts</td>
        <td style="padding: 8px 4px; text-align: right; font-weight: 600;">${s.qty.toLocaleString('en-IN')}</td>
        <td style="padding: 8px 4px; text-align: right; font-weight: 700; color: var(--text-primary);">₹${s.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
        <td style="padding: 8px 4px; text-align: right; font-weight: ${s.critical > 0 ? '700' : '400'}; color: ${s.critical > 0 ? '#ef4444' : 'inherit'};">${s.critical}</td>
      `;
      container.appendChild(tr);
    });
  }
}

window.viewReorderReason = function(btn) {
  const reason = decodeURIComponent(btn.getAttribute('data-reason'));
  const partNo = btn.getAttribute('data-part') || 'Unknown Part';
  const desc = decodeURIComponent(btn.getAttribute('data-desc') || '');
  const loc = btn.getAttribute('data-loc') || 'Unknown Location';

  const modal = document.createElement('div');
  modal.id = 'reorder-reason-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:white;padding:24px;border-radius:10px;max-width:500px;width:90%; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
      <button onclick="document.getElementById('reorder-reason-modal').remove()" style="position:absolute;top:16px;right:16px;background:var(--card-bg);border:1px solid #e2e8f0;border-radius:50%;width:28px;height:28px;font-size:1.2rem;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all 0.2s;">&times;</button>
      <h3 style="margin-top:0; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; color: #0f172a; font-size: 1.1rem; display:flex; align-items:center; gap:8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        Recommendation Details
      </h3>
      <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
        <div style="font-weight: 700; font-size: 1.1rem; color: #0f172a;">${partNo}</div>
        <div style="font-size: 0.9rem; color: #475569; margin-top: 2px;">${desc}</div>
        <div style="font-size: 0.85rem; color: #64748b; margin-top: 6px; display: flex; align-items: center; gap: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          ${loc}
        </div>
      </div>
      <div>
        <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Reasoning</div>
        <p style="font-size:0.95rem;color:#334155;line-height:1.6;margin:0;">${reason}</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};
