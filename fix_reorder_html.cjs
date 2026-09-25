const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// The new HTML
const reorderHtml = `
        <!-- REORDER MANAGEMENT VIEW -->
        <div id="view-orders" class="view-section" style="display: none;">
          <div class="dashboard-content">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
              <div>
                <h2 class="welcome-text">Reorder Control Tower</h2>
                <p style="color: var(--text-secondary); margin-bottom: 0;">Intelligent inventory replenishment, transfer opportunities, and stock risk analysis.</p>
              </div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="reorder-refresh-btn" class="btn btn-outline" onclick="window.initReorderModule()"><i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Refresh</button>
                <button id="reorder-export-btn" class="btn btn-outline"><i data-lucide="download" style="width: 14px; height: 14px;"></i> Export</button>
                <button id="reorder-basket-btn" class="btn btn-primary" style="background: #3b82f6; border:none; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="shopping-cart" style="width: 16px; height: 16px;"></i> Purchase Basket (<span id="reorder-basket-count">0</span>)
                </button>
              </div>
            </div>

            <!-- KPIs -->
            <div class="widget-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-bottom: 24px;">
              <div class="widget-card" style="border-left: 4px solid #f59e0b; cursor: pointer;" onclick="window.filterReorderKPI('REQUIRED')">
                <div class="widget-info">
                  <span class="widget-value" id="ro-kpi-required">0</span>
                  <span class="widget-label">Reorder Required</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #ef4444; cursor: pointer;" onclick="window.filterReorderKPI('CRITICAL')">
                <div class="widget-info">
                  <span class="widget-value" id="ro-kpi-critical">0</span>
                  <span class="widget-label">Critical Reorder</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #94a3b8; cursor: pointer;" onclick="window.filterReorderKPI('OUT_OF_STOCK')">
                <div class="widget-info">
                  <span class="widget-value" id="ro-kpi-out">0</span>
                  <span class="widget-label">Out of Stock</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #3b82f6;">
                <div class="widget-info">
                  <span class="widget-value" id="ro-kpi-qty">0</span>
                  <span class="widget-label">Suggested Order Qty</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #10b981;">
                <div class="widget-info">
                  <span class="widget-value" id="ro-kpi-val">₹0</span>
                  <span class="widget-label">Estimated Value</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #6366f1;">
                <div class="widget-info">
                  <span class="widget-value" id="ro-kpi-transfer">0</span>
                  <span class="widget-label">Transfer Opportunities</span>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px; background: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <select id="reorder-priority-filter" class="form-select" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">🔴 Critical</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="PLANNED">🟢 Planned</option>
                <option value="TRANSFER">🔄 Transfer Possible</option>
              </select>
              
              <select id="reorder-supplier-filter" class="form-select" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                <option value="ALL">All Suppliers</option>
              </select>

              <div style="flex-grow: 1;"></div>
              
              <button id="reorder-clear-filters" class="btn btn-outline" style="border:none; color:var(--text-secondary);"><i data-lucide="x" style="width:14px; height:14px;"></i> Clear Filters</button>
              <input type="text" id="reorder-search" placeholder="Search Part, Desc, Supplier..." style="padding: 8px 16px; border: 1px solid var(--border-color); border-radius: 20px; width: 300px;">
            </div>

            <!-- Main Table -->
            <div class="table-container" style="background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: auto; max-height: 600px;">
              <table style="width: 100%; border-collapse: collapse; min-width: 1400px;">
                <thead style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
                  <tr>
                    <th style="padding: 12px 16px; text-align: center; position: sticky; top: 0; background: #f8fafc; z-index: 2;"><input type="checkbox" id="ro-check-all"></th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Priority</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Part Details</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Location / Supplier</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Current Stock</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Min / Max</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Avg Cons/Day</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Days Stock</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Order Qty</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Reason / Risk</th>
                    <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #475569; position: sticky; top: 0; background: #f8fafc; z-index: 2;">Action</th>
                  </tr>
                </thead>
                <tbody id="reorder-table-body">
                </tbody>
              </table>
              <div id="reorder-pagination" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid var(--border-color);">
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Showing <span id="ro-page-info">0</span> recommendations</div>
                <div style="display: flex; gap: 8px;">
                  <button id="ro-prev-btn" class="btn btn-outline" style="padding: 6px 12px;">Prev</button>
                  <button id="ro-next-btn" class="btn btn-outline" style="padding: 6px 12px;">Next</button>
                </div>
              </div>
            </div>

            <!-- Supplier Summary View -->
            <div style="margin-top: 32px;">
              <h3 style="margin-bottom: 16px; font-size: 1.1rem; color: var(--text-primary);">Supplier Reorder Summary</h3>
              <div class="table-container" style="background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
                    <tr>
                      <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569;">Supplier</th>
                      <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569;">Parts to Order</th>
                      <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569;">Total Qty</th>
                      <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569;">Est Value</th>
                      <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569;">Critical Parts</th>
                    </tr>
                  </thead>
                  <tbody id="reorder-supplier-body">
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Data Notice -->
            <div style="margin-top: 24px; padding: 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <i data-lucide="alert-triangle" style="color: #f59e0b; width: 20px; height: 20px; flex-shrink: 0;"></i>
                <div>
                  <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 600; color: #b45309;">Data Availability Notice</h4>
                  <p style="margin: 0; font-size: 0.85rem; color: #92400e;">
                    The system is currently using Actual Inventory (Current, Min, Max) and Historical Consumption. Fields for <strong>Pending Demand</strong>, <strong>Open POs</strong>, and <strong>In Transit Qty</strong> do not currently exist in the database and are flagged as <em>INSUFFICIENT DATA</em> in calculations. 
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
`;

// Find view-orders and replace until next view-section
const startIndex = html.indexOf('<div id="view-orders"');
if (startIndex !== -1) {
  const nextSectionIndex = html.indexOf('<div id="view-', startIndex + 20);
  if (nextSectionIndex !== -1) {
    html = html.substring(0, startIndex) + reorderHtml + html.substring(nextSectionIndex);
  }
}

// Remove the wrongly injected view-reorder if it exists
if (html.includes('<div id="view-reorder"')) {
    html = html.replace(/<div id="view-reorder" class="view-section" style="display: none;">[\s\S]*?(?=<div id="view-)/, '');
}

fs.writeFileSync('dashboard.html', html, 'utf8');

// Now hook into main.js
let mainJs = fs.readFileSync('main.js', 'utf8');

// Hook view switching
if (!mainJs.includes('if (targetId === \'view-orders\' && typeof window.initReorderModule')) {
    mainJs = mainJs.replace(
      "document.getElementById(targetId).style.display = 'block';",
      "document.getElementById(targetId).style.display = 'block';\n    if (targetId === 'view-orders' && typeof window.initReorderModule === 'function') window.initReorderModule();"
    );
}

// Ensure initReorderModule runs on data load too
if (!mainJs.includes('if(typeof window.initReorderModule === "function") window.initReorderModule();')) {
    mainJs = mainJs.replace(
      "if(typeof window.initMovementModule === \"function\") window.initMovementModule();",
      "if(typeof window.initMovementModule === \"function\") window.initMovementModule();\n    if(typeof window.initReorderModule === \"function\") window.initReorderModule();"
    );
}

fs.writeFileSync('main.js', mainJs, 'utf8');
console.log('Fixed HTML and hooked main.js successfully.');
