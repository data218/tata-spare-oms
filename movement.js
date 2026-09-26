// movement.js
// Handles IN / OUT Movement Logic

window.movementData = [];
window.movementFiltered = [];
window.movCurrentPage = 1;
window.movDateFilter = 'today'; // Default to today
let isMovementInitialized = false;
const MOV_ITEMS_PER_PAGE = 50;

window.initMovementModule = async function() {
  if (isMovementInitialized) return;
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
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: red;">Error loading movement data: ${e.message}</td></tr>`;
      alert("Error loading movement data: " + e.message);
      isMovementInitialized = false; // Reset so they can try again
    }
  }, 50);
};

async function generateMovementData() {
  const transactions = [];
  const outSumByPartLoc = {};

  const cleanLocs = ['NARWAL', 'CHANNIRAMA', 'SUPWAL', 'KATHUA'];

  const mapLocation = (rawStr) => {
    if (!rawStr) return 'NARWAL';
    const str = String(rawStr).toUpperCase();
    
    // Fast path: direct includes
    for (const loc of cleanLocs) {
      if (str.includes(loc)) return loc;
    }
    
    // Specific hardcoded fallbacks
    if (str.includes('SMAMSAMBA')) return 'SUPWAL';
    if (str.includes('SMAMKATHUA')) return 'KATHUA';
    if (str.includes('JAMMU') || str.includes('NARVAL')) return 'NARWAL';
    return 'NARWAL';
  };

  // Pre-compute originalProcessedParts map for O(1) lookups
  const invPartMap = new Map();
  if (window.originalProcessedParts && window.originalProcessedParts.length > 0) {
    window.originalProcessedParts.forEach(p => {
      const pLoc = mapLocation(p.location);
      invPartMap.set(`${p.partId}_${pLoc}`, p);
    });
  }

  // 1. Process all OUT transactions (Consumption Data)
  const consumptionData = window.rawInventoryData?.consumption || window.consumptionData;
  if (consumptionData && consumptionData.length > 0) {
    consumptionData.forEach((c, index) => {
      const loc = mapLocation(c.division || c.dealer);
      const qtyRaw = parseFloat(c.sold_qty) || 0;
      if (qtyRaw <= 0) return;

      const partKey = `${c.part_no}_${loc}`;
      outSumByPartLoc[partKey] = (outSumByPartLoc[partKey] || 0) + qtyRaw;

      const invPart = invPartMap.get(partKey);
      const isLube = invPart?.productCategory?.toUpperCase().includes('LUB') || false;
      const ndpPrice = invPart?.ndpPrice || 0;

      let finalQty = qtyRaw;
      if (isLube) finalQty = finalQty / 1000;

      const value = ndpPrice > 0 ? (finalQty * ndpPrice) : (parseFloat(c.value) || 0);

      transactions.push({
        id: `OUT-${c.id || index}`,
        date: c.date ? new Date(c.date) : new Date(),
        direction: 'OUT',
        type: c.order_type || 'ISSUE',
        partNo: c.part_no,
        description: c.part_desc,
        location: loc,
        qty: finalQty,
        value: value,
        reference: c.invoice_no || c.order_num || '-',
        isLube: isLube
      });
    });
  }

  // 1.5. Apply Manual Movement Logs (IN/OUT)
  const manualLogs = window.rawInventoryData?.movementLogs || [];
  if (manualLogs.length > 0) {
    manualLogs.forEach((log, index) => {
      let qtyRaw = parseFloat(log.qty) || 0;
      const isLube = false; // We can't know for sure without looking up, let's look it up
      const partKey = `${log.part_id}_${mapLocation(log.location)}`;
      const invPart = invPartMap.get(partKey);
      const isLubeFinal = invPart?.productCategory?.toUpperCase().includes('LUB') || false;
      const ndpPrice = invPart?.ndpPrice || 0;
      
      let finalQty = qtyRaw;
      if (isLubeFinal) finalQty = finalQty / 1000;
      
      const value = ndpPrice > 0 ? (finalQty * ndpPrice) : 0;
      
      transactions.push({
        id: `MANUAL-${log.id || index}`,
        date: log.date ? new Date(log.date) : new Date(),
        direction: log.movement_type === 'IN' ? 'IN' : 'OUT',
        type: 'MANUAL',
        partNo: log.part_id,
        description: invPart ? invPart.model : 'Manual Entry',
        location: mapLocation(log.location),
        qty: finalQty,
        value: value,
        reference: log.reference || '-',
        isLube: isLubeFinal
      });
    });
  }

  // 2. Generate synthetic IN transactions based on Current Stock + Total OUT
  if (window.originalProcessedParts && window.originalProcessedParts.length > 0) {
    window.originalProcessedParts.forEach((p, index) => {
      const pLoc = mapLocation(p.location);
      const partKey = `${p.partId}_${pLoc}`;
      const totalOutRaw = outSumByPartLoc[partKey] || 0;
      const currentStockRaw = p.currentStock || 0;
      
      const totalInRaw = currentStockRaw + totalOutRaw;
      
      const isLube = p.productCategory?.toUpperCase().includes('LUB') || false;
      let finalInQty = totalInRaw;
      if (isLube) finalInQty = finalInQty / 1000;
      
      if (finalInQty > 0) {
        let d = new Date();
        if (p.last_receipt && p.last_receipt !== '-') {
          d = new Date(p.last_receipt);
          if(isNaN(d.getTime())) d = new Date();
        }
        
        transactions.push({
          id: `IN-${p.partId}-${index}`,
          date: d,
          direction: 'IN',
          type: 'RECEIPT',
          partNo: p.partId,
          description: p.model,
          location: pLoc,
          qty: finalInQty,
          value: finalInQty * (p.ndpPrice || 0),
          reference: 'SYS-REC-001',
          isLube: isLube
        });
      }
    });
  }

  // Sort by date desc
  transactions.sort((a, b) => b.date - a.date);
  window.movementData = transactions;
}

