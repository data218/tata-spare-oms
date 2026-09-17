import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/dashboard.html', { waitUntil: 'networkidle0' });

  console.log("Dashboard loaded. Clicking Status header...");
  
  // Find Status header
  const ths = await page.$$('th');
  for (const th of ths) {
    const text = await page.evaluate(el => el.textContent.trim(), th);
    if (text === 'Status') {
      console.log("Found Status header. Clicking it...");
      await th.click();
      await new Promise(r => setTimeout(r, 500));
      
      const dropdown = await page.$('.column-filter-dropdown');
      if (dropdown) {
        console.log("Dropdown found in DOM!");
        const html = await page.evaluate(el => el.outerHTML, dropdown);
        console.log(html);
      } else {
        console.log("Dropdown NOT FOUND in DOM!");
        const container = await page.$('#filter-dropdown-container');
        console.log("Container exists:", !!container);
      }
      break;
    }
  }

  await browser.close();
})();
