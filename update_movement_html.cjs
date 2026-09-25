const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Add buttons
const buttonTarget = '<button id="movement-refresh-btn" class="btn btn-outline"><i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Refresh</button>';
const newButtons = `
                <button id="btn-open-inout-modal" class="btn btn-primary" style="background-color: var(--primary-color); color: white;"><i data-lucide="plus" style="width: 14px; height: 14px;"></i> Add Entry</button>
                <button id="btn-open-bulk-inout" class="btn btn-outline"><i data-lucide="upload" style="width: 14px; height: 14px;"></i> Bulk Upload</button>
                ${buttonTarget}
`;
html = html.replace(buttonTarget, newButtons);

// 2. Add Modal HTML (inject before closing </body> tag)
const modalHTML = `
  <!-- IN/OUT Entry Modal -->
  <div id="inout-entry-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
    <div style="background: white; width: 100%; max-width: 500px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 1.25rem;">Log Stock Movement</h3>
        <button id="btn-close-inout-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 6px;">Location</label>
          <select id="inout-location" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="">Select Location</option>
          </select>
        </div>
        
        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 6px;">Date</label>
          <input type="date" id="inout-date" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        
        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 6px;">Part Number</label>
          <select id="inout-part" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" disabled>
            <option value="">Select Location First</option>
          </select>
        </div>
        
        <div style="display: flex; gap: 16px;">
          <div style="flex: 1;">
            <label style="display: block; font-weight: 500; margin-bottom: 6px;">Movement Type</label>
            <select id="inout-type" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
              <option value="IN">IN (Receive)</option>
              <option value="OUT">OUT (Consume)</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label style="display: block; font-weight: 500; margin-bottom: 6px;">Quantity</label>
            <input type="number" id="inout-qty" min="1" value="1" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
          </div>
        </div>
        
        <div style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; color: #475569;">Available Qty:</span>
          <span id="inout-available-qty" style="font-weight: 700; font-size: 1.1rem; color: #0f172a;">-</span>
        </div>
        
        <div id="inout-error-msg" style="color: #ef4444; font-size: 0.9rem; display: none; margin-top: 5px;"></div>
        
        <button id="btn-submit-inout" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 600; margin-top: 10px;">Submit Movement</button>
      </div>
    </div>
  </div>

  <!-- Bulk Upload Modal -->
  <div id="inout-bulk-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
    <div style="background: white; width: 100%; max-width: 500px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 1.25rem;">Bulk IN/OUT Upload</h3>
        <button id="btn-close-bulk-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
      </div>
      <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">Upload an Excel (.xlsx) file to process multiple IN/OUT transactions at once.</p>
      
      <div style="margin-bottom: 20px;">
        <button id="btn-download-inout-template" class="btn btn-outline" style="width: 100%;">Download Excel Template</button>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; font-weight: 500; margin-bottom: 6px;">Select File</label>
        <input type="file" id="inout-bulk-file" accept=".xlsx, .xls, .csv" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      
      <div id="inout-bulk-error" style="color: #ef4444; font-size: 0.9rem; display: none; margin-bottom: 10px;"></div>
      <div id="inout-bulk-success" style="color: #10b981; font-size: 0.9rem; display: none; margin-bottom: 10px;"></div>
      
      <button id="btn-submit-bulk-inout" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 600;">Process Bulk Upload</button>
    </div>
  </div>
`;

if (!html.includes('inout-entry-modal')) {
  html = html.replace('</body>', modalHTML + '\n  <script src="movement_entry.js"></script>\n</body>');
  fs.writeFileSync('dashboard.html', html);
  console.log("Injected Modals into dashboard.html");
} else {
  console.log("Modals already present");
}
