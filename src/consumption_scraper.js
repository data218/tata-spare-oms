import { parseNumber } from './inventory-math.js';
import { launchBrowser } from './puppeteer-runtime.js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { supabase } from './server-config.js';
import { profileDir, downloadDir, scratch } from './scratch-paths.js';
import { loginToPortal } from './portal-login.js';
import { replaceConsumptionPeriod } from './consumption-store.js';
dotenv.config();

// Hard cap for a single consumption run. A wedged portal page must never block
// the run forever; when this fires we close the browser so the in-flight
// Puppeteer call rejects and the run unwinds instead of hanging the dashboard.
const SCRAPE_TIMEOUT_MS = 15 * 60 * 1000;

async function fetchConsumptionData(fromDate, toDate, onProgress = null, signal) {
    signal?.throwIfAborted();
    let totalRowsInserted = 0;
    const notify = (msg) => {
        console.log(msg);
        if (onProgress) onProgress(msg);
    };
    if (!fromDate || !toDate) {
        throw new Error("fromDate and toDate are required.");
    }

    // Credentials are read from environment variables first. This is the
    // recommended setup because it keeps the Tata BI password out of any table
    // the browser (anon key) can read. The database is only used as a legacy
    // fallback so existing installs keep working until they migrate.
    let masterUsername = process.env.TATA_BI_USERNAME;
    let masterPassword = process.env.TATA_BI_PASSWORD;

    if (!masterUsername || !masterPassword) {
        notify('TATA_BI_USERNAME/TATA_BI_PASSWORD not set; falling back to Supabase credentials...');
        const { data: settings, error: setErr } = await supabase.from('tata_bot_settings').select('*');
        if (setErr) throw new Error('Failed to fetch settings from Supabase');

        const uRow = settings.find(r => r.key === 'master_username' || r.key === 'tata_bi_username');
        const pRow = settings.find(r => r.key === 'master_password' || r.key === 'tata_bi_password');
        if (uRow) masterUsername = masterUsername || uRow.value;
        if (pRow) masterPassword = masterPassword || pRow.value;
    }

    if (!masterUsername || !masterPassword) {
        throw new Error('Tata BI credentials not found. Set TATA_BI_USERNAME and TATA_BI_PASSWORD in the server environment (recommended), or save them in Settings.');
    }

    const location = { location_name: 'Master', username: masterUsername, password: masterPassword };

    notify('Consumption refresh starting (existing rows are kept until new data is parsed).');

    notify(`Starting automated bot for Consumption Data (Date Range: ${fromDate} to ${toDate})...`);
        const browser = await launchBrowser({
            signal,
            userDataDir: profileDir,
            args: [
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    const page = await browser.newPage();
    const watchdog = setTimeout(() => {
        notify(`WARNING: consumption run exceeded ${Math.round(SCRAPE_TIMEOUT_MS / 60000)} min; aborting this attempt.`);
        try { browser.close(); } catch (e) {}
    }, SCRAPE_TIMEOUT_MS);

    // Auto-dismiss dialogs so page.screenshot and evaluation don't hang
    page.on('dialog', async dialog => {
        console.log(`[Dialog caught]: ${dialog.message()}`);
        await dialog.dismiss();
    });

    // Set a realistic user agent
    // User agent is handled by stealth plugin
    await page.setViewport({ width: 1366, height: 768 });

    try {
        // Sign in. The portal issues its own short-lived redirect token when we ask
        // for the app URL, so nothing about the login URL is hardcoded here.
        await loginToPortal(page, { username: location.username, password: location.password }, notify);

        const html = await page.content();
        fs.writeFileSync(scratch('page.html'), html);
        console.log('Saved page.html for inspection');


        notify('Navigating to PCBU Spares report...');
        
        // Click on the Dashboards dropdown
        await page.waitForSelector('#dashboard', { visible: true });
        await page.click('#dashboard');
        
        // Wait for a little bit to let the menu open
        await new Promise(r => setTimeout(r, 1500));
        
        // Find and click the 'PCBU Spares' menu item
        await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('a, span, div, td'));
            const target = elements.find(el => el.textContent && el.textContent.trim() === 'PCBU Spares' && el.offsetParent !== null);
            if (target) {
                target.click();
            }
        });
        
        console.log('Clicked PCBU Spares, waiting for report to load...');
        await new Promise(r => setTimeout(r, 8000));
        
        console.log('Clicking Transactional Reports tab...');
        try {
            await page.click('::-p-text(Transactional Reports)');
            console.log('Clicked Transactional Reports tab!');
        } catch (e) {
            console.log('WARNING: Could not click Transactional Reports tab using text selector. Falling back...');
        }
        
        console.log('Waiting for Transactional Reports to load...');
        await new Promise(r => setTimeout(r, 10000));
        
        console.log('Clicking Spares Consumption Invoice Line Items...');
        let clickedReportLink = false;
        
        // Try clicking on the main page
        try {
            await page.click('::-p-text(Spares Consumption Invoice Line Items)');
            console.log('Clicked Spares Consumption link directly!');
            clickedReportLink = true;
        } catch (e) {
            // Try clicking inside frames
            for (const frame of page.frames()) {
                try {
                    await frame.click('::-p-text(Spares Consumption Invoice Line Items)');
                    console.log('Clicked Spares Consumption link inside a frame!');
                    clickedReportLink = true;
                    break;
                } catch (err) {}
            }
        }
        
        if (!clickedReportLink) {
            console.log('WARNING: Could not find Spares Consumption link!');
        }

        notify('Waiting for date prompt to load...');
        await new Promise(r => setTimeout(r, 3000));
        
        notify(`Filling in dates: ${fromDate} to ${toDate}...`);
        let dateInputsFound = false;
        for (const frame of page.frames()) {
            try {
                const dateInputs = await frame.$$('input:not([type="hidden"]):not([type="button"]):not([type="submit"])');
                if (dateInputs.length >= 2) {
                    console.log('Found date inputs in frame! Injecting dates...');
                    dateInputsFound = true;
                    
                    await frame.evaluate((startInput, endInput, fDate, tDate) => {
                        startInput.removeAttribute('readonly');
                        startInput.removeAttribute('disabled');
                        startInput.value = fDate;
                        startInput.dispatchEvent(new Event('change', { bubbles: true }));
                        startInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        
                        endInput.removeAttribute('readonly');
                        endInput.removeAttribute('disabled');
                        endInput.value = tDate;
                        endInput.dispatchEvent(new Event('change', { bubbles: true }));
                        endInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    }, dateInputs[0], dateInputs[1], fromDate, toDate);
                    
                    console.log('Clicking OK button in this frame...');
                    try {
                        await frame.click('::-p-text(OK)');
                        console.log('Clicked OK using Puppeteer CDP!');
                    } catch (e) {
                        console.log('WARNING: Failed to click OK using CDP, falling back...');
                        await frame.evaluate(() => {
                            const elements = Array.from(document.querySelectorAll('button, input[type="button"], a, td, div, span'));
                            const okBtn = elements.find(el => el.textContent && el.textContent.trim() === 'OK' && el.offsetParent !== null && el.children.length === 0);
                            if (okBtn) okBtn.click();
                            else {
                                const okLoose = elements.find(el => el.textContent && el.textContent.trim() === 'OK' && el.offsetParent !== null);
                                if (okLoose) okLoose.click();
                            }
                        });
                    }
                    
                    break;
                }
            } catch (e) {}
        }
        
        if (!dateInputsFound) {
            console.log('WARNING: Could not find date inputs in any frame!');
        }

        notify('Waiting for the data table to load...');
        
        console.log('Setting up download behavior...');
        const downloadPath = downloadDir;
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }
        
        try {
            const client = await page.createCDPSession();
            await client.send('Browser.setDownloadBehavior', {
                behavior: 'allowAndName',
                downloadPath: downloadPath,
                eventsEnabled: true
            });
        } catch (err) {
            console.log('Browser.setDownloadBehavior failed, falling back to Page.setDownloadBehavior');
            const client = await page.createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });
        }

        notify('Exporting report to CSV...');
        
        console.log('Extracting all links from all frames...');
        let allLinks = [];
        for (const frame of page.frames()) {
            try {
                const links = await frame.evaluate(() => {
                    return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent.trim(), href: a.href }));
                });
                allLinks = allLinks.concat(links);
            } catch (e) {}
        }
        fs.writeFileSync(scratch('all_links.json'), JSON.stringify(allLinks, null, 2));
        console.log('Saved all_links.json');

        console.log('Clicking Export...');
        
        // Accepts a single label or a list of candidate labels (the export wizard
        // popup uses "Next" / "Next >" / ">>" depending on the portal version).
        async function robustClick(textToFind) {
            const candidates = Array.isArray(textToFind) ? textToFind : [textToFind];
            for (const txt of candidates) {
                for (const frame of [page, ...page.frames()]) {
                    try {
                        const clicked = await frame.evaluate((label) => {
                            const links = Array.from(document.querySelectorAll('a, span, div, td, button, input[type="button"]'));
                            const target = links.find(el => el.textContent && el.textContent.trim() === label && el.offsetParent !== null);
                            if (target) {
                                target.click();
                                return true;
                            }
                            return false;
                        }, txt);
                        if (clicked) return true;
                    } catch (err) {}
                }
            }
            return false;
        }

        let foundExport = false;
        for(let i = 0; i < 15; i++) {
            foundExport = await robustClick('Export');
            if (foundExport) break;
            await new Promise(r => setTimeout(r, 2000));
        }
        if (!foundExport) console.log('WARNING: Could not find Export button');

        // Oracle BI opens the "Data" export submenu on mouseover, not click: its
        // anchor is onclick="return false;" with onmouseover="saw.menuItemMouseOver(...)".
        // A plain click therefore leaves the format list hidden, and the CSV entry
        // (offsetParent === null) can never be matched by visible text. Hover it
        // open, then fire the CSV export link via its Format=csv handler directly.
        console.log('Opening Export > Data submenu...');
        for (const frame of [page, ...page.frames()]) {
            try {
                const hovered = await frame.evaluate(() => {
                    const els = Array.from(document.querySelectorAll('a, td, span, div'));
                    const dataItem = els.find(el =>
                        /idDownloadDataMenu/i.test(el.getAttribute('onmouseover') || '') &&
                        (el.textContent || '').trim() === 'Data');
                    if (!dataItem) return false;
                    dataItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    dataItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    return true;
                });
                if (hovered) break;
            } catch (e) {}
        }
        await new Promise(r => setTimeout(r, 1000));

        console.log('Clicking CSV...');
        let foundCSV = false;
        const os = await import('os');
        const userDownloadsPath = path.join(os.homedir(), 'Downloads');
        const filesBeforeDownload1 = new Set(fs.readdirSync(downloadPath));
        let filesBeforeDownload2 = new Set();
        if (fs.existsSync(userDownloadsPath)) {
            filesBeforeDownload2 = new Set(fs.readdirSync(userDownloadsPath));
        }
        for(let i = 0; i < 10; i++) {
            for (const frame of [page, ...page.frames()]) {
                try {
                    const clicked = await frame.evaluate(() => {
                        // Primary: the CSV download link, identified by Format=csv in its
                        // onclick (Tab-Delimited also ends in Extension=.csv, so match Format).
                        const anchors = Array.from(document.querySelectorAll('a'));
                        const csvLink = anchors.find(a => /Format=csv[&"']/i.test(a.getAttribute('onclick') || ''));
                        if (csvLink) { csvLink.click(); return 'handler'; }
                        // Fallback: any element labelled exactly "CSV".
                        const all = Array.from(document.querySelectorAll('a, span, div, td, button, input[type="button"]'));
                        const byText = all.find(el => (el.textContent || '').trim() === 'CSV');
                        if (byText) { byText.click(); return 'text'; }
                        return false;
                    });
                    if (clicked) { foundCSV = true; break; }
                } catch (e) {}
            }
            if (foundCSV) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!foundCSV) console.log('WARNING: Could not find CSV button');
        
        console.log('Waiting 2 seconds to see what happened after clicking CSV...');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: scratch('debug_after_csv_click.png'), fullPage: true });

        console.log('Waiting for download to complete (polling downloads folder)...');
        let downloadedFile = null;
        const start = Date.now();
        const maxWaitIterations = 360; // 12 minutes at 2 seconds per iteration
        for (let i = 0; i < maxWaitIterations; i++) {
            await new Promise(r => setTimeout(r, 2000));
            
            // 1. Try to click Next on any popup
            try {
                const clicked = await robustClick(['Next', 'NEXT', 'next', 'Next >', '>>'], false);
                if (clicked) {
                    console.log('Found and clicked Next button on the popup!');
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch(e) {}
            
            const dirsToCheck = [downloadPath, userDownloadsPath];
            for (const dir of dirsToCheck) {
                if (!fs.existsSync(dir)) continue;
                const files = fs.readdirSync(dir);
                // Only a RECENT partial counts as "still downloading"; a stale
                // leftover from an earlier run must not block detection forever.
                const partial = files.find(f => f.endsWith('.crdownload') || f.endsWith('.tmp'));
                if (partial) {
                    try {
                        if (Date.now() - fs.statSync(path.join(dir, partial)).mtimeMs < 30000) continue;
                    } catch { /* ignore */ }
                }

                const oldFiles = dir === downloadPath ? filesBeforeDownload1 : filesBeforeDownload2;
                const newFiles = files
                    .filter(f => !oldFiles.has(f) && !f.endsWith('.crdownload') && !f.endsWith('.tmp'))
                    .map(f => {
                        const full = path.join(dir, f);
                        let size = 0;
                        try { size = fs.statSync(full).size; } catch { /* ignore */ }
                        return { full, size };
                    })
                    .filter(x => x.size > 0)
                    .sort((a, b) => b.size - a.size); // largest new file is the real export
                if (newFiles.length > 0) {
                    const newestFile = newFiles[0].full;
                    downloadedFile = newestFile.endsWith('.csv') ? newestFile : `${newestFile}.csv`;
                    if (newestFile !== downloadedFile) {
                        try { fs.renameSync(newestFile, downloadedFile); } catch { downloadedFile = newestFile; }
                    }
                    console.log('Download complete and found CSV: ', downloadedFile);
                    break;
                }
            }
            if (downloadedFile) break;
        }
        
        if (downloadedFile) {
            console.log('Download successful! We can parse the CSV now.');

            console.log('Reading and parsing downloaded CSV file...');
            const results = [];

            // Same robust reading as the inventory scraper: handle UTF-16LE and a
            // UTF-8 BOM, and sniff the delimiter instead of assuming a comma.
            const buf = fs.readFileSync(downloadedFile);
            let rawText;
            if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
                rawText = buf.toString('utf16le').replace(/^\uFEFF/, '');
            } else {
                rawText = buf.toString('utf8').replace(/^\uFEFF/, '');
            }
            const firstLine = rawText.split('\n')[0] || '';
            const isTabDelimited = firstLine.includes('\t');
            const parser = csv({ separator: isTabDelimited ? '\t' : ',' });
            const csvStream = Readable.from([rawText]);

            const rowsCount = await new Promise((resolve, reject) => {
                csvStream.pipe(parser)
                    .on('data', (data) => {
                        // Strip a lingering BOM from the first header key.
                        const clean = {};
                        for (const k of Object.keys(data)) clean[k.replace(/^\uFEFF/, '')] = data[k];
                        const firstKey = Object.keys(clean)[0];
                        const divisionValue = clean['Division'] || clean[firstKey];

                        results.push({
                            division: divisionValue,
                            invoice_no: clean['Invoice Number'],
                            invoice_status: clean['Invoice Status'],
                            mode_of_payment: clean['Mode of Payment'],
                            invoice_type: clean['Invoice Type'],
                            part_no: clean['Part No'],
                            part_desc: clean['Part Desc'],
                            part_type: clean['Part Type'],
                            tm_part_indicator: clean['TM Part Indicator'],
                            product_category: clean['Product Category'],
                            date: clean['Date'] || null,
                            category: clean['Category'],
                            order_num: clean['Order Number'],
                            order_type: clean['Order Type'],
                            order_sub: clean['Order Sub-Type'],
                            rate: parseNumber(clean['Rate']) || 0,
                            billing_type: clean['Billing Type'],
                            sold_qty: parseNumber(clean['Sold Qty']) || 0,
                            value: parseNumber(clean['Value']) || 0,
                            tax_amount: parseNumber(clean['Tax Amount After Discount']) || 0,
                            dealer: clean['Dealer']
                        });
                    })
                    .on('end', async () => {
                        try {
                            if (!results.length) {
                                notify('No rows parsed. Keeping existing consumption data untouched.');
                                return resolve(0);
                            }

                            notify(`Finished parsing CSV. Found ${results.length} rows. Replacing existing rows...`);

                            await replaceConsumptionPeriod(supabase, results, fromDate, toDate, signal);
                            notify('Upload complete! File processed and deleted.');

                            // Clean up the downloaded file
                            try {
                                fs.unlinkSync(downloadedFile);
                                console.log('Cleaned up downloaded file.');
                            } catch (e) {
                                console.error('Could not delete file:', e);
                            }
                            resolve(results.length);
                        } catch (err) {
                            reject(err);
                        }
                    })
                    .on('error', reject);
            });
            totalRowsInserted += rowsCount;

        } else {
            throw new Error('Download timed out or failed.');
        }

    } catch (error) {
        console.error('An error occurred during scraping:', error);
        throw error;
    } finally {
        clearTimeout(watchdog);
        if (browser) {
            console.log('Closing browser...');
            try { await browser.close(); } catch (e) {}
        }
    }
    return [`ALL LOCATIONS CONSUMPTION DATA UPLOADED ${totalRowsInserted} ROWS`];
}

// Remove the self-executing call so we only run when triggered by the server
// fetchConsumptionData();

export { fetchConsumptionData };
