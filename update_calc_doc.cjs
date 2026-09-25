const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const lubeNote = `
                <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                  <h4 style="margin: 0 0 8px 0; color: #334155;">5. Lubricants (Lube Qty)</h4>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li><strong>Categories:</strong> LUBRICANT, LUBRICANTS, LUBE, LUBES, OIL</li>
                    <li><strong>Quantity Conversion:</strong> System automatically divides sheet values (ML) by 1000 to display in Liters (L).</li>
                  </ul>
                </div>
`;

html = html.replace('<!-- the forms and table here -->', ''); // Clean up if any
html = html.replace('</ul>\n                </div>\n              </div>', '</ul>\n                </div>' + lubeNote + '              </div>');

fs.writeFileSync('dashboard.html', html, 'utf8');
console.log("Updated dashboard calculation docs.");
