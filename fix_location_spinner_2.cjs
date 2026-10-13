const fs = require('fs');
let html = fs.readFileSync('main.js', 'utf8');

const targetIndex = html.indexOf('locSelect.addEventListener(\'change\', () => {');
if (targetIndex !== -1) {
    const endStr = '    });\n  }';
    const endIndex = html.indexOf(endStr, targetIndex);
    if (endIndex !== -1) {
        const oldBlock = html.substring(targetIndex, endIndex + endStr.length);
        
        const newBlock = `locSelect.addEventListener('change', () => {
      const loader = document.getElementById('loading-overlay');
      const detail = document.getElementById('loading-overlay-detail');
      if (loader) {
         loader.style.display = 'flex';
         if (detail) detail.textContent = 'Applying location filter...';
      }
      
      setTimeout(() => {
          renderDashboard();
          renderDashboardAnalytics();
          
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
  
        html = html.replace(oldBlock, newBlock);
        fs.writeFileSync('main.js', html);
        console.log('Successfully updated main.js');
    }
}
