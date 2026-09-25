const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const startTag = '        <!-- SETTINGS VIEW -->';
const endTag = '          </div> <!-- End of Grid -->';

const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error("Tags not found");
  process.exit(1);
}

// Extract everything from beginning up to startTag
const head = html.slice(0, startIndex);
// Extract everything after endTag
const tail = html.slice(endIndex + endTag.length);

const newSettingsView = `        <!-- SETTINGS VIEW -->
        <div id="view-settings" class="view-section" style="display: none;">
          <div class="dashboard-content" style="max-width: 1400px; margin: 0 auto; padding: 20px;">
            <h2 class="welcome-text" style="font-size: 1.8rem; margin-bottom: 24px; color: var(--text-primary); font-weight: 600;">System Settings</h2>
            
            <div class="settings-layout">
              
              <!-- Sidebar Navigation -->
              <div class="settings-sidebar">
                <nav class="settings-nav">
                  <button class="settings-tab active" data-target="panel-data">
                    <i data-lucide="database"></i> Data & Fetching
                  </button>
                  <button class="settings-tab" data-target="panel-users">
                    <i data-lucide="users"></i> User Management
                  </button>
                  <button class="settings-tab" data-target="panel-uploads">
                    <i data-lucide="upload-cloud"></i> Manual Uploads
                  </button>
                </nav>
              </div>

              <!-- Main Panels -->
              <div class="settings-panels-container">
                
                <!-- Panel 1: Data & Fetching -->
                <div id="panel-data" class="settings-panel active">
                  <h3 class="panel-title">Data Fetching & Configurations</h3>
                  
                  <div class="premium-card">
                    <div class="card-header">
                      <h4>Tata BI Portal Credentials</h4>
                      <p>Used by the background bot to authenticate and scrape live data.</p>
                    </div>
                    <form id="tata-credentials-form" class="card-body">
                      <div class="form-row">
                        <label>TATA Username / User ID</label>
                        <input type="text" id="tata-username" required placeholder="e.g. JS_3008420">
                      </div>
                      <div class="form-row">
                        <label>TATA Password</label>
                        <div class="input-with-icon">
                          <input type="password" id="tata-password" required placeholder="Enter password">
                          <button type="button" id="toggle-tata-password" class="icon-btn">
                            <i data-lucide="eye"></i>
                          </button>
                        </div>
                      </div>
                      <button type="submit" class="btn-primary">
                        <i data-lucide="save"></i> Save Credentials
                      </button>
                      <div id="settings-msg" class="success-msg" style="display: none;">Credentials updated securely!</div>
                    </form>
                  </div>

                  <div class="premium-card">
                    <div class="card-header">
                      <h4>Dealership Locations</h4>
                      <p>Manage the dealership locations the background bot will scrape data for.</p>
                    </div>
                    <div class="card-body">
                      <div id="locations-list" class="locations-list">
                        <!-- Dynamically populated -->
                      </div>
                      <div class="add-location-section">
                        <h5>Add New Location</h5>
                        <form id="add-location-form" class="inline-form">
                          <input type="text" id="loc-name" placeholder="Location Name (e.g. SUPWAL)" required>
                          <input type="text" id="loc-username" placeholder="Username" required>
                          <div class="input-with-icon">
                            <input type="password" id="loc-password" placeholder="Password" required>
                            <button type="button" id="toggle-loc-password" class="icon-btn">
                              <i data-lucide="eye"></i>
                            </button>
                          </div>
                          <button type="submit" class="btn-primary icon-only"><i data-lucide="plus"></i></button>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div class="premium-card danger-zone">
                    <div class="card-header">
                      <h4>Fetch Live Data</h4>
                      <p class="warning-text">WARNING: Fetching new data will <strong>delete existing data</strong> and replace it with fresh data.</p>
                    </div>
                    <div class="card-body">
                      <form id="fetch-data-form">
                        
                        <div class="fetch-section consumption">
                          <h5><i data-lucide="download-cloud"></i> Consumption Data</h5>
                          <div class="date-range">
                            <div>
                              <label>From Date</label>
                              <input type="date" id="from-date" required>
                            </div>
                            <div>
                              <label>To Date</label>
                              <input type="date" id="to-date" required>
                            </div>
                          </div>
                          <button type="button" id="fetch-consumption-btn" class="btn-danger full-width">
                            Fetch Consumption Data
                          </button>
                        </div>

                        <div class="fetch-section inventory">
                          <h5><i data-lucide="package"></i> Inventory Data</h5>
                          <div class="location-select">
                            <label>Target Location</label>
                            <select id="fetch-target-location" required>
                              <option value="ALL" selected>All Locations</option>
                            </select>
                          </div>
                          <button type="button" id="fetch-inventory-btn" class="btn-warning full-width">
                            Fetch Inventory Data
                          </button>
                        </div>
                        
                        <div class="sync-section">
                          <button type="button" id="sync-data-btn" class="btn-info full-width">
                            <i data-lucide="refresh-cw" class="sync-icon"></i> <span id="sync-text">Quick Sync Dashboards</span>
                          </button>
                        </div>
                        <div id="fetch-status" style="display: none; margin-top: 15px;"></div>
                      </form>
                    </div>
                  </div>

                </div>

                <!-- Panel 2: User Management -->
                <div id="panel-users" class="settings-panel" style="display: none;">
                  <h3 class="panel-title">User Access Control</h3>
                  
                  <div class="premium-card full-height">
                    <div class="card-header flex-between">
                      <div>
                        <h4>Dashboard User Management</h4>
                        <p>Create, edit, or remove users and manage their access roles.</p>
                      </div>
                      <button id="add-user-btn" class="btn-primary"><i data-lucide="user-plus"></i> Add User</button>
                    </div>
                    
                    <div class="card-body">
                      <!-- Add User Form -->
                      <form id="add-user-form" class="floating-form" style="display: none;">
                        <h5>Create New User</h5>
                        <div class="form-grid">
                          <div class="form-row">
                            <label>Username</label>
                            <input type="text" id="new-username" required>
                          </div>
                          <div class="form-row">
                            <label>Password</label>
                            <input type="password" id="new-password" required>
                          </div>
                          <div class="form-row">
                            <label>Role</label>
                            <select id="new-role" required>
                              <option value="Manager">Manager</option>
                              <option value="Super Admin">Super Admin</option>
                            </select>
                          </div>
                          <div class="form-row">
                            <label>Location</label>
                            <select id="new-location" required>
                              <option value="" disabled selected>Select Location</option>
                            </select>
                          </div>
                        </div>
                        <div class="form-actions">
                          <button type="submit" class="btn-primary">Save User</button>
                          <button type="button" id="cancel-add-user" class="btn-secondary">Cancel</button>
                        </div>
                      </form>

                      <!-- Change Password Form -->
                      <form id="change-password-form" class="floating-form" style="display: none;">
                        <h5>Change Password for <span id="change-pwd-username" class="highlight-text"></span></h5>
                        <input type="hidden" id="change-pwd-id">
                        <div class="form-row max-w-sm">
                          <label>New Password</label>
                          <input type="password" id="change-pwd-input" required>
                        </div>
                        <div class="form-actions">
                          <button type="submit" class="btn-warning">Update Password</button>
                          <button type="button" id="cancel-change-pwd" class="btn-secondary">Cancel</button>
                        </div>
                      </form>

                      <div class="table-responsive">
                        <table class="modern-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Username</th>
                              <th>Role</th>
                              <th>Location</th>
                              <th class="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody id="users-table-body">
                            <!-- JS WILL POPULATE ROWS -->
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Panel 3: Manual Uploads -->
                <div id="panel-uploads" class="settings-panel" style="display: none;">
                  <h3 class="panel-title">Manual Data Uploads</h3>
                  
                  <div class="premium-card">
                    <div class="card-header">
                      <h4>Price List Management</h4>
                      <p>Upload a Price List Excel file (.xlsx or .csv) to update parts pricing.</p>
                    </div>
                    <form id="price-list-form" class="card-body">
                      <div class="form-row">
                        <label>Select Excel File</label>
                        <input type="file" id="price-list-file" accept=".xlsx, .xls, .csv" required class="file-input">
                      </div>
                      <button type="submit" id="upload-price-list-btn" class="btn-primary full-width">
                        <i data-lucide="upload"></i> Upload & Save Price List
                      </button>
                      <div id="price-list-status" style="display: none; margin-top: 15px;"></div>
                    </form>
                  </div>

                  <div class="premium-card">
                    <div class="card-header">
                      <h4>Inventory Data Upload</h4>
                      <p>Upload an Inventory Excel file to manually replace existing data.</p>
                    </div>
                    <form id="inventory-upload-form" class="card-body">
                      <div class="form-row">
                        <label>Target Location</label>
                        <select id="inventory-upload-location" required class="select-input">
                          <option value="" disabled selected>Select a Location</option>
                        </select>
                      </div>
                      <div class="form-row">
                        <label>Select Excel File</label>
                        <input type="file" id="inventory-upload-file" accept=".xlsx, .xls, .csv" required class="file-input">
                      </div>
                      <button type="submit" id="upload-inventory-btn" class="btn-warning full-width">
                        <i data-lucide="upload"></i> Upload Inventory
                      </button>
                      <div id="inventory-upload-status" style="display: none; margin-top: 15px;"></div>
                    </form>
                  </div>

                  <div class="premium-card">
                    <div class="card-header">
                      <h4>Consumption Data Upload</h4>
                      <p>Upload a Consumption Excel file to manually replace existing data.</p>
                    </div>
                    <form id="consumption-upload-form" class="card-body">
                      <div class="form-row">
                        <label>Select Excel File</label>
                        <input type="file" id="consumption-upload-file" accept=".xlsx, .xls, .csv" required class="file-input">
                      </div>
                      <button type="submit" id="upload-consumption-btn" class="btn-danger full-width">
                        <i data-lucide="upload"></i> Upload Consumption
                      </button>
                      <div id="consumption-upload-status" style="display: none; margin-top: 15px;"></div>
                    </form>
                  </div>

                </div>

              </div>
            </div>`;

fs.writeFileSync('dashboard.html', head + newSettingsView + tail);
console.log("dashboard.html updated successfully!");
