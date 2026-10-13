const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const oldHeader = `<div class="view-header">
            <div>
              <h2>TATA Price List</h2>
              <p class="text-sm text-gray-500">Manage Master Price List for Parts</p>
            </div>
            <div class="header-actions">
              <div class="search-box">`;

const newHeader = `<div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px;">
            <div>
              <h2 style="margin: 0; font-size: 1.5rem; color: #0f172a;">TATA Price List</h2>
              <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.9rem;">Manage Master Price List for Parts</p>
            </div>
            <div class="header-actions">
              <div class="search-box" style="position: relative; display: flex; align-items: center;">`;

html = html.replace(oldHeader, newHeader);
fs.writeFileSync('dashboard.html', html);
console.log('Updated header layout');
