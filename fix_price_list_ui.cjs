const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

html = html.replace(
    '<input type="text" id="price-list-search" placeholder="Search part number or description...">',
    '<input type="text" id="price-list-search" placeholder="Search part number or description..." style="padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; width: 280px; background: #f8fafc;">'
);

html = html.replace(
    '<table id="price-list-table">',
    '<table id="price-list-table" class="control-tower-table" style="width: 100%; border-collapse: collapse; min-width: 1000px;">'
);

const oldPagination = `<div class="pagination" id="price-list-pagination">
             <!-- Pagination if needed -->
          </div>`;
          
const newPagination = `<div class="pagination" id="price-list-pagination" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
            <button id="price-prev-btn" class="btn btn-outline" style="padding: 6px 12px;">Prev</button>
            <span id="price-page-info" style="align-self: center; font-size: 0.9rem; font-weight: 500;">Page 1</span>
            <button id="price-next-btn" class="btn btn-outline" style="padding: 6px 12px;">Next</button>
          </div>`;

html = html.replace(oldPagination, newPagination);
fs.writeFileSync('dashboard.html', html);
