const fs = require('fs');

function updateDashboard(filename) {
    let content = fs.readFileSync(filename, 'utf8');

    // 1. Add Navigation Link
    if (!content.includes('data-target="view-price-list"')) {
        const navTarget = `          <a href="#" class="nav-item" data-target="view-movement">`;
        const newNav = `          <a href="#" class="nav-item" data-target="view-price-list">
            <i data-lucide="tag"></i>
            <span>TATA Price List</span>
          </a>\n`;
        content = content.replace(navTarget, newNav + navTarget);
    }

    // 2. Add Container
    if (!content.includes('id="view-price-list"')) {
        const targetView = `        <!-- Settings View -->`;
        const newView = `        <!-- TATA Price List View -->
        <div id="view-price-list" class="view-section hidden fade-in">
          <div class="view-header">
            <div>
              <h2>TATA Price List</h2>
              <p class="text-sm text-gray-500">Manage Master Price List for Parts</p>
            </div>
            <div class="header-actions">
              <div class="search-box">
                <i data-lucide="search"></i>
                <input type="text" id="price-list-search" placeholder="Search part number or description...">
              </div>
            </div>
          </div>
          
          <div class="table-container fade-in" style="margin-top:20px;">
            <table id="price-list-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style="text-align: right;">NDP (₹)</th>
                  <th style="text-align: right; width: 150px;">Actions</th>
                </tr>
              </thead>
              <tbody id="price-list-body">
                <!-- Rows injected here -->
              </tbody>
            </table>
          </div>
          
          <div class="pagination" id="price-list-pagination">
             <!-- Pagination if needed -->
          </div>
        </div>\n\n`;
        content = content.replace(targetView, newView + targetView);
    }

    fs.writeFileSync(filename, content);
}

updateDashboard('dashboard.html');
