const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// Find the start and end of view-dashboard
const startStr = '<div id="view-dashboard" class="view-section" style="display: none;">';
const endStr = '<!-- INVENTORY VIEW -->';

const startIndex = html.indexOf(startStr);
const endIndex = html.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find boundaries for view-dashboard!");
  process.exit(1);
}

const newDashboardHtml = `
        <!-- DASHBOARD VIEW -->
        <div id="view-dashboard" class="view-section" style="display: none;">
          <div class="dashboard-content" style="background: #f1f5f9; padding: 20px; max-width: 1600px; margin: 0 auto;">
            
            <!-- MISSING DATA ALERT (Keep this) -->
            <div id="missing-data-alert" style="display: none; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin-bottom: 20px; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <i data-lucide="alert-triangle" style="color: #ef4444; width: 24px; height: 24px;"></i>
                <div>
                  <h4 style="margin: 0; color: #ef4444; font-size: 1rem; font-weight: 600;">Action Required: Inventory Data Not Uploaded</h4>
                  <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.85rem;">The daily inventory location data for today has not been uploaded by the 10:00 AM deadline. Please upload the data manually to ensure dashboard accuracy.</p>
                </div>
              </div>
              <button id="btn-upload-missing-data" class="btn btn-primary" style="background-color: #ef4444; border-color: #ef4444;">Upload Manually</button>
            </div>

            <!-- GLOBAL FILTERS BAR -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; background: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <span style="font-weight: 600; font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Global Filters</span>
              <select id="mgmt-filter-category" style="padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.85rem; color: #0f172a;">
                <option value="ALL">All Categories</option>
              </select>
              <button id="mgmt-filter-clear" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.85rem; font-weight: 600; margin-left: auto;">Clear All Filters</button>
            </div>

            <!-- 1. EXECUTIVE KPI STRIP -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
              <div class="mgmt-kpi-card" style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #3b82f6; cursor: pointer;" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()">
                <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Inventory Value</div>
                <div id="mgmt-kpi-inv-value" style="font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-top: 8px;">₹0</div>
              </div>
              <div class="mgmt-kpi-card" style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #10b981; cursor: pointer;" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()">
                <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Available Stock</div>
                <div id="mgmt-kpi-avail-stock" style="font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-top: 8px;">0</div>
              </div>
              <div class="mgmt-kpi-card" style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #ef4444; cursor: pointer;" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()">
                <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Critical Stock (Parts)</div>
                <div id="mgmt-kpi-crit-stock" style="font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-top: 8px;">0</div>
              </div>
              <div class="mgmt-kpi-card" style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #94a3b8; cursor: pointer;" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()">
                <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Non-Moving Value</div>
                <div id="mgmt-kpi-non-moving" style="font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-top: 8px;">₹0</div>
              </div>
            </div>

            <!-- 2. ACTION REQUIRED TODAY -->
            <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 24px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div style="background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0; font-size: 1.1rem; color: #0f172a; display: flex; align-items: center; gap: 8px;"><i data-lucide="bell" style="width: 18px; color: #ef4444;"></i> ACTION REQUIRED TODAY</h3>
              </div>
              <div id="mgmt-action-required" style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- 3. INVENTORY POSITION & STOCK RISK -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-bottom: 24px;">
              
              <!-- Inventory Position -->
              <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 20px 0; font-size: 1.1rem; color: #0f172a;">Inventory Position</h3>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                    <span style="color: #64748b; font-weight: 500;">Total Inventory Value</span>
                    <strong id="mgmt-pos-total" style="color: #0f172a; font-size: 1.1rem;">₹0</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                    <span style="color: #64748b; font-weight: 500;">Available Value</span>
                    <strong id="mgmt-pos-avail" style="color: #10b981; font-size: 1.1rem;">₹0</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                    <span style="color: #64748b; font-weight: 500;">Reserved Value</span>
                    <strong id="mgmt-pos-reserved" style="color: #f59e0b; font-size: 1.1rem;">₹0</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding-bottom: 10px;">
                    <span style="color: #64748b; font-weight: 500;">Non-Moving Value (Blocked Capital)</span>
                    <strong id="mgmt-pos-nonmoving" style="color: #ef4444; font-size: 1.1rem;">₹0</strong>
                  </div>
                </div>
              </div>

              <!-- Stock Risk Matrix -->
              <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 20px 0; font-size: 1.1rem; color: #0f172a;">Stock Risk Matrix</h3>
                <div style="position: relative; height: 200px; width: 100%;">
                  <canvas id="mgmtStockRiskChart"></canvas>
                </div>
              </div>

            </div>

            <!-- 4. FOUR COLUMNS: DEMAND, FULFILLMENT, PROCUREMENT, RECEIVING -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
              <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
                <h4 style="margin: 0 0 12px 0; color: #64748b; font-size: 0.9rem; text-transform: uppercase;">Demand (Pending)</h4>
                <div style="font-size: 1.1rem; font-weight: 700; color: #94a3b8; padding: 20px 0;">DATA NOT AVAILABLE</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
                <h4 style="margin: 0 0 12px 0; color: #64748b; font-size: 0.9rem; text-transform: uppercase;">Fulfillment %</h4>
                <div style="font-size: 1.1rem; font-weight: 700; color: #94a3b8; padding: 20px 0;">DATA NOT AVAILABLE</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
                <h4 style="margin: 0 0 12px 0; color: #64748b; font-size: 0.9rem; text-transform: uppercase;">Procurement (Open PO)</h4>
                <div style="font-size: 1.1rem; font-weight: 700; color: #94a3b8; padding: 20px 0;">DATA NOT AVAILABLE</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
                <h4 style="margin: 0 0 12px 0; color: #64748b; font-size: 0.9rem; text-transform: uppercase;">Receiving (Delayed)</h4>
                <div style="font-size: 1.1rem; font-weight: 700; color: #94a3b8; padding: 20px 0;">DATA NOT AVAILABLE</div>
              </div>
            </div>

            <!-- 5. REORDER & LOCATION COMPARISON -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-bottom: 24px;">
              <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                  <h3 style="margin: 0; font-size: 1.1rem; color: #0f172a;">Reorder Control</h3>
                  <button onclick="document.querySelector('[data-target=\\'view-orders\\']').click()" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Manage Reorders →</button>
                </div>
                <div id="mgmt-reorder-summary" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div style="padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;">
                    <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 4px;">Critical Reorder Parts</div>
                    <div id="mgmt-ro-critical" style="font-size: 1.3rem; font-weight: 700; color: #ef4444;">0</div>
                  </div>
                  <div style="padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;">
                    <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 4px;">Estimated Order Value</div>
                    <div id="mgmt-ro-value" style="font-size: 1.3rem; font-weight: 700; color: #3b82f6;">₹0</div>
                  </div>
                </div>
              </div>
              <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 20px 0; font-size: 1.1rem; color: #0f172a;">Location Comparison</h3>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;" id="mgmt-location-table">
                    <thead>
                      <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                        <th style="padding: 8px 4px; font-weight: 600;">Location</th>
                        <th style="padding: 8px 4px; text-align: right; font-weight: 600;">Inv Value</th>
                        <th style="padding: 8px 4px; text-align: right; font-weight: 600;">Critical Parts</th>
                        <th style="padding: 8px 4px; text-align: right; font-weight: 600;">Non-Moving Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- Dynamic -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- 6. INVENTORY AGEING & CRITICAL TABLES -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-bottom: 24px;">
              
              <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 20px 0; font-size: 1.1rem; color: #0f172a;">Inventory Ageing (Capital Blocked)</h3>
                <div id="mgmt-ageing-summary" style="display: flex; flex-direction: column; gap: 12px;">
                  <!-- Dynamic -->
                </div>
              </div>

              <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                  <h3 style="margin: 0; font-size: 1.1rem; color: #0f172a;">Critical Stock Exceptions</h3>
                  <button onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 0.85rem; font-weight: 600;">View All →</button>
                </div>
                <div style="overflow-x: auto; max-height: 250px; overflow-y: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;" id="mgmt-critical-table">
                    <thead style="position: sticky; top: 0; background: white;">
                      <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                        <th style="padding: 8px 4px; font-weight: 600;">Part No</th>
                        <th style="padding: 8px 4px; font-weight: 600;">Location</th>
                        <th style="padding: 8px 4px; text-align: right; font-weight: 600;">Stock</th>
                        <th style="padding: 8px 4px; text-align: right; font-weight: 600;">Req</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- Dynamic -->
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <!-- 7. MANAGEMENT INSIGHTS -->
            <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 40px;">
              <h3 style="margin: 0 0 20px 0; font-size: 1.1rem; color: #0f172a; display: flex; align-items: center; gap: 8px;"><i data-lucide="lightbulb" style="width: 18px; color: #f59e0b;"></i> MANAGEMENT INSIGHTS</h3>
              <ul id="mgmt-insights-list" style="margin: 0; padding-left: 20px; color: #334155; font-size: 0.95rem; line-height: 1.8;">
                <li>Loading insights...</li>
              </ul>
            </div>

          </div>
        </div>
        `;

html = html.substring(0, startIndex) + newDashboardHtml + html.substring(endIndex);

fs.writeFileSync('dashboard.html', html);
console.log('Successfully updated dashboard.html');
