const fs = require('fs');

function fixLocationSelect(filename) {
    let js = fs.readFileSync(filename, 'utf8');

    const oldListener = `  const locSelect = document.getElementById('location-select');
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
  }`;
  
    const newListener = `  const locSelect = document.getElementById('location-select');
  if (locSelect) {
    locSelect.addEventListener('change', () => {
      const loader = document.getElementById('loading-overlay');
      const detail = document.getElementById('loading-overlay-detail');
      if (loader) {
         loader.style.display = 'flex';
         if (detail) detail.textContent = 'Applying location filter...';
      }
      
      // Yield main thread to allow UI to show loader
      setTimeout(() => {
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
          
          if (loader) loader.style.display = 'none';
      }, 50);
    });
  }`;
  
    if (js.includes(oldListener)) {
        js = js.replace(oldListener, newListener);
        fs.writeFileSync(filename, js);
        console.log(`Updated location listener in ${filename}`);
    }
}

fixLocationSelect('main.js');
fixLocationSelect('main_debug.js');
