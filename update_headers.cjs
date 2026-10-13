const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const oldHeader = `                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style="text-align: right;">NDP (₹)</th>
                  <th style="text-align: right; width: 150px;">Actions</th>`;
                  
const newHeader = `                  <th data-col="part_number">Part Number</th>
                  <th data-col="description">Description</th>
                  <th data-col="category">Category</th>
                  <th data-col="ndp" style="text-align: right;">NDP (₹)</th>
                  <th style="text-align: right; width: 150px;">Actions</th>`;

html = html.replace(oldHeader, newHeader);
fs.writeFileSync('dashboard.html', html);
console.log('Headers updated with data-col');
