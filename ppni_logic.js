// --- PPNI Logic ---
window.pCurrentPage = 1;
window.pItemsPerPage = 100;
window.pSearchQuery = '';

window.ppniAgeingChartInstance = null;
window.ppniMonthChartInstance = null;
window.ppniCategoryChartInstance = null;

window.renderPPNI = function() {
  const tbody = document.getElementById('ppni-table-body');
  if (!tbody) return;

  // Filter to parts that are actually in stock
  const allParts = window.filteredProcessedParts || window.originalProcessedParts || [];
  let ppniParts = allParts.filter(p => p.currentStock > 0);

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
  
  let ageBuckets = {
    '0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0
  };
  
  let monthSums = {}; // Format: "YYYY-MM"

  ppniParts.forEach(p => {
    totalValue += (p.stockValue || 0);
    if (p.ageingDays > maxAge) maxAge = p.ageingDays;
    
    let cat = p.productCategory || 'Uncategorized';
    catSums[cat] = (catSums[cat] || 0) + (p.stockValue || 0);

    // Ageing Buckets
    if (p.ageingDays >= 0) {
      if (p.ageingDays <= 30) ageBuckets['0-30'] += p.stockValue;
      else if (p.ageingDays <= 60) ageBuckets['31-60'] += p.stockValue;
      else if (p.ageingDays <= 90) ageBuckets['61-90'] += p.stockValue;
      else if (p.ageingDays <= 180) ageBuckets['91-180'] += p.stockValue;
      else ageBuckets['180+'] += p.stockValue;
    }

    // Month Wise
    if (p.last_receipt) {
      let d = window.parseTataDate ? window.parseTataDate(p.last_receipt) : new Date(p.last_receipt);
      if (d && !isNaN(d)) {
        let ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0');
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
  renderPPNICharts(ageBuckets, monthSums, catSums);

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
      let lrText = part.last_receipt ? (window.parseTataDate && window.parseTataDate(part.last_receipt) ? window.parseTataDate(part.last_receipt).toLocaleDateString('en-IN') : 'N/A') : 'N/A';
      let ageText = part.ageingDays >= 0 ? `${part.ageingDays} Days` : 'N/A';
      let badgeClass = part.ageingDays > 180 ? 'critical' : (part.ageingDays > 90 ? 'low' : 'healthy');
      
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 8px 12px; font-weight: 500;">${part.partId}</td>
        <td style="padding: 8px 12px; color: var(--text-secondary);">${part.model}</td>
        <td style="padding: 8px 12px;">${part.location || 'Narwal'}</td>
        <td style="padding: 8px 12px;">${part.productCategory || 'N/A'}</td>
        <td style="padding: 8px 12px;"><span class="h-badge ${badgeClass}">${ageText}</span></td>
        <td style="padding: 8px 12px;">${lrText}</td>
        <td style="padding: 8px 12px; text-align: center; font-weight: bold;">${part.currentStock}</td>
        <td style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 500;">₹${(part.stockValue||0).toLocaleString('en-IN')}</td>
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
  if(pageNumContainer) pageNumContainer.innerHTML = `<span style="font-size: 0.85rem; font-weight: 500;">Page ${window.pCurrentPage} of ${totalPages}</span>`;
};

function renderPPNICharts(ageBuckets, monthSums, catSums) {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.set('plugins.datalabels', { display: false });

  // 1. Ageing Chart
  const ageCtx = document.getElementById('ppni-ageing-chart');
  if (ageCtx) {
    if (window.ppniAgeingChartInstance) window.ppniAgeingChartInstance.destroy();
    window.ppniAgeingChartInstance = new Chart(ageCtx, {
      type: 'doughnut',
      data: {
        labels: ['0-30 Days', '31-60 Days', '61-90 Days', '91-180 Days', '180+ Days'],
        datasets: [{
          data: [
            ageBuckets['0-30'], ageBuckets['31-60'], ageBuckets['61-90'], 
            ageBuckets['91-180'], ageBuckets['180+']
          ],
          backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-primary') } },
          tooltip: {
            callbacks: {
              label: function(ctx) { return ' ₹' + (ctx.raw || 0).toLocaleString('en-IN', {maximumFractionDigits:0}); }
            }
          }
        }
      }
    });
  }

  // 2. Month Chart (Sort keys chronologically)
  const monthCtx = document.getElementById('ppni-month-chart');
  if (monthCtx) {
    if (window.ppniMonthChartInstance) window.ppniMonthChartInstance.destroy();
    const sortedMonths = Object.keys(monthSums).sort();
    const mData = sortedMonths.map(m => monthSums[m]);
    
    // Convert YYYY-MM to MMM YY
    const mLabels = sortedMonths.map(m => {
      const parts = m.split('-');
      const d = new Date(parts[0], parseInt(parts[1])-1, 1);
      return d.toLocaleDateString('en-US', {month:'short', year:'2-digit'});
    });

    window.ppniMonthChartInstance = new Chart(monthCtx, {
      type: 'bar',
      data: {
        labels: mLabels,
        datasets: [{
          label: 'Value (₹)',
          data: mData,
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
          },
          x: { 
            grid: { display: false },
            ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) { return ' ₹' + (ctx.raw || 0).toLocaleString('en-IN', {maximumFractionDigits:0}); }
            }
          }
        }
      }
    });
  }

  // 3. Category Chart
  const catCtx = document.getElementById('ppni-category-chart');
  if (catCtx) {
    if (window.ppniCategoryChartInstance) window.ppniCategoryChartInstance.destroy();
    // Sort categories by value desc, take top 10
    const sortedCats = Object.entries(catSums).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const cLabels = sortedCats.map(c => c[0].length > 15 ? c[0].substring(0, 15)+'...' : c[0]);
    const cData = sortedCats.map(c => c[1]);

    window.ppniCategoryChartInstance = new Chart(catCtx, {
      type: 'bar',
      data: {
        labels: cLabels,
        datasets: [{
          label: 'Value (₹)',
          data: cData,
          backgroundColor: '#8b5cf6',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { 
            beginAtZero: true, 
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
          },
          y: { 
            grid: { display: false },
            ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) { return ' ₹' + (ctx.raw || 0).toLocaleString('en-IN', {maximumFractionDigits:0}); }
            }
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
  }, 1000); // give time for DOM to be ready
});
