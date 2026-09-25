const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('BROWSER PAGE ERROR:', err.toString());
  });

  try {
    console.log("Navigating...");
    await page.goto('http://localhost:5173/dashboard.html', { waitUntil: 'networkidle2' });
    console.log("Page loaded!");
    
    // Simulate clicking the Inventory tab
    console.log("Clicking Inventory tab...");
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('.nav-item');
      if (tabs.length > 1) {
        tabs[1].click(); // Inventory
      } else {
        console.error("Tabs not found!");
      }
    });
    
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    console.error("Puppeteer Script Error:", e);
  } finally {
    await browser.close();
  }
})();
