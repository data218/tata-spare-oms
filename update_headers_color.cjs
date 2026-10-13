const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const oldHeader = `                  <th data-col="part_number">Part Number</th>
                  <th data-col="description">Description</th>
                  <th data-col="category">Category</th>
                  <th data-col="ndp" style="text-align: right;">NDP (₹)</th>
                  <th style="text-align: right; width: 150px;">Actions</th>`;
                  
const newHeader = `                  <th data-col="part_number" style="padding: 10px 8px; font-weight: 600; color: white; font-size: 0.85rem; text-align: left;">Part Number</th>
                  <th data-col="description" style="padding: 10px 8px; font-weight: 600; color: white; font-size: 0.85rem; text-align: left;">Description</th>
                  <th data-col="category" style="padding: 10px 8px; font-weight: 600; color: white; font-size: 0.85rem; text-align: left;">Category</th>
                  <th data-col="ndp" style="padding: 10px 8px; font-weight: 600; color: white; font-size: 0.85rem; text-align: right;">NDP (₹)</th>
                  <th style="padding: 10px 8px; font-weight: 600; color: white; font-size: 0.85rem; text-align: right; width: 150px;">Actions</th>`;

html = html.replace(oldHeader, newHeader);
fs.writeFileSync('dashboard.html', html);
