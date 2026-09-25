const fs = require('fs');

// Restore dashboard.html
let html = fs.readFileSync('dashboard.html', 'utf8');

const startTag = '        <!-- SETTINGS VIEW -->';
const endTag = '          </div> <!-- End of Grid -->';

const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const head = html.slice(0, startIndex);
  const tail = html.slice(endIndex + endTag.length);

  const oldSettingsView = `        <!-- SETTINGS VIEW -->
        <div id="view-settings" class="view-section" style="display: none;">
          <div class="dashboard-content">
            <h2 class="welcome-text">System Settings</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 24px; align-items: start;">
              
              <!-- Column 1: Bot & Data Configurations -->
              <div>
                <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--text-primary);">Data Fetching & Configurations</h3>
                
                <div class="settings-card" style="background: var(--card-bg); border-radius: 8px; padding: 20px; border: 1px solid var(--border-color); width: 100%; margin-bottom: 20px;">
                  <div class="settings-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                    <h3 style="margin: 0;">Tata BI Portal Credentials</h3>
                    <i data-lucide="chevron-down" class="chevron"></i>
                  </div>
                  <div class="settings-content" style="display: none; margin-top: 15px;">
                    <form id="tata-credentials-form">
                      <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-primary);">TATA Username / User ID</label>
                        <input type="text" id="tata-username" required style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px;" placeholder="e.g. JS_3008420">
                      </div>
                      
                      <div style="margin-bottom: 24px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-primary);">TATA Password</label>
                        <div style="position: relative; display: flex; align-items: center;">
                          <input type="password" id="tata-password" required style="width: 100%; padding: 10px; padding-right: 36px; border: 1px solid var(--border-color); border-radius: 6px;" placeholder="Enter new password">
                          <button type="button" id="toggle-tata-password" style="position: absolute; right: 8px; background: transparent; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; padding: 4px;" title="Toggle Password Visibility">
                            <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                          </button>
                        </div>
                      </div>
                      
                      <button type="submit" class="btn-primary" style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="save"></i> Save Credentials
                      </button>
                      <div id="settings-msg" style="margin-top: 12px; color: #10b981; font-weight: 500; display: none;">Credentials updated securely!</div>
                    </form>
                  </div>
                </div>

                <div class="settings-card" style="background: var(--card-bg); border-radius: 8px; padding: 20px; border: 1px solid var(--border-color); width: 100%; margin-bottom: 20px;">
              <div class="settings-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <h3 style="margin: 0;">Dealership Locations</h3>
                <i data-lucide="chevron-down" class="chevron"></i>
              </div>
              <div class="settings-content" style="display: none; margin-top: 15px;">
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 15px;">
                  Manage the dealership locations the background bot will scrape data for.
                </p>
                
                <div id="locations-list" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
                  <!-- Dynamically populated -->
                </div>
                
                <h4 style="margin: 15px 0 10px 0;">Add New Location</h4>
                <form id="add-location-form" style="display: flex; gap: 10px; align-items: flex-end;">
                  <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 0.85rem;">Location Name (e.g. SUPWAL)</label>
                    <input type="text" id="loc-name" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                  </div>
                  <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 0.85rem;">Username</label>
                    <input type="text" id="loc-username" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                  </div>
                  <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 0.85rem;">Password</label>
                    <div style="position: relative; display: flex; align-items: center;">
                      <input type="password" id="loc-password" style="width: 100%; padding: 8px; padding-right: 30px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                      <button type="button" id="toggle-loc-password" style="position: absolute; right: 5px; background: transparent; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; padding: 4px;" title="Toggle Password Visibility">
                        <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                      </button>
                    </div>
                  </div>
                  <button type="submit" style="background: #3b82f6; color: white; border: none; padding: 9px 12px; border-radius: 4px; cursor: pointer;">
                    <i data-lucide="plus"></i>
                  </button>
                </form>
              </div>
            </div>

            <div class="settings-card" style="background: var(--card-bg); border-radius: 8px; padding: 20px; border: 1px solid var(--border-color); max-width: 500px; margin-bottom: 20px;">
              <div class="settings-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <h3 style="margin: 0; color: #ef4444;">Fetch Live Data</h3>
                <i data-lucide="chevron-down" class="chevron"></i>
              </div>
              <div class="settings-content" style="display: none; margin-top: 15px;">
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
                  WARNING: Fetching new data will <strong>delete existing data</strong> and replace it with fresh data.
                </p>
                
                <form id="fetch-data-form">
                  <!-- Consumption Section -->
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 15px;">
                    <h4 style="margin-top: 0; margin-bottom: 12px; color: #ef4444; display: flex; align-items: center; gap: 6px;">
                      <i data-lucide="download-cloud" style="width: 18px; height: 18px;"></i> Consumption Data
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                      <div>
                        <label for="from-date" style="display: block; margin-bottom: 5px; font-size: 0.85rem; font-weight: 500;">From Date</label>
                        <input type="date" id="from-date" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                      </div>
                      <div>
                        <label for="to-date" style="display: block; margin-bottom: 5px; font-size: 0.85rem; font-weight: 500;">To Date</label>
                        <input type="date" id="to-date" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                      </div>
                    </div>
                    <button type="button" id="fetch-consumption-btn" style="background: #ef4444; color: white; border: none; padding: 10px; border-radius: 4px; font-weight: 500; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
                      Fetch Consumption Data
                    </button>
                  </div>

                  <!-- Inventory Section -->
                  <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 20px;">
                    <h4 style="margin-top: 0; margin-bottom: 12px; color: #d97706; display: flex; align-items: center; gap: 6px;">
                      <i data-lucide="package" style="width: 18px; height: 18px;"></i> Inventory Data
                    </h4>
                    <div style="margin-bottom: 15px;">
                      <label for="fetch-target-location" style="display: block; margin-bottom: 5px; font-size: 0.85rem; font-weight: 500;">Target Location</label>
                      <select id="fetch-target-location" style="width: 100%; padding: 8px; border: 1px solid #fcd34d; border-radius: 4px; background: white;" required>
                        <option value="ALL" selected>All Locations</option>
                      </select>
                    </div>
                    <button type="button" id="fetch-inventory-btn" style="background: #f59e0b; color: white; border: none; padding: 10px; border-radius: 4px; font-weight: 500; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
                      Fetch Inventory Data
                    </button>
                  </div>
                  
                  <div style="border-top: 1px solid var(--border-color); padding-top: 15px;">
                    <button type="button" id="sync-data-btn" class="sync-btn" style="background: #0ea5e9; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center;">
                      <i data-lucide="refresh-cw" class="sync-icon" style="width: 16px; height: 16px;"></i>
                      <span id="sync-text">Quick Sync Dashboards</span>
                    </button>
                  </div>
                  <div id="fetch-status" style="margin-top: 15px; font-size: 0.9rem; font-weight: 500; display: none;"></div>
                </form>
              </div>
            </div>

            <div class="settings-card" style="background: var(--card-bg); border-radius: 8px; padding: 20px; border: 1px solid var(--border-color); max-width: 500px; margin-bottom: 20px;">
              <div class="settings-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <h3 style="margin: 0;">Price List Management</h3>
                <i data-lucide="chevron-down" class="chevron"></i>
              </div>
              <div class="settings-content" style="display: none; margin-top: 15px;">
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
                  Upload a Price List Excel file (.xlsx or .csv) to replace the existing price list in the system.
                </p>
                
                <form id="price-list-form">
                  <div style="margin-bottom: 15px;">
                    <label for="price-list-file" style="display: block; margin-bottom: 5px; font-weight: 500;">Select Excel File</label>
                    <input type="file" id="price-list-file" accept=".xlsx, .xls, .csv" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                  </div>
                  
                  <button type="submit" id="upload-price-list-btn" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center;">
                    <i data-lucide="upload" style="width: 16px; height: 16px;"></i> Upload & Save Price List
                  </button>
                  <div id="price-list-status" style="margin-top: 15px; font-size: 0.9rem; font-weight: 500; display: none;"></div>
                </form>
              </div>
            </div>

            <div class="settings-card" style="background: var(--card-bg); border-radius: 8px; padding: 20px; border: 1px solid var(--border-color); max-width: 500px; margin-bottom: 20px;">
              <div class="settings-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <h3 style="margin: 0;">Inventory Manual Upload</h3>
                <i data-lucide="chevron-down" class="chevron"></i>
              </div>
              <div class="settings-content" style="display: none; margin-top: 15px;">
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
                  Upload an Inventory Excel file (.xlsx or .csv) to replace the existing inventory data in the system. Make sure you select the correct Location.
                </p>
                <form id="inventory-upload-form">
                  <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Location</label>
                    <select id="inventory-upload-location" required style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background: white; font-family: inherit;">
                      <option value="" disabled selected>Select a Location</option>
                    </select>
                  </div>
                  <div style="margin-bottom: 15px;">
                    <label for="inventory-upload-file" style="display: block; margin-bottom: 5px; font-weight: 500;">Select Excel File</label>
                    <input type="file" id="inventory-upload-file" accept=".xlsx, .xls, .csv" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                  </div>
                  <button type="submit" id="upload-inventory-btn" style="background: #f59e0b; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center;">
                    <i data-lucide="upload" style="width: 16px; height: 16px;"></i> Upload Inventory
                  </button>
                  <div id="inventory-upload-status" style="margin-top: 15px; font-size: 0.9rem; font-weight: 500; display: none;"></div>
                </form>
              </div>
            </div>

            <div class="settings-card" style="background: var(--card-bg); border-radius: 8px; padding: 20px; border: 1px solid var(--border-color); max-width: 500px; margin-bottom: 20px;">
              <div class="settings-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <h3 style="margin: 0;">Consumption Manual Upload</h3>
                <i data-lucide="chevron-down" class="chevron"></i>
              </div>
              <div class="settings-content" style="display: none; margin-top: 15px;">
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
                  Upload a Consumption Excel file (.xlsx or .csv) to completely replace the existing consumption data in the system.
                </p>
                <form id="consumption-upload-form">
                  <div style="margin-bottom: 15px;">
                    <label for="consumption-upload-file" style="display: block; margin-bottom: 5px; font-weight: 500;">Select Excel File</label>
                    <input type="file" id="consumption-upload-file" accept=".xlsx, .xls, .csv" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                  </div>
                  <button type="submit" id="upload-consumption-btn" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center;">
                    <i data-lucide="upload" style="width: 16px; height: 16px;"></i> Upload Consumption
                  </button>
                  <div id="consumption-upload-status" style="margin-top: 15px; font-size: 0.9rem; font-weight: 500; display: none;"></div>
                </form>
              </div>
            </div>
          </div> <!-- End of Column 1 -->

          <!-- Column 2: Access Control -->
          <div>
            <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--text-primary);">Access Control</h3>
            
            <div class="settings-card" style="background: white; border-radius: 12px; padding: 24px; border: 1px solid var(--border-color); margin-bottom: 20px; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 20px;">
                <h3 style="margin: 0; color: var(--text-primary);">Dashboard User Management</h3>
                <button id="add-user-btn" class="btn-primary" style="display: flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 0.85rem;"><i data-lucide="user-plus"></i> Add User</button>
              </div>
              
              <!-- Add User Form (Hidden by default) -->
              <form id="add-user-form" style="display: none; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; margin-bottom: 12px;">Create New User</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                  <div>
                    <label style="display: block; margin-bottom: 4px; font-size: 0.85rem;">Username</label>
                    <input type="text" id="new-username" required style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                  </div>
                  <div>
                    <label style="display: block; margin-bottom: 4px; font-size: 0.85rem;">Password</label>
                    <input type="password" id="new-password" required style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                  </div>
                  <div>
                    <label style="display: block; margin-bottom: 4px; font-size: 0.85rem;">Role</label>
                    <select id="new-role" required style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                      <option value="Manager">Manager</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label style="display: block; margin-bottom: 4px; font-size: 0.85rem;">Location</label>
                    <select id="new-location" required style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                      <option value="" disabled selected>Select Location</option>
                    </select>
                  </div>
                </div>
                <div style="display: flex; gap: 12px;">
                  <button type="submit" class="btn-primary" style="padding: 6px 12px;">Save User</button>
                  <button type="button" id="cancel-add-user" style="padding: 6px 12px; background: transparent; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">Cancel</button>
                </div>
              </form>

              <form id="change-password-form" style="display: none; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; margin-bottom: 12px;">Change Password for <span id="change-pwd-username" style="color: var(--primary-color);"></span></h4>
                <input type="hidden" id="change-pwd-id">
                <div style="margin-bottom: 16px;">
                  <label style="display: block; margin-bottom: 4px; font-size: 0.85rem;">New Password</label>
                  <input type="password" id="change-pwd-input" required style="width: 100%; max-width: 300px; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 12px;">
                  <button type="submit" class="btn-primary" style="padding: 6px 12px; background: #f59e0b;">Update Password</button>
                  <button type="button" id="cancel-change-pwd" style="padding: 6px 12px; background: transparent; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">Cancel</button>
                </div>
              </form>

              <div class="table-container" style="overflow-x: auto;">
                <table class="control-tower-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); background: #f8fafc;">
                      <th style="padding: 12px 16px; font-weight: 500; color: var(--text-secondary); font-size: 0.85rem;">ID</th>
                      <th style="padding: 12px 16px; font-weight: 500; color: var(--text-secondary); font-size: 0.85rem;">Username</th>
                      <th style="padding: 12px 16px; font-weight: 500; color: var(--text-secondary); font-size: 0.85rem;">Password</th>
                      <th style="padding: 12px 16px; font-weight: 500; color: var(--text-secondary); font-size: 0.85rem;">Role</th>
                      <th style="padding: 12px 16px; font-weight: 500; color: var(--text-secondary); font-size: 0.85rem;">Location</th>
                      <th style="padding: 12px 16px; font-weight: 500; color: var(--text-secondary); font-size: 0.85rem; text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="users-table-body">
                    <!-- JS WILL POPULATE ROWS -->
                  </tbody>
                </table>
              </div>
            </div>
            
          </div> <!-- End of Column 2 -->
          
          </div> <!-- End of Grid -->`;

  fs.writeFileSync('dashboard.html', head + oldSettingsView + tail);
  console.log("dashboard.html restored successfully!");
} else {
  console.error("Tags not found in dashboard.html");
}

// Restore style.css by stripping appended CSS
let css = fs.readFileSync('style.css', 'utf8');
const cssTag = '/* Professional Settings UI */';
const cssIndex = css.indexOf(cssTag);
if (cssIndex !== -1) {
  css = css.slice(0, cssIndex);
  fs.writeFileSync('style.css', css);
  console.log("style.css restored successfully!");
}
