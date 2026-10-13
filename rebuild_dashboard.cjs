const fs = require('fs');

const html = fs.readFileSync('dashboard.html', 'utf8');
const lines = html.split('\n');
const start = lines.findIndex(l => l.includes('<div id="view-dashboard"'));
const end = lines.findIndex((l, i) => i > start && l.includes('<!-- INVENTORY VIEW -->'));

console.log('Start:', start, 'End:', end);

if (start === -1 || end === -1) {
    console.error('Could not find boundaries');
    process.exit(1);
}

const newDashboardView = `
        <!-- DASHBOARD VIEW (Analyzer Mode) -->
        <div id="view-dashboard" class="view-section" style="display: none;">
          <div class="dashboard-content" style="background: #f8fafc; padding: 24px; max-width: 1600px; margin: 0 auto; font-family: 'Roboto', sans-serif;">
            
            <!-- MISSING DATA ALERT -->
            <div id="missing-data-alert" style="display: none; background: linear-gradient(to right, rgba(239, 68, 68, 0.1), transparent); border-left: 4px solid #ef4444; padding: 16px 24px; border-radius: 8px; margin-bottom: 24px; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(239, 68, 68, 0.05);">
              <div style="display: flex; align-items: center; gap: 16px;">
                <i data-lucide="alert-triangle" style="color: #ef4444; width: 28px; height: 28px; filter: drop-shadow(0 2px 4px rgba(239,68,68,0.3));"></i>
                <div>
                  <h4 style="margin: 0 0 6px 0; color: #ef4444; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.5px;">Action Required: Inventory Data Missing</h4>
                  <p style="margin: 0; color: #475569; font-size: 0.9rem;">The daily inventory location data for today has not been uploaded. Please upload the data to ensure accuracy.</p>
                </div>
              </div>
              <button id="btn-upload-missing-data" class="btn btn-primary" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: none; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); font-weight: 600; padding: 10px 20px; border-radius: 20px;">Upload Data</button>
            </div>

            <!-- GLOBAL FILTERS BAR -->
            <div style="display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; align-items: center; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02); border: 1px solid rgba(226, 232, 240, 0.8);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i data-lucide="filter" style="width: 16px; color: #3b82f6;"></i>
                <span style="font-weight: 700; font-size: 0.85rem; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Analyzer Filters</span>
              </div>
              <div style="height: 24px; width: 1px; background: #e2e8f0; margin: 0 8px;"></div>
              
              <select id="mgmt-filter-category" style="padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 20px; font-size: 0.9rem; color: #0f172a; background: white; font-weight: 500; cursor: pointer; outline: none; transition: border-color 0.2s;">
                <option value="ALL">All Categories</option>
              </select>
              
              <div style="display: flex; align-items: center; gap: 8px; background: white; padding: 4px 8px; border-radius: 20px; border: 1px solid #cbd5e1;">
                <label style="font-size: 0.8rem; color: #64748b; font-weight: 600; padding-left: 8px;">From</label>
                <input type="date" id="filter-from-date" style="padding: 4px 8px; border: none; font-size: 0.9rem; color: #0f172a; background: transparent; outline: none;" />
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; background: white; padding: 4px 8px; border-radius: 20px; border: 1px solid #cbd5e1;">
                <label style="font-size: 0.8rem; color: #64748b; font-weight: 600; padding-left: 8px;">To</label>
                <input type="date" id="filter-to-date" style="padding: 4px 8px; border: none; font-size: 0.9rem; color: #0f172a; background: transparent; outline: none;" />
              </div>
              
              <button id="mgmt-filter-clear" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; cursor: pointer; font-size: 0.85rem; font-weight: 600; margin-left: auto; padding: 8px 16px; border-radius: 20px; transition: all 0.2s;">Clear Filters</button>
            </div>

            <!-- EXECUTIVE KPI STRIP (Premium Design) -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 28px;">
              
              <div class="mgmt-kpi-card" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 24px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02); border: 1px solid rgba(255,255,255,0.8); position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 15px 25px -5px rgba(59,130,246,0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.05)';">
                <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Portfolio Value</div>
                  <div style="background: rgba(59,130,246,0.1); padding: 8px; border-radius: 12px;"><i data-lucide="pie-chart" style="color: #3b82f6; width: 20px; height: 20px;"></i></div>
                </div>
                <div id="mgmt-kpi-inv-value" style="font-size: 2.2rem; font-weight: 800; color: #0f172a; font-family: 'Inter', sans-serif; letter-spacing: -1px;">₹0</div>
              </div>
              
              <div class="mgmt-kpi-card" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 24px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02); border: 1px solid rgba(255,255,255,0.8); position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 15px 25px -5px rgba(16,185,129,0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.05)';">
                <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Available Stock</div>
                  <div style="background: rgba(16,185,129,0.1); padding: 8px; border-radius: 12px;"><i data-lucide="package-check" style="color: #10b981; width: 20px; height: 20px;"></i></div>
                </div>
                <div id="mgmt-kpi-avail-stock" style="font-size: 2.2rem; font-weight: 800; color: #0f172a; font-family: 'Inter', sans-serif; letter-spacing: -1px;">0</div>
              </div>
              
              <div class="mgmt-kpi-card" style="background: linear-gradient(135deg, #ffffff 0%, #fff1f2 100%); padding: 24px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(239,68,68,0.05), 0 4px 6px -2px rgba(239,68,68,0.02); border: 1px solid rgba(255,255,255,0.8); position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="document.querySelector('[data-target=\\'view-inventory\\']').click()" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 15px 25px -5px rgba(239,68,68,0.2)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 15px -3px rgba(239,68,68,0.05)';">
                <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%); border-radius: 50%;"></div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="font-size: 0.85rem; color: #ef4444; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Critical Stock</div>
                  <div style="background: rgba(239,68,68,0.1); padding: 8px; border-radius: 12px;"><i data-lucide="alert-octagon" style="color: #ef4444; width: 20px; height: 20px;"></i></div>
                </div>
                <div id="mgmt-kpi-crit-stock" style="font-size: 2.2rem; font-weight: 800; color: #991b1b; font-family: 'Inter', sans-serif; letter-spacing: -1px;">0</div>
              </div>
              
              <div class="mgmt-kpi-card" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 24px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02); border: 1px solid rgba(255,255,255,0.8); position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="document.querySelector('[data-target=\\'view-ppni\\']').click()" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 15px 25px -5px rgba(100,116,139,0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.05)';">
                <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(100,116,139,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Non-Moving Value</div>
                  <div style="background: rgba(100,116,139,0.1); padding: 8px; border-radius: 12px;"><i data-lucide="hourglass" style="color: #64748b; width: 20px; height: 20px;"></i></div>
                </div>
                <div id="mgmt-kpi-non-moving" style="font-size: 2.2rem; font-weight: 800; color: #0f172a; font-family: 'Inter', sans-serif; letter-spacing: -1px;">₹0</div>
              </div>
            </div>

            <!-- INSIGHTS & ACTIONS ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
              
              <!-- MANAGEMENT INSIGHTS -->
              <div style="background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 24px; border: 1px solid rgba(226, 232, 240, 0.8); position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>
                <h3 style="margin: 0 0 20px 0; font-size: 1.15rem; color: #0f172a; display: flex; align-items: center; gap: 10px; font-weight: 700;">
                  <div style="background: rgba(245, 158, 11, 0.1); padding: 8px; border-radius: 10px;"><i data-lucide="zap" style="width: 18px; color: #f59e0b;"></i></div>
                  AI Insights & Recommendations
                </h3>
                <ul id="mgmt-insights-list" style="margin: 0; padding-left: 20px; color: #334155; font-size: 0.95rem; line-height: 1.8; list-style-type: none;">
                  <li>Loading insights...</li>
                </ul>
              </div>

              <!-- ACTION REQUIRED -->
              <div style="background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 1px solid rgba(226, 232, 240, 0.8); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: #f8fafc; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px;">
                  <div style="background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 10px;"><i data-lucide="bell-ring" style="width: 18px; color: #ef4444;"></i></div>
                  <h3 style="margin: 0; font-size: 1.15rem; color: #0f172a; font-weight: 700;">Action Required Today</h3>
                </div>
                <div id="mgmt-action-required" style="padding: 24px; display: grid; grid-template-columns: 1fr; gap: 16px; flex-grow: 1; overflow-y: auto; max-height: 300px;">
                  <!-- Dynamically populated -->
                </div>
              </div>

            </div>

            <!-- RISK & GEOGRAPHY ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
              
              <!-- Stock Risk Matrix -->
              <div style="background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 24px; border: 1px solid rgba(226, 232, 240, 0.8);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                  <h3 style="margin: 0; font-size: 1.15rem; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <div style="background: rgba(139, 92, 246, 0.1); padding: 8px; border-radius: 10px;"><i data-lucide="scatter-chart" style="width: 18px; color: #8b5cf6;"></i></div>
                    Stock Risk Matrix
                  </h3>
                </div>
                <div style="position: relative; height: 280px; width: 100%;">
                  <canvas id="mgmtStockRiskChart"></canvas>
                </div>
              </div>

              <!-- Location Comparison -->
              <div style="background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 24px; border: 1px solid rgba(226, 232, 240, 0.8); display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                  <h3 style="margin: 0; font-size: 1.15rem; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <div style="background: rgba(14, 165, 233, 0.1); padding: 8px; border-radius: 10px;"><i data-lucide="map" style="width: 18px; color: #0ea5e9;"></i></div>
                    Location Performance
                  </h3>
                </div>
                <div style="overflow-x: auto; flex-grow: 1; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;" id="mgmt-location-table">
                    <thead style="background: #f8fafc;">
                      <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
                        <th style="padding: 12px 16px; font-weight: 600; border-right: 1px solid #e2e8f0;">Location</th>
                        <th style="padding: 12px 16px; text-align: right; font-weight: 600; border-right: 1px solid #e2e8f0;">Inv Value</th>
                        <th style="padding: 12px 16px; text-align: right; font-weight: 600; border-right: 1px solid #e2e8f0;">Critical Parts</th>
                        <th style="padding: 12px 16px; text-align: right; font-weight: 600;">Blocked Capital</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- Dynamic -->
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <!-- BOTTOM METRICS ROW -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
              
              <!-- Reorder Summary -->
              <div style="background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 24px; border: 1px solid rgba(226, 232, 240, 0.8);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                  <h3 style="margin: 0; font-size: 1.15rem; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <div style="background: rgba(59, 130, 246, 0.1); padding: 8px; border-radius: 10px;"><i data-lucide="clipboard-list" style="width: 18px; color: #3b82f6;"></i></div>
                    Reorder Control
                  </h3>
                  <button onclick="document.querySelector('[data-target=\\'view-orders\\']').click()" style="background: #f1f5f9; border: none; color: #3b82f6; cursor: pointer; font-size: 0.85rem; font-weight: 600; padding: 6px 12px; border-radius: 16px; transition: background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Manage Reorders →</button>
                </div>
                <div id="mgmt-reorder-summary" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div style="padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">Critical Reorder Parts</div>
                    <div id="mgmt-ro-critical" style="font-size: 2.2rem; font-weight: 800; color: #ef4444; font-family: 'Inter', sans-serif; letter-spacing: -1px;">0</div>
                  </div>
                  <div style="padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">Estimated Order Value</div>
                    <div id="mgmt-ro-value" style="font-size: 2.2rem; font-weight: 800; color: #3b82f6; font-family: 'Inter', sans-serif; letter-spacing: -1px;">₹0</div>
                  </div>
                </div>
              </div>
              
              <!-- Inventory Position Summary (Replaces unused columns/tables) -->
              <div style="background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 24px; border: 1px solid rgba(226, 232, 240, 0.8);">
                <h3 style="margin: 0 0 20px 0; font-size: 1.15rem; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                  <div style="background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 10px;"><i data-lucide="layers" style="width: 18px; color: #10b981;"></i></div>
                  Capital Allocation
                </h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <span style="color: #475569; font-weight: 600; font-size: 0.95rem;">Total Inventory Value</span>
                    <strong id="mgmt-pos-total" style="color: #0f172a; font-size: 1.15rem;">₹0</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <span style="color: #475569; font-weight: 600; font-size: 0.95rem;">Available Value</span>
                    <strong id="mgmt-pos-avail" style="color: #10b981; font-size: 1.15rem;">₹0</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <span style="color: #475569; font-weight: 600; font-size: 0.95rem;">Reserved Value</span>
                    <strong id="mgmt-pos-reserved" style="color: #f59e0b; font-size: 1.15rem;">₹0</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #fff1f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
                    <span style="color: #991b1b; font-weight: 600; font-size: 0.95rem;">Non-Moving Value (Blocked)</span>
                    <strong id="mgmt-pos-nonmoving" style="color: #ef4444; font-size: 1.15rem;">₹0</strong>
                  </div>
                  <!-- Hidden elements for backward compatibility with JS scripts -->
                  <div id="mgmt-ageing-summary" style="display:none;"></div>
                  <table id="mgmt-critical-table" style="display:none;"><tbody></tbody></table>
                </div>
              </div>

            </div>

          </div>
        </div>
`;

lines.splice(start, end - start, newDashboardView);
fs.writeFileSync('dashboard.html', lines.join('\n'));
console.log('Dashboard redesigned!');
