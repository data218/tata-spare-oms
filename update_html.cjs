const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

const analyticsHtml = `
            <!-- Analytics Section -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
              <!-- Location Movement -->
              <div class="widget-card" style="padding: 0;">
                <div style="padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                  <h3 style="margin: 0; font-size: 1rem; color: var(--text-primary);">Location-wise IN / OUT</h3>
                </div>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
                      <tr>
                        <th style="padding: 10px 16px; text-align: left; font-size: 0.8rem; color: #64748b;">Location</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">IN Qty</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">OUT Qty</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">Net Qty</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">IN Value</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">OUT Value</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">Net Value</th>
                      </tr>
                    </thead>
                    <tbody id="location-movement-body">
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Top Parts Movement -->
              <div class="widget-card" style="padding: 0;">
                <div style="padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                  <h3 style="margin: 0; font-size: 1rem; color: var(--text-primary);">Top Parts by Movement</h3>
                </div>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
                      <tr>
                        <th style="padding: 10px 16px; text-align: left; font-size: 0.8rem; color: #64748b;">Part Details</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">IN Qty</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">OUT Qty</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">Total Movement</th>
                        <th style="padding: 10px 16px; text-align: right; font-size: 0.8rem; color: #64748b;">Net Movement</th>
                      </tr>
                    </thead>
                    <tbody id="top-parts-body">
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
`;

if (!html.includes('id="location-movement-body"')) {
  html = html.replace('<!-- Reconciliation Alerts -->', analyticsHtml + '\n            <!-- Reconciliation Alerts -->');
  fs.writeFileSync('dashboard.html', html, 'utf8');
  console.log('Added analytics sections to dashboard.html');
}
