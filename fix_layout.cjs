const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('dashboard.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const viewSettings = document.getElementById('view-settings');
const grid = viewSettings.querySelector('.dashboard-content > div[style*="grid"]');

if (grid) {
    // Get all cards
    const cards = Array.from(grid.querySelectorAll('.settings-card'));
    
    const claimsCard = cards.find(c => c.innerHTML.includes('Upload Claims Data'));
    const tataBiCard = cards.find(c => c.innerHTML.includes('Tata BI Portal Credentials'));
    const locationsCard = cards.find(c => c.innerHTML.includes('Dealership Locations'));
    const fetchLiveCard = cards.find(c => c.innerHTML.includes('Fetch Live Data'));
    const priceListCard = cards.find(c => c.innerHTML.includes('Price List Management'));
    const calculationsCard = cards.find(c => c.innerHTML.includes('Dashboard Calculations'));
    const invUploadCard = cards.find(c => c.innerHTML.includes('Inventory Manual Upload'));
    const consUploadCard = cards.find(c => c.innerHTML.includes('Consumption Manual Upload'));
    const userCard = cards.find(c => c.innerHTML.includes('Dashboard User Management'));
    
    // Clear the grid
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
    
    // Column 1
    const col1 = document.createElement('div');
    col1.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 20px; color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="database" style="color: #3b82f6;"></i> Data Management
      </h3>
    `;
    if (claimsCard) col1.appendChild(claimsCard);
    if (invUploadCard) col1.appendChild(invUploadCard);
    if (consUploadCard) col1.appendChild(consUploadCard);
    if (priceListCard) col1.appendChild(priceListCard);
    
    // Column 2
    const col2 = document.createElement('div');
    col2.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 20px; color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="settings" style="color: #f59e0b;"></i> System Configuration
      </h3>
    `;
    if (tataBiCard) col2.appendChild(tataBiCard);
    if (locationsCard) col2.appendChild(locationsCard);
    if (fetchLiveCard) col2.appendChild(fetchLiveCard);
    if (calculationsCard) col2.appendChild(calculationsCard);
    
    // Column 3
    const col3 = document.createElement('div');
    col3.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 20px; color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="shield-check" style="color: #10b981;"></i> Security & Access
      </h3>
    `;
    if (userCard) col3.appendChild(userCard);
    
    grid.appendChild(col1);
    grid.appendChild(col2);
    grid.appendChild(col3);
    
    fs.writeFileSync('dashboard.html', dom.serialize(), 'utf8');
    console.log("JSDOM Reorganization successful!");
} else {
    console.error("Grid not found");
}
