// management_dashboard.js

// This overrides the original renderDashboardAnalytics in main.js
window.renderDashboardAnalytics = function() {
  if (!window.originalProcessedParts || window.originalProcessedParts.length === 0) return;

  const parts = window.filteredProcessedParts || window.originalProcessedParts;
  
  // Calculate Executive KPIs
  let totalInvValue = 0;
  let availableStock = 0;
  let inTransit = 0;
  let criticalStockCount = 0;
  let nonMovingValue = 0;
  
  const locationStats = {};
  const ageingStats = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const criticalExceptions = [];

  const now = new Date();

  parts.forEach(p => {
    const stock = parseFloat(p.currentStock) || 0;
    const transit = parseFloat(p.inTransit) || 0;
    const price = parseFloat(p.ndpPrice) || 0;
    const min = parseFloat(p.min) || 0;
    const val = stock * price;

    totalInvValue += val;
    availableStock += stock;
    inTransit += transit;

    // Location grouping
    if (!locationStats[p.location]) {
      locationStats[p.location] = { invValue: 0, criticalCount: 0, nonMovingValue: 0 };
    }
    locationStats[p.location].invValue += val;

    // Critical Stock
    if (stock <= min && min > 0) {
      criticalStockCount++;
      locationStats[p.location].criticalCount++;
      criticalExceptions.push({ partId: p.partId, location: p.location, stock, min, shortage: min - stock });
    }

    // Ageing / Non-Moving
    if (p.last_receipt) {
       const receiptDate = new Date(p.last_receipt);
       const daysOld = Math.floor((now - receiptDate) / (1000 * 60 * 60 * 24));
       if (daysOld <= 30) ageingStats['0-30'] += val;
       else if (daysOld <= 60) ageingStats['31-60'] += val;
       else if (daysOld <= 90) ageingStats['61-90'] += val;
       else {
         ageingStats['90+'] += val;
         nonMovingValue += val;
         locationStats[p.location].nonMovingValue += val;
       }
    } else {
       // If no receipt date but has stock, consider it non-moving 90+
       if (stock > 0) {
         ageingStats['90+'] += val;
         nonMovingValue += val;
         locationStats[p.location].nonMovingValue += val;
       }
    }
  });

  // 1. Update Executive KPI Strip
  if (document.getElementById('mgmt-kpi-inv-value')) document.getElementById('mgmt-kpi-inv-value').textContent = '₹' + Math.round(totalInvValue).toLocaleString('en-IN');
  if (document.getElementById('mgmt-kpi-avail-stock')) document.getElementById('mgmt-kpi-avail-stock').textContent = availableStock.toLocaleString('en-IN');
  if (document.getElementById('mgmt-kpi-transit')) document.getElementById('mgmt-kpi-transit').textContent = inTransit.toLocaleString('en-IN');
  if (document.getElementById('mgmt-kpi-crit-stock')) document.getElementById('mgmt-kpi-crit-stock').textContent = criticalStockCount.toLocaleString('en-IN');
  if (document.getElementById('mgmt-kpi-non-moving')) document.getElementById('mgmt-kpi-non-moving').textContent = '₹' + Math.round(nonMovingValue).toLocaleString('en-IN');
  
  // 3. Update Inventory Position
  if (document.getElementById('mgmt-pos-total')) document.getElementById('mgmt-pos-total').textContent = '₹' + Math.round(totalInvValue).toLocaleString('en-IN');
  if (document.getElementById('mgmt-pos-avail')) document.getElementById('mgmt-pos-avail').textContent = '₹' + Math.round(totalInvValue).toLocaleString('en-IN'); // Assuming all available
  if (document.getElementById('mgmt-pos-reserved')) document.getElementById('mgmt-pos-reserved').textContent = '₹0';
  if (document.getElementById('mgmt-pos-nonmoving')) document.getElementById('mgmt-pos-nonmoving').textContent = '₹' + Math.round(nonMovingValue).toLocaleString('en-IN');


  // Populate Location Table
  const locTable = document.querySelector('#mgmt-location-table tbody');
  if (locTable) {
    locTable.innerHTML = '';
    Object.keys(locationStats).forEach(loc => {
      const st = locationStats[loc];
      locTable.innerHTML += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 4px; font-weight: 500; color: #0f172a;">${loc}</td>
          <td style="padding: 10px 4px; text-align: right; color: #0f172a; font-weight: 500;">₹${Math.round(st.invValue).toLocaleString('en-IN')}</td>
          <td style="padding: 10px 4px; text-align: right; color: ${st.criticalCount > 0 ? '#ef4444' : '#10b981'}; font-weight: 500;">${st.criticalCount}</td>
          <td style="padding: 10px 4px; text-align: right; color: #64748b;">₹${Math.round(st.nonMovingValue).toLocaleString('en-IN')}</td>
        </tr>
      `;
    });
  }

  // Populate Critical Exceptions Table
  const critTable = document.querySelector('#mgmt-critical-table tbody');
  if (critTable) {
    critTable.innerHTML = '';
    criticalExceptions.slice(0, 15).forEach(c => {
      critTable.innerHTML += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 4px; color: #3b82f6; font-weight: 600;">${c.partId}</td>
          <td style="padding: 10px 4px;">${c.location}</td>
          <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #ef4444;">${c.stock}</td>
          <td style="padding: 10px 4px; text-align: right; color: #64748b; font-weight: 600;">${c.min}</td>
        </tr>
      `;
    });
    if (criticalExceptions.length === 0) {
       critTable.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#64748b;">No critical stockouts</td></tr>';
    }
  }

  // Populate Action Required
  const actionDiv = document.getElementById('mgmt-action-required');
  if (actionDiv) {
    let actionsHTML = '';
    if (criticalStockCount > 0) {
      actionsHTML += `
        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()">
           <h4 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 0.95rem; display: flex; align-items: center; gap:6px;"><i data-lucide="alert-circle" style="width:16px;"></i> Critical Stockouts</h4>
           <p style="margin: 0; font-size: 0.85rem; color: #991b1b;">${criticalStockCount} parts are below minimum threshold.</p>
        </div>
      `;
    }
    if (nonMovingValue > totalInvValue * 0.1 && nonMovingValue > 0) {
      actionsHTML += `
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()">
           <h4 style="margin: 0 0 8px 0; color: #b45309; font-size: 0.95rem; display: flex; align-items: center; gap:6px;"><i data-lucide="alert-triangle" style="width:16px;"></i> High Capital Blockage</h4>
           <p style="margin: 0; font-size: 0.85rem; color: #92400e;">₹${Math.round(nonMovingValue).toLocaleString('en-IN')} is locked in 90+ days non-moving inventory.</p>
        </div>
      `;
    }
    
    if (actionsHTML === '') {
      actionsHTML = `<div style="color: #10b981; font-weight: 500; font-size: 0.9rem; padding: 10px;">No critical actions required today.</div>`;
    }
    actionDiv.innerHTML = actionsHTML;
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  // Populate Ageing Summary
  const ageingDiv = document.getElementById('mgmt-ageing-summary');
  if (ageingDiv) {
     const maxVal = Math.max(...Object.values(ageingStats), 1);
     ageingDiv.innerHTML = Object.keys(ageingStats).map(k => {
       const v = ageingStats[k];
       const pct = (v / maxVal) * 100;
       const color = k === '90+' ? '#ef4444' : (k === '61-90' ? '#f59e0b' : '#3b82f6');
       return `
         <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px;">
           <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
             <span style="color: #64748b; font-weight: 600;">${k} Days</span>
             <span style="font-weight: 700; color: #0f172a;">₹${Math.round(v).toLocaleString('en-IN')}</span>
           </div>
           <div style="width: 100%; background: #e2e8f0; border-radius: 4px; height: 10px; overflow: hidden;">
             <div style="width: ${pct}%; background: ${color}; height: 100%; border-radius: 4px;"></div>
           </div>
         </div>
       `;
     }).join('');
  }

  // Reorder Summary
  if (window.reorderData) {
     let roCount = 0;
     let roValue = 0;
     window.reorderData.forEach(r => {
        if (r.recQty > 0) {
           roCount++;
           roValue += r.recQty * (parseFloat(r.cost) || 0);
        }
     });
     if (document.getElementById('mgmt-ro-critical')) document.getElementById('mgmt-ro-critical').textContent = roCount;
     if (document.getElementById('mgmt-ro-value')) document.getElementById('mgmt-ro-value').textContent = '₹' + Math.round(roValue).toLocaleString('en-IN');
  }

  // Management Insights
  const insightsList = document.getElementById('mgmt-insights-list');
  if (insightsList) {
     let insightsHTML = '';
     if (nonMovingValue > 0) {
        insightsHTML += `<li><strong>Capital Efficiency:</strong> You have ₹${Math.round(nonMovingValue).toLocaleString('en-IN')} blocked in non-moving stock over 90 days. Liquidating 20% of this could free up ₹${Math.round(nonMovingValue * 0.2).toLocaleString('en-IN')}.</li>`;
     }
     if (criticalStockCount > 0) {
        insightsHTML += `<li><strong>Service Level Risk:</strong> ${criticalStockCount} critical parts are out of stock or below minimums, risking fulfillment delays.</li>`;
     }
     if (inTransit > 0) {
        insightsHTML += `<li><strong>Inbound Pipeline:</strong> ${inTransit} units are currently in transit, which may alleviate some critical stockouts soon.</li>`;
     }
     if (insightsHTML === '') {
        insightsHTML = `<li>Inventory levels are healthy across all metrics.</li>`;
     }
     insightsList.innerHTML = insightsHTML;
  }

  // Draw Stock Risk Chart
  drawStockRiskChart(parts);
};

function drawStockRiskChart(parts) {
  const canvas = document.getElementById('mgmtStockRiskChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (window.mgmtStockRiskChartInstance) {
     window.mgmtStockRiskChartInstance.destroy();
  }

  // Scatter plot data: x = Stock, y = Consumption
  // We take a sample or top items to not overload the chart
  const scatterData = parts
    .filter(p => p.currentStock > 0 || p.consumption30d > 0)
    .sort((a,b) => b.consumption30d - a.consumption30d)
    .slice(0, 300) // top 300 movers
    .map(p => ({
       x: parseFloat(p.currentStock) || 0,
       y: parseFloat(p.consumption30d) || 0,
       partId: p.partId,
       min: parseFloat(p.min) || 0
    }));

  window.mgmtStockRiskChartInstance = new Chart(canvas.getContext('2d'), {
     type: 'scatter',
     data: {
        datasets: [{
           label: 'Parts Risk',
           data: scatterData,
           backgroundColor: function(context) {
              const val = context.raw;
              if (!val) return '#3b82f6';
              // High cons, low stock = red (risk)
              if (val.y > 10 && val.x <= val.min) return '#ef4444';
              // Low cons, high stock = orange (excess)
              if (val.y <= 2 && val.x > val.min * 3) return '#f59e0b';
              return 'rgba(59, 130, 246, 0.6)'; // normal
           },
           borderColor: 'rgba(255,255,255,0.5)',
           borderWidth: 1,
           pointRadius: 5,
           pointHoverRadius: 7
        }]
     },
     options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
           legend: { display: false },
           datalabels: { display: false }, // turn off data labels for scatter
           tooltip: {
              callbacks: {
                 label: function(ctx) {
                    const raw = ctx.raw;
                    return `Part: ${raw.partId} | Stock: ${raw.x} | Cons 30d: ${raw.y}`;
                 }
              }
           }
        },
        scales: {
           x: { 
              title: { display: true, text: 'Current Stock Qty', font: { weight: 'bold' } },
              grid: { color: '#f1f5f9' }
           },
           y: { 
              title: { display: true, text: 'Avg 30d Consumption', font: { weight: 'bold' } },
              grid: { color: '#f1f5f9' }
           }
        }
     }
  });
}
