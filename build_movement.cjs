const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// Replace sidebar nav
html = html.replace(
  '<a href="#" class="nav-item" data-target="view-fulfillment">\n            <i data-lucide="truck"></i>\n            <span>Parts Fulfillment</span>\n          </a>',
  '<a href="#" class="nav-item" data-target="view-movement">\n            <i data-lucide="arrow-left-right"></i>\n            <span>IN / OUT Movement</span>\n          </a>'
);

const movementHtml = `
        <!-- MOVEMENT VIEW -->
        <div id="view-movement" class="view-section" style="display: none;">
          <div class="dashboard-content">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
              <div>
                <h2 class="welcome-text">Inventory IN / OUT</h2>
                <p style="color: var(--text-secondary); margin-bottom: 0;">Track every stock receipt, issue, transfer, return and adjustment.</p>
              </div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="movement-refresh-btn" class="btn btn-outline"><i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Refresh</button>
                <button id="movement-export-btn" class="btn btn-outline"><i data-lucide="download" style="width: 14px; height: 14px;"></i> Export</button>
                <select id="movement-date-filter" class="form-select" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30" selected>Last 30 Days</option>
                  <option value="thismonth">This Month</option>
                </select>
              </div>
            </div>

            <!-- KPIs -->
            <div class="widget-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 24px;">
              <div class="widget-card" style="border-left: 4px solid #10b981;">
                <div class="widget-info">
                  <span class="widget-value" id="mov-kpi-in">0</span>
                  <span class="widget-label">Total IN</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #ef4444;">
                <div class="widget-info">
                  <span class="widget-value" id="mov-kpi-out">0</span>
                  <span class="widget-label">Total OUT</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #3b82f6;">
                <div class="widget-info">
                  <span class="widget-value" id="mov-kpi-net">0</span>
                  <span class="widget-label">Net Movement</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #10b981;">
                <div class="widget-info">
                  <span class="widget-value" id="mov-kpi-in-val">₹0</span>
                  <span class="widget-label">IN Value</span>
                </div>
              </div>
              <div class="widget-card" style="border-left: 4px solid #ef4444;">
                <div class="widget-info">
                  <span class="widget-value" id="mov-kpi-out-val">₹0</span>
                  <span class="widget-label">OUT Value</span>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px; background: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="font-weight: 600; color: var(--text-primary);">View:</div>
              <div class="toggle-group" id="movement-toggle" style="display: flex; background: #f1f5f9; border-radius: 6px; padding: 4px;">
                <button class="toggle-btn active" data-type="ALL" style="border: none; background: white; padding: 6px 16px; border-radius: 4px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer;">ALL</button>
                <button class="toggle-btn" data-type="IN" style="border: none; background: transparent; padding: 6px 16px; border-radius: 4px; font-weight: 500; color: var(--text-secondary); cursor: pointer;">IN</button>
                <button class="toggle-btn" data-type="OUT" style="border: none; background: transparent; padding: 6px 16px; border-radius: 4px; font-weight: 500; color: var(--text-secondary); cursor: pointer;">OUT</button>
              </div>
              <div style="flex-grow: 1;"></div>
              <input type="text" id="movement-search" placeholder="Search transactions..." style="padding: 8px 16px; border: 1px solid var(--border-color); border-radius: 20px; width: 300px;">
            </div>

            <div class="table-container" style="background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; min-width: 1000px;">
                <thead style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
                  <tr>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0;">Date</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0;">Direction</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0;">Type</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0;">Part No</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0;">Description</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0;">Location</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; position: sticky; top: 0;">Qty</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; position: sticky; top: 0;">Value</th>
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; position: sticky; top: 0;">Reference</th>
                  </tr>
                </thead>
                <tbody id="movement-table-body">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
              <div id="movement-pagination" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid var(--border-color);">
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Showing <span id="mov-page-info">0</span> records</div>
                <div style="display: flex; gap: 8px;">
                  <button id="mov-prev-btn" class="btn btn-outline" style="padding: 6px 12px;">Prev</button>
                  <button id="mov-next-btn" class="btn btn-outline" style="padding: 6px 12px;">Next</button>
                </div>
              </div>
            </div>

            <!-- Reconciliation Alerts -->
            <div id="reconciliation-alerts" style="margin-top: 24px;"></div>

          </div>
        </div>
`;

html = html.replace(
  /<!-- PARTS FULFILLMENT VIEW -->[\s\S]*?(?=<!-- SETTINGS VIEW -->)/,
  movementHtml + '\n\n        '
);

fs.writeFileSync('dashboard.html', html, 'utf8');
console.log('dashboard.html updated for IN/OUT movement');
