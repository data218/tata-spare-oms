const fs = require('fs');
let lines = fs.readFileSync('main.js', 'utf8').split('\n');
let idx = lines.findIndex(l => l.startsWith('function renderPPNICharts'));
if (idx !== -1) {
  lines = lines.slice(0, idx);
  const newCode = `
window.ppniLocationChartInstance = null;
window.ppniYearChartInstance = null;
window.ppniMonthChartInstance = null;

function renderPPNICharts(locationSums, yearSums, monthSums) {
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

    if (pPrevBtn) {\n      pPrevBtn.addEventListener('click', () => {\n        if (window.pCurrentPage > 1) {\n          window.pCurrentPage--;\n          if(typeof window.renderPPNI === 'function') window.renderPPNI();\n        }\n      });\n    }

    if (pNextBtn) {\n      pNextBtn.addEventListener('click', () => {\n        window.pCurrentPage++;\n        if(typeof window.renderPPNI === 'function') window.renderPPNI();\n      });\n    }
  }, 1000);
});
`;
  lines.push(newCode);
  fs.writeFileSync('main.js', lines.join('\n'));
  console.log("Updated main.js successfully");
} else {
  console.log("Function not found");
}
