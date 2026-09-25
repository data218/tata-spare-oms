const fs = require('fs');
let mainJS = fs.readFileSync('main.js', 'utf8');

const regex = /window\.renderHealthTable = function\(\) \{[\s\S]*?\/\/ --- Stock Ageing Summary ---/;

const newFunction = `window.renderHealthTable = function() {
    const tbody = document.getElementById('health-table-body');
    if (!tbody) return;
    
    // Prefer column-filtered rows, else global location-filtered data
    let displayParts = window.tableFilterData['health-table-body'] || [...filteredProcessedParts];
    if (window.hSearchQuery) {
      const q = window.hSearchQuery.toLowerCase();
      displayParts = displayParts.filter(p => 
        (p.partId && p.partId.toLowerCase().includes(q)) || 
        (p.model && p.model.toLowerCase().includes(q))
      );
    }
    const searchBase = displayParts;
    
    // Health / card filter (threshold = weekly demand from sold qty, min 5)
    const f = window.hCurrentFilter;
    const reorderThreshold = (p) => {
      const d = Number(p.demand) || 0;
      return d >= 1 ? d : 5;
    };
    if (f === 'value') {
      displayParts = [...displayParts].sort((a, b) => (Number(b.stockValue) || 0) - (Number(a.stockValue) || 0));
    } else if (f === 'critical') {
      displayParts = displayParts.filter(p => p.currentStock === 0);
    } else if (f === 'low') {
      displayParts = displayParts.filter(p => p.currentStock > 0 && p.currentStock < reorderThreshold(p));
    } else if (f === 'healthy') {
      displayParts = displayParts.filter(p => p.currentStock >= reorderThreshold(p));
    } else if (f === 'onhand') {
      displayParts = displayParts.filter(p => (Number(p.currentStock) || 0) > 0);
    } else if (f === 'transit') {
      displayParts = displayParts.filter(p => (Number(p.inTransit) || 0) > 0);
    } else if (f === 'reserved') {
      displayParts = displayParts.filter(p => (Number(p.reserved) || 0) > 0);
    } else if (f === 'lube') {
      displayParts = displayParts.filter(p => /OIL|LUBRICANT|GREASE|GEAR OIL|ENGINE OIL/i.test(p.model || ''));
    }

    const totalItems = displayParts.length;
    const totalPages = Math.ceil(totalItems / window.hItemsPerPage) || 1;
    if (window.hCurrentPage > totalPages) window.hCurrentPage = totalPages;

    // KPIs reflect location + search scope (stable regardless of which card is active)
    const healthBase = searchBase;
    const thresholdFor = (p) => {
      const d = Number(p.demand) || 0;
      return d >= 1 ? d : 5;
    };
    const hKpiTotal = healthBase.length;
    const hKpiValue = healthBase.reduce((s, p) => s + (Number(p.stockValue) || 0), 0);
    const hKpiOos = healthBase.filter(p => Number(p.currentStock) === 0).length;
    const hKpiLow = healthBase.filter(p => Number(p.currentStock) > 0 && Number(p.currentStock) < thresholdFor(p)).length;
    const hKpiTransit = healthBase.reduce((s, p) => s + (Number(p.inTransit) || 0), 0);
    const hKpiReserved = healthBase.reduce((s, p) => s + (Number(p.reserved) || 0), 0);
    const hKpiOnHandQty = healthBase.reduce((s, p) => s + (Number(p.currentStock) || 0), 0);
    const hKpiOnHandVal = hKpiValue;
    const hKpiTransitVal = healthBase.reduce((s, p) => s + (Number(p.ndpPrice) || 0) * (Number(p.inTransit) || 0), 0);
    const hKpiReservedVal = healthBase.reduce((s, p) => s + (Number(p.ndpPrice) || 0) * (Number(p.reserved) || 0), 0);
    const kpiCardTotal = healthBase.length;
    const kpiCardTotalStock = hKpiOnHandQty + hKpiReserved + hKpiTransit;
    const lubeParts = healthBase.filter(p => /OIL|LUBRICANT|GREASE|GEAR OIL|ENGINE OIL/i.test(p.model || ''));
    const hKpiLubeQty = lubeParts.reduce((s, p) => s + (Number(p.currentStock) || 0), 0);
    const hKpiLubeVal = lubeParts.reduce((s, p) => s + (Number(p.ndpPrice) || 0) * (Number(p.currentStock) || 0), 0);

    const upd = (id, val, isMoney) => {
      const el = document.getElementById(id);
      if (el) el.textContent = isMoney ? '₹' + Math.round(val).toLocaleString('en-IN') : Math.round(val).toLocaleString('en-IN');
    };
    upd('invh-kpi-total', kpiCardTotal, false);
    upd('invh-kpi-value', hKpiOnHandVal, true);
    upd('invh-kpi-oos', hKpiOos, false);
    upd('invh-kpi-low', hKpiLow, false);
    upd('invh-kpi-onhand', hKpiOnHandQty, false);
    upd('invh-kpi-onhand-val', hKpiOnHandVal, true);
    upd('invh-kpi-transit', hKpiTransit, false);
    upd('invh-kpi-transit-val', hKpiTransitVal, true);
    upd('invh-kpi-reserved', hKpiReserved, false);
    upd('invh-kpi-reserved-val', hKpiReservedVal, true);
    upd('invh-kpi-total-stock', kpiCardTotalStock, false);
    upd('invh-kpi-total-value', hKpiOnHandVal + hKpiTransitVal + hKpiReservedVal, true);
    upd('invh-kpi-lube', hKpiLubeQty, false);
    upd('invh-kpi-lube-val', hKpiLubeVal, true);
    
    const startIndex = (window.hCurrentPage - 1) * window.hItemsPerPage;
    const endIndex = Math.min(startIndex + window.hItemsPerPage, totalItems);
    const paginatedParts = displayParts.slice(startIndex, endIndex);

    if (tbody) {
      tbody.innerHTML = '';
      
      if (paginatedParts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-secondary);">No parts found matching criteria.</td></tr>';
      } else {
        paginatedParts.forEach(part => {
          const threshold = thresholdFor(part);
          let badgeClass = 'healthy';
          let badgeText = 'Healthy';
          if (part.currentStock === 0) {
            badgeClass = 'critical'; badgeText = 'Out of Stock';
          } else if (part.currentStock < threshold) {
            badgeClass = 'low'; badgeText = 'Low Stock';
          }
          
          const tr = document.createElement('tr');
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
          tbody.appendChild(tr);
        });
      }
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
    if(pageNumContainer) pageNumContainer.innerHTML = \`<span style="font-size: 0.85rem; font-weight: 500;">Page \${window.hCurrentPage} of \${totalPages}</span>\`;

    // --- Stock Ageing Summary ---`;

mainJS = mainJS.replace(regex, newFunction);
fs.writeFileSync('main.js', mainJS);
console.log('Fixed renderHealthTable successfully');
