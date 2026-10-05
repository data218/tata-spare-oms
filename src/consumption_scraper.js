import { launchBrowser } from './puppeteer-runtime.js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { supabase } from './server-config.js';
import { downloadDir, scratch } from './scratch-paths.js';
import { loginToPortal } from './portal-login.js';
dotenv.config();

async function fetchConsumptionData(fromDate, toDate, onProgress = null) {
    let totalRowsInserted = 0;
    const notify = (msg) => {
        console.log(msg);
        if (onProgress) onProgress(msg);
    };
    if (!fromDate || !toDate) {
        throw new Error("fromDate and toDate are required.");
    }

    notify('Fetching master credentials from Supabase...');
    const { data: settings, error: setErr } = await supabase.from('tata_bot_settings').select('*');
    if (setErr) throw new Error('Failed to fetch settings from Supabase');

    const uRow = settings.find(r => r.key === 'master_username' || r.key === 'tata_bi_username');
    const pRow = settings.find(r => r.key === 'master_password' || r.key === 'tata_bi_password');
    
    if (!uRow || !pRow) {
        throw new Error('Master credentials not found in tata_bot_settings table. Please save Tata BI Portal Credentials in Settings.');
    }
    
    const location = { location_name: 'Master', username: uRow.value, password: pRow.value };

    notify('Consumption refresh starting (existing rows are kept until new data is parsed).');

    notify(`Starting automated bot for Consumption Data (Date Range: ${fromDate} to ${toDate})...`);
        const browser = await launchBrowser({
            args: [
                '--disable-blink-features=AutomationControlled'
            ]
        });
    const page = await browser.newPage();
    
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
        
        async function robustClick(textToFind) {
            let clicked = false;
            for (const frame of [page, ...page.frames()]) {
                try {
                    clicked = await frame.evaluate((txt) => {
                        const links = Array.from(document.querySelectorAll('a, span, div, td'));
                        const target = links.find(el => el.textContent && el.textContent.trim() === txt);
                        if (target) {
                            target.click();
                            return true;
                        }
                        return false;
                    }, textToFind);
                    if (clicked) return true;
                } catch (err) {}
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

        console.log('Clicking Data...');
        let foundData = false;
        for(let i = 0; i < 10; i++) {
            foundData = await robustClick('Data');
            if (foundData) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!foundData) console.log('WARNING: Could not find Data button');

        console.log('Clicking CSV...');
        let foundCSV = false;
        const filesBeforeDownload = new Set(fs.readdirSync(downloadPath));
        for(let i = 0; i < 10; i++) {
            foundCSV = await robustClick('CSV');
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
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const files = fs.readdirSync(downloadPath);
            const crdownload = files.find(f => f.endsWith('.crdownload') || f.endsWith('.tmp'));
            if (!crdownload) {
                const newFiles = files.filter(f => !filesBeforeDownload.has(f));
                if (newFiles.length > 0) {
                    const newestFile = path.join(downloadPath, newFiles[0]);
                    downloadedFile = newestFile + '.csv';
                    fs.renameSync(newestFile, downloadedFile);
                    console.log('Download complete and renamed to CSV: ', downloadedFile);
                    break;
                }
            }
        }
        
        if (downloadedFile) {
            console.log('Download successful! We can parse the CSV now.');
            
            console.log('Old data already cleared. Proceeding to parse.');

            console.log('Reading and parsing downloaded CSV file...');
            const results = [];
            
        const rowsCount = await new Promise((resolve, reject) => {
            fs.createReadStream(downloadedFile)
                    .pipe(csv())
                    .on('data', (data) => {
                        const firstKey = Object.keys(data)[0];
                        const divisionValue = data['Division'] || data[firstKey];
                        
                        results.push({
                            division: divisionValue,
                            invoice_no: data['Invoice Number'],
                            invoice_status: data['Invoice Status'],
                            mode_of_payment: data['Mode of Payment'],
                            invoice_type: data['Invoice Type'],
                            part_no: data['Part No'],
                            part_desc: data['Part Desc'],
                            part_type: data['Part Type'],
                            tm_part_indicator: data['TM Part Indicator'],
                            product_category: data['Product Category'],
                            date: data['Date'] || null,
                            category: data['Category'],
                            order_num: data['Order Number'],
                            order_type: data['Order Type'],
                            order_sub: data['Order Sub-Type'],
                            rate: parseFloat(data['Rate']) || 0,
                            billing_type: data['Billing Type'],
                            sold_qty: parseFloat(data['Sold Qty']) || 0,
                            value: parseFloat(data['Value']) || 0,
                            tax_amount: parseFloat(data['Tax Amount After Discount']) || 0,
                            dealer: data['Dealer']
                        });
                    })
                    .on('end', async () => {
                        try {
                            if (!results.length) {
                                notify('No rows parsed. Keeping existing consumption data untouched.');
                                return resolve(0);
                            }

                            notify(`Finished parsing CSV. Found ${results.length} rows. Replacing existing rows...`);

                            // Clear only after we hold real replacement rows, so a failed
                            // download can never leave the table empty.
                            const { error: deleteError } = await supabase
                                .from('tata_consumption_data')
                                .delete()
                                .neq('division', 'DELETE_ALL');
                            if (deleteError) {
                                throw new Error('Failed to clear old consumption rows: ' + deleteError.message);
                            }

                            const BATCH_SIZE = 1000;
                            console.log(`Starting upload to Supabase in batches of ${BATCH_SIZE}...`);
                            
                            for (let i = 0; i < results.length; i += BATCH_SIZE) {
                                const batch = results.slice(i, i + BATCH_SIZE);
                                const { error: insertError } = await supabase.from('tata_consumption_data').insert(batch);
                                if (insertError) {
                                    console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError.message);
                                    throw insertError;
                                } else {
                                    console.log(`Successfully inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
                                }
                            }
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
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }
    return [`ALL LOCATIONS CONSUMPTION DATA UPLOADED ${totalRowsInserted} ROWS`];
}

// Remove the self-executing call so we only run when triggered by the server
// fetchConsumptionData();

export { fetchConsumptionData };