function attachMovementListeners() {
  const typeBtns = document.querySelectorAll('#movement-toggle .toggle-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      typeBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
        b.style.boxShadow = 'none';
      });
      const t = e.target;
      t.classList.add('active');
      t.style.background = 'white';
      t.style.color = 'var(--text-primary)';
      t.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      
      window.movCurrentType = t.dataset.type;
      filterMovementData();
    });
  });

  document.getElementById('movement-search')?.addEventListener('input', (e) => {
    window.movSearchQuery = e.target.value.toLowerCase();
    filterMovementData();
  });

  document.getElementById('movement-date-filter')?.addEventListener('change', (e) => {
    window.movDateFilter = e.target.value;
    filterMovementData();
  });

  document.getElementById('mov-prev-btn')?.addEventListener('click', () => {
    if (window.movCurrentPage > 1) {
      window.movCurrentPage--;
      renderMovementTable();
    }
  });

  document.getElementById('mov-next-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(window.movementFiltered.length / MOV_ITEMS_PER_PAGE);
    if (window.movCurrentPage < totalPages) {
      window.movCurrentPage++;
      renderMovementTable();
    }
  });
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

function _filterMovementData_internal() {
  window.movCurrentPage = 1;
  let filtered = [...window.movementData];

  const globalLoc = document.getElementById('location-select')?.value;
  if (globalLoc && globalLoc !== 'ALL') {
    filtered = filtered.filter(t => t.location.toUpperCase() === globalLoc.toUpperCase());
  }

  const typeFilter = window.movCurrentType || 'ALL';
  if (typeFilter !== 'ALL') {
    filtered = filtered.filter(t => t.direction === typeFilter);
  }

  if (window.movSearchQuery) {
    const q = window.movSearchQuery;
    filtered = filtered.filter(t => 
      t.partNo.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.reference && t.reference.toLowerCase().includes(q)) ||
      (t.type && t.type.toLowerCase().includes(q))
    );
  }

  if (window.movDateFilter && window.movDateFilter !== 'all') {
    const now = new Date();
    filtered = filtered.filter(t => {
      const d = new Date(t.date);
      if (window.movDateFilter === 'today') {
        return d.toDateString() === now.toDateString();
      } else if (window.movDateFilter === 'yesterday') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        return d.toDateString() === yest.toDateString();
      } else if (window.movDateFilter === 'last7') {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      } else if (window.movDateFilter === 'last30') {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff <= 30;
      } else if (window.movDateFilter === 'thismonth') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  window.movementFiltered = filtered;
  updateMovementKPIs();
  renderMovementTable();
  renderLocationMovement();
  renderTopParts();
}

function updateMovementKPIs() {
  let totalIn = 0, totalOut = 0, inVal = 0, outVal = 0;
  window.movementFiltered.forEach(t => {
    if (t.direction === 'IN') {
      totalIn += t.qty;
      inVal += t.value;
    } else {
      totalOut += t.qty;
      outVal += t.value;
    }
  });

  const setKPI = (id, val, prefix='', color='') => {
    const el = document.getElementById(id);
    if(el) {
      el.textContent = prefix + val;
      if(color) el.style.color = color;
    }
  };

  setKPI('mov-kpi-in', totalIn.toLocaleString('en-IN'));
  setKPI('mov-kpi-out', totalOut.toLocaleString('en-IN'));
  
  const net = totalIn - totalOut;
  setKPI('mov-kpi-net', Math.abs(net).toLocaleString('en-IN'), net >= 0 ? '+' : '-', net >= 0 ? '#10b981' : '#ef4444');
  
  setKPI('mov-kpi-in-val', inVal.toLocaleString('en-IN', {maximumFractionDigits:0}), '₹');
  setKPI('mov-kpi-out-val', outVal.toLocaleString('en-IN', {maximumFractionDigits:0}), '₹');
}

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
      
      const qtyStr = `${isOut ? '-' : '+'}${t.qty.toLocaleString('en-IN')}`;
      const qtyLabel = t.isLube ? `<span style="font-size:0.55rem;color:var(--text-secondary);margin-left:2px;">Ltr</span>` : '';
      
      tr.innerHTML = `
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; color: var(--text-secondary);">${dateStr}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem;"><span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; background: ${dirBg}; color: ${dirColor};">${t.direction}</span></td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; font-weight: 500;">${t.type}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; font-weight: 600;">${t.partNo}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; color: var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.description}">${t.description}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem;">${t.location}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; font-weight: 700; color: ${dirColor};">${qtyStr}${qtyLabel}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; font-weight: 500; font-size: 0.65rem;">₹${t.value.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
        <td style="padding: 2px 4px; font-size: 0.65rem; font-size: 0.65rem; color: var(--text-secondary);">${t.reference}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  const pInfo = document.getElementById('mov-page-info');
  if (pInfo) {
    pInfo.textContent = `${start + 1} to ${Math.min(end, totalRecords)} of ${totalRecords}`;
  }
  
  const prevBtn = document.getElementById('mov-prev-btn');
  const nextBtn = document.getElementById('mov-next-btn');
  if (prevBtn) prevBtn.disabled = window.movCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = window.movCurrentPage === totalPages;
}

function renderLocationMovement() {
  const container = document.getElementById('location-movement-body');
  if (!container) return;

  const locStats = {};
  window.movementFiltered.forEach(t => {
    if(!locStats[t.location]) locStats[t.location] = { inQty: 0, outQty: 0, inVal: 0, outVal: 0 };
    if(t.direction === 'IN') {
      locStats[t.location].inQty += t.qty;
      locStats[t.location].inVal += t.value;
    } else {
      locStats[t.location].outQty += t.qty;
      locStats[t.location].outVal += t.value;
    }
  });

  container.innerHTML = '';
  Object.keys(locStats).sort().forEach(loc => {
    const s = locStats[loc];
    const netQty = s.inQty - s.outQty;
    const netVal = s.inVal - s.outVal;
    
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #f1f5f9';
    tr.innerHTML = `
      <td style="padding: 2px 4px; font-size: 0.65rem; font-weight: 600;">${loc}</td>
      <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; color: #10b981;">+${s.inQty.toLocaleString('en-IN')}</td>
      <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; color: #ef4444;">-${s.outQty.toLocaleString('en-IN')}</td>
      <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; font-weight: 700; color: ${netQty >= 0 ? '#10b981' : '#ef4444'};">${netQty > 0 ? '+' : ''}${netQty.toLocaleString('en-IN')}</td>
      <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; color: var(--text-secondary);">₹${s.inVal.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
      <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; color: var(--text-secondary);">₹${s.outVal.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
      <td style="padding: 2px 4px; font-size: 0.65rem; text-align: right; font-weight: 700; color: ${netVal >= 0 ? '#10b981' : '#ef4444'};">₹${Math.abs(netVal).toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
    `;
    container.appendChild(tr);
  });
}

function renderTopParts() {
  const container = document.getElementById('top-parts-body');
  if (!container) return;

  const partStats = {};
  window.movementFiltered.forEach(t => {
    const key = t.partNo;
    if(!partStats[key]) partStats[key] = { desc: t.description, inQty: 0, outQty: 0, totalMovement: 0 };
    if(t.direction === 'IN') {
      partStats[key].inQty += t.qty;
    } else {
      partStats[key].outQty += t.qty;
    }
    partStats[key].totalMovement += Math.abs(t.qty);
  });

  const sorted = Object.entries(partStats)
    .sort((a,b) => b[1].totalMovement - a[1].totalMovement)
    .slice(0, 10);

  container.innerHTML = '';
  if (sorted.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No data</td></tr>';
  } else {
    sorted.forEach(([partNo, s]) => {
      const net = s.inQty - s.outQty;
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';
      tr.innerHTML = `
        <td style="padding: 2px 4px; font-size: 0.7rem;">
          <div style="font-weight: 600; line-height: 1.1;">${partNo}</div>
          <div style="font-size: 0.65rem; line-height: 1.1; color: var(--text-secondary); max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.desc}">${s.desc}</div>
        </td>
        <td style="padding: 2px 4px; font-size: 0.7rem; text-align: right; color: #10b981;">+${s.inQty.toLocaleString('en-IN')}</td>
        <td style="padding: 2px 4px; font-size: 0.7rem; text-align: right; color: #ef4444;">-${s.outQty.toLocaleString('en-IN')}</td>
        <td style="padding: 2px 4px; font-size: 0.7rem; text-align: right; font-weight: 600;">${s.totalMovement.toLocaleString('en-IN')}</td>
        <td style="padding: 2px 4px; font-size: 0.7rem; text-align: right; font-weight: 700; color: ${net >= 0 ? '#10b981' : '#ef4444'};">${net > 0 ? '+' : ''}${net.toLocaleString('en-IN')}</td>
      `;
      container.appendChild(tr);
    });
  }
}
