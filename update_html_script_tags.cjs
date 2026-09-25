const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// We need to add <script src="management_dashboard.js"></script> before </body>
if (!html.includes('management_dashboard.js')) {
    html = html.replace('</body>', '  <script src="management_dashboard.js"></script>\n</body>');
    fs.writeFileSync('dashboard.html', html);
    console.log('Added management_dashboard.js to dashboard.html');
} else {
    console.log('management_dashboard.js already in dashboard.html');
}
