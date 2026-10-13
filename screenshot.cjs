const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(__dirname));

const server = app.listen(3015, async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 1080 });
        
        await page.goto('http://localhost:3015/dashboard.html');
        
        // Wait for page to settle and dashboard to render
        await page.waitForTimeout(2000);
        
        // Ensure dashboard view is active
        await page.evaluate(() => {
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            
            const dash = document.getElementById('view-dashboard');
            if (dash) {
                dash.classList.add('active');
                dash.style.display = 'block';
            }
            
            const nav = document.querySelector('[data-target="view-dashboard"]');
            if (nav) nav.classList.add('active');
        });
        
        await page.waitForTimeout(1000); // let styles apply
        
        await page.screenshot({ path: 'dashboard-redesign-screenshot.png', fullPage: true });
        
        await browser.close();
        server.close();
        console.log('Screenshot saved to dashboard-redesign-screenshot.png');
    } catch (e) {
        console.error(e);
        server.close();
        process.exit(1);
    }
});
