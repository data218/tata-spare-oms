const fs = require('fs');
let content = fs.readFileSync('main.js', 'utf8');

const target = `    upd('invh-kpi-oos', hKpiOos, false);
    upd('invh-kpi-low', hKpiLow, false);
    upd('invh-kpi-onhand', hKpiOnHandQty, false);

    if(prevBtn) prevBtn.disabled = window.hCurrentPage === 1;`;

const replacement = `    upd('invh-kpi-oos', hKpiOos, false);
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

    const tbody = document.getElementById('health-table-body');
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

    const startEl = document.getElementById('h-page-start');
    const endEl = document.getElementById('h-page-end');
    const totalEl = document.getElementById('h-total-parts');
    const prevBtn = document.getElementById('h-prev-page-btn');
    const nextBtn = document.getElementById('h-next-page-btn');
    const pageNumContainer = document.getElementById('h-page-numbers');
    
    if(startEl) startEl.textContent = totalItems === 0 ? 0 : startIndex + 1;
    if(endEl) endEl.textContent = endIndex;
    if(totalEl) totalEl.textContent = totalItems;

    if(prevBtn) prevBtn.disabled = window.hCurrentPage === 1;`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('main.js', content);
  console.log('Fixed main.js successfully');
} else {
  console.log('Target not found in main.js');
}
