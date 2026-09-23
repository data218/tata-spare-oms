import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';
dotenv.config();
puppeteer.use(StealthPlugin());

const SUPABASE_URL = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchInventoryData(onProgress = null, targetLocation = 'ALL') {
    let summaryMessages = [];
    const notify = (msg) => {
        console.log(msg);
        if (onProgress) onProgress(msg);
    };
    notify('Fetching locations from Supabase...');
    let { data: locations, error: locError } = await supabase.from('tata_locations').select('*');
    if (locError) {
        throw new Error('Failed to fetch locations: ' + locError.message);
    }
    
    if (targetLocation && targetLocation !== 'ALL') {
        locations = locations.filter(l => l.location_name === targetLocation);
    }
    
    if (!locations || locations.length === 0) {
        throw new Error(`No locations found for ${targetLocation}. Please add a location in Settings.`);
    }

    notify(`Clearing old data from Supabase for ${targetLocation}...`);
    let deleteQuery = supabase.from('tata_spare_inventory').delete();
    if (targetLocation && targetLocation !== 'ALL') {
        deleteQuery = deleteQuery.eq('division', targetLocation);
    } else {
        deleteQuery = deleteQuery.neq('division', 'DELETE_ALL');
    }
    
    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
        console.error('Warning: Failed to delete old data.', deleteError.message);
    } else {
        notify('Old data removed successfully.');
    }

    for (const location of locations) {
        notify(`Starting automated bot for Inventory Data (Location: ${location.location_name})...`);
        const browser = await puppeteer.launch({
            headless: false,
            channel: 'chrome',
            userDataDir: path.resolve('./chrome-profile'),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-popup-blocking',
                '--window-size=1920,1080',
                '--ignore-certificate-errors'
            ],
            defaultViewport: null
        });
        const page = await browser.newPage();
    
    // Auto-dismiss dialogs so page.screenshot and evaluation don't hang
    page.on('dialog', async dialog => {
        console.log(`[Dialog caught]: ${dialog.message()}`);
        await dialog.dismiss();
    });

    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    const LOGIN_URL = 'https://carsdms.inservices.tatamotors.com/siebel/app/workshop/enu?SWECmd=Start';

    try {
        // Navigate to the provided URL
        notify('Navigating to login page...');
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });

        // Detect Tata server "busy / experiencing difficulties" page and retry
        for (let busyRetry = 0; busyRetry < 5; busyRetry++) {
            const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
            if (bodyText.toLowerCase().includes('busy or experiencing difficulties')) {
                notify(`Tata server busy. Retrying navigation (${busyRetry + 1}/5)...`);
                await new Promise(r => setTimeout(r, 30000));
                await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
            } else {
                break;
            }
        }
        
        // Take a screenshot of the login page just in case
        await page.screenshot({ path: 'debug_login_page.png' });
        const html = await page.content();
        fs.writeFileSync('page.html', html);
        console.log('Saved page.html for inspection');
let botUser = location.username;
        let botPass = location.password;

        if (!botUser || !botPass) {
            throw new Error(`Tata Siebel login credentials missing for ${location.location_name}. Add username/password in tata_locations table.`);
        }

        notify(`Logging in as: ${botUser} for location ${location.location_name}`);
        console.log(`Logging in as: ${botUser} for location ${location.location_name}`);

        notify('Submitting login credentials...');
        console.log('Submitting login credentials...');
        
        // Wait for Siebel login form (it loads after a JS redirect chain - be patient)
        await page.waitForSelector('input[name="SWEUserName"]', { visible: true, timeout: 60000 });
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
        await page.type('input[name="SWEUserName"]', botUser);
        await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
        await page.type('input[name="SWEPassword"]', botPass);
        
        // Click Siebel Login button
        await page.click('#s_swepi_22');
        
        notify('Login submitted. Waiting for dashboard to load...');
        await new Promise(r => setTimeout(r, 5000));
        
        // FIX for Siebel Quirks: Sometimes the first login click returns a false 'incorrect password'
        // error even though the credentials are valid (observed: the app only opens after the credentials
        // are entered a second time and Login is clicked again within ~5 seconds). Siebel usually clears
        // the fields after the fake error, so plain re-clicks do nothing - we must re-type both fields.
        let bodyText = await page.evaluate(() => document.body.innerText);
        const hasLoginError = () => bodyText.includes('user ID or password that you entered is incorrect') || bodyText.includes('SBL-UIF-00272');
        for (let attempt = 1; hasLoginError() && attempt <= 3; attempt++) {
            console.log(`Detected Siebel false login error. Re-entering credentials and clicking Login (attempt ${attempt})...`);
            notify("Siebel Quirk Detected: Re-entering credentials and clicking Login within a few seconds...");

            await page.click('input[name="SWEUserName"]', { clickCount: 3 }).catch(() => {});
            await page.type('input[name="SWEUserName"]', botUser, { delay: 80 }).catch(() => {});
            await page.click('input[name="SWEPassword"]', { clickCount: 3 }).catch(() => {});
            await page.type('input[name="SWEPassword"]', botPass, { delay: 80 }).catch(() => {});

            // Click Login quickly (within a few seconds of typing)
            await new Promise(r => setTimeout(r, 500));
            await page.click('#s_swepi_22').catch(() => console.log('Could not click Login button, trying once more...'));

            await new Promise(r => setTimeout(r, 5000));
            bodyText = await page.evaluate(() => document.body.innerText);
        }

        if (!hasLoginError()) {
            // Login succeeded - wait extra for the dashboard to render
            await new Promise(r => setTimeout(r, 5000));
        }
        
        // Take screenshot after login
        await page.screenshot({ path: 'debug_after_login.png' });
        
        // Final check if login failed
        bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('user ID or password that you entered is incorrect') || bodyText.includes('SBL-UIF-00272')) {
            throw new Error(`Login failed for ${botUser}: Invalid credentials.`);
        }

        notify('Login successful. Navigating to Inventory report via Site Map...');
        
        async function robustClickText(textArr, isExact = false, targetMatchIndex = 0) {
            console.log(`Looking for: ${textArr.join(' OR ')}`);

            for (const text of textArr) {
                for (const frame of page.frames()) {
                    try {
                        // First try clickable tags
                        let xpath = isExact
                            ? `//a[normalize-space(.)="${text}" or @title="${text}" or @alt="${text}"] | //button[normalize-space(.)="${text}" or @title="${text}" or @alt="${text}"] | //img[@title="${text}" or @alt="${text}"]`
                            : `//a[contains(normalize-space(.), "${text}") or contains(@title, "${text}") or contains(@alt, "${text}")] | //button[contains(normalize-space(.), "${text}") or contains(@title, "${text}") or contains(@alt, "${text}")] | //img[contains(@title, "${text}") or contains(@alt, "${text}")]`;

                        let elementsCount = await frame.evaluate((xp) => {
                            return document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength;
                        }, xpath);
                        
                        let useFallback = elementsCount === 0;
                        if (useFallback) {
                            xpath = isExact
                                ? `//*[normalize-space(.)="${text}" or @title="${text}" or @alt="${text}"]`
                                : `//*[contains(normalize-space(.), "${text}") or contains(@title, "${text}") or contains(@alt, "${text}")]`;
                            elementsCount = await frame.evaluate((xp) => {
                                return document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength;
                            }, xpath);
                        }

                        let visibleCount = 0;
                        for (let i = 0; i < elementsCount; i++) {
                            let elHandle = await frame.evaluateHandle((xp, idx) => {
                                return document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(idx);
                            }, xpath, i);

                            // check if visible
                            const isVisible = await elHandle.evaluate(el => {
                                const style = window.getComputedStyle(el);
                                return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && el.offsetWidth > 0 && el.offsetHeight > 0;
                            });
                            
                            if (!isVisible) continue; // skip hidden elements
                            
                            if (visibleCount < targetMatchIndex) {
                                visibleCount++;
                                continue; // wait until we reach the target index
                            }

                            await elHandle.evaluate(el => {
                                el.scrollIntoView({
                                    behavior: 'instant',
                                    block: 'center',
                                    inline: 'center'
                                });
                            });

                            // Give Siebel a tiny moment to render the scrolled element
                            await new Promise(r => setTimeout(r, 100));

                            try {
                                await elHandle.click({ delay: 50 });
                            } catch (clickError) {
                                console.log(`Normal click failed for "${text}", trying JS click...`);

                                await elHandle.evaluate(el => {
                                    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                                    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                                    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                                    el.click();
                                });
                            }

                            console.log(`SUCCESS: Clicked "${text}" (Match ${i+1}/${elementsCount})`);
                            return true;
                        }

                    } catch (err) {
                        // ignore frame errors silently to avoid spam
                    }
                }
            }

            console.log(`FAILED: Could not find any of: ${textArr.join(', ')}`);
            return false;
        }

        // 0. (Removed OBIEE dashboard click)
        await new Promise(r => setTimeout(r, 2000));

        // 1. Try clicking Site Map
        console.log('Clicking Site Map icon...');
        // Siebel Site Map icon usually has title="Site Map"
        const siteMapClicked = await page.evaluate(() => {
            const el = document.querySelector('[title="Site Map"], [title="Sitemap"], img[alt="Site Map"]');
            if (el) { el.click(); return true; }
            return false;
        });
        if (!siteMapClicked) {
            await robustClickText(['Site Map', 'SiteMap']);
        }
        
        console.log('Waiting for Site Map (Screens) to load...');
        await page.waitForSelector('::-p-text(Screens)', { visible: true, timeout: 30000 }).catch(e => console.log('Screens text not found, continuing...'));
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'debug_site_map.png' });

        // 2. Click on MIS - Spares (in the Site Map - Category)
        console.log('Clicking MIS - Spares in Site Map (Category)...');
        await robustClickText(['MIS - Spares', 'MIS Spares'], false, 0); // 0 = First visible match
        await new Promise(r => setTimeout(r, 5000));
        
        // 2.5 Click on MIS - Spares AGAIN (in the Site Map - Link)
        console.log('Clicking MIS - Spares in Site Map (Link)...');
        await robustClickText(['MIS - Spares', 'MIS Spares'], false, 1); // 1 = Second visible match
        await new Promise(r => setTimeout(r, 10000));

        // 3.5 Click on Spares Inventory (sub-tab)
        console.log('Clicking Spares Inventory tab...');
        await robustClickText(['Spares Inventory']);
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: 'debug_after_spares_inventory_tab.png' });

        // 4. Wait for report/applet to load
        notify('Waiting for Inventory applet to load...');
        await new Promise(r => setTimeout(r, 5000));

        // 5. DOWN ARROW
        // Sometimes an OK button needs to be clicked after selecting in a prompt
        await robustClickText(['OK', 'Ok']);
        await new Promise(r => setTimeout(r, 8000));
        await page.screenshot({ path: 'debug_after_ok.png' });

        notify('Waiting for potential prompt to load (15s)...');
        await new Promise(r => setTimeout(r, 15000));
        
        console.log('Attempting to click OK if there is a prompt...');
        let clickedOk = false;
        for (const frame of page.frames()) {
            try {
                await frame.click('::-p-text(OK)');
                console.log('Clicked OK using Puppeteer CDP in frame!');
                clickedOk = true;
                break;
            } catch (e) {
                // fallback
                try {
                    const found = await frame.evaluate(() => {
                        const elements = Array.from(document.querySelectorAll('button, input[type="button"], a, td, div, span'));
                        const okBtn = elements.find(el => el.textContent && el.textContent.trim() === 'OK' && el.offsetParent !== null && el.children.length === 0);
                        if (okBtn) { okBtn.click(); return true; }
                        
                        const okLoose = elements.find(el => el.textContent && el.textContent.trim() === 'OK' && el.offsetParent !== null);
                        if (okLoose) { okLoose.click(); return true; }
                        return false;
                    });
                    if (found) {
                        console.log('Clicked OK using evaluate fallback!');
                        clickedOk = true;
                        break;
                    }
                } catch (err) {}
            }
        }
        
        if (!clickedOk) {
            console.log('No OK button found or clicked. Assuming no prompt.');
        }

        notify('Waiting for the data table to load...');
        
        console.log('Clicking Go to execute default query just in case it is empty...');
        for(let i = 0; i < 15; i++) {
            const foundGo = await robustClickText(['Go']);
            if (foundGo) break;
            await new Promise(r => setTimeout(r, 2000));
        }
        
        console.log('Setting up download behavior...');
        const downloadPath = path.resolve('./downloads');
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

        notify('Exporting report...');
        
        console.log('Extracting ALL text from all frames...');
        let allElements = [];
        for (const frame of page.frames()) {
            try {
                const els = await frame.evaluate(() => {
                    const nodes = Array.from(document.querySelectorAll('*'));
                    return nodes
                        .filter(n => (n.textContent && n.textContent.trim()) || (n.alt && n.alt.trim()) || (n.title && n.title.trim()) || (n.value && n.value.trim()))
                        .map(n => ({
                            tag: n.tagName,
                            text: n.textContent ? n.textContent.trim().substring(0, 50) : '',
                            alt: n.alt || '',
                            title: n.title || '',
                            value: n.value || '',
                            id: n.id || '',
                            className: n.className || ''
                        }));
                });
                allElements = allElements.concat(els);
            } catch (e) {}
        }
        fs.writeFileSync('all_elements.json', JSON.stringify(allElements, null, 2));
        console.log('Saved all_elements.json');

        let foundDownload = false;
        for (let i = 0; i < 6; i++) {
            console.log(`Clicking Download to Excel... (Attempt ${i+1})`);
            foundDownload = await robustClickText(['Download to Excel', 'Download To Excel', 'Download excel']);
            if (foundDownload) break;
            await new Promise(r => setTimeout(r, 5000));
        }
        if (!foundDownload) console.log('WARNING: Could not find Download to Excel button');
        
        await new Promise(r => setTimeout(r, 5000));
        
        let foundNext = false;
        for (let i = 0; i < 30; i++) {
            console.log(`Clicking Next on popup... (Attempt ${i+1})`);
            
            // Use evaluate for a guaranteed click
            for (const frame of [page, ...page.frames()]) {
                try {
                    foundNext = await frame.evaluate(() => {
                        const allEls = Array.from(document.querySelectorAll('*'));
                        const nextBtn = allEls.find(el => {
                            // Only check elements that have no element children (leaf nodes)
                            if (el.children.length > 0) return false;
                            const text = el.tagName === 'INPUT' ? el.value : el.textContent;
                            return text && text.trim() === 'Next' && el.offsetWidth > 0;
                        });
                        if (nextBtn) {
                            console.log('Found Next element:', nextBtn.tagName);
                            nextBtn.click();
                            nextBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                            nextBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                            nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                            return true;
                        }
                        return false;
                    });
                    if (foundNext) {
                        console.log('SUCCESS: Clicked "Next" button!');
                        break;
                    }
                } catch (e) {}
            }
            if (foundNext) break;
            await new Promise(r => setTimeout(r, 2000));
        }
        if (!foundNext) console.log('WARNING: Could not find Next button using evaluate');
        
        console.log('Waiting 3 seconds for Siebel to generate the file...');
        await new Promise(r => setTimeout(r, 3000));
        await page.screenshot({ path: 'debug_after_next.png' });

        console.log('Waiting for download to complete (polling downloads folder)...');
        const timeout = 120000; // 2 minutes
        const start = Date.now();
        let downloadedFile = null;
        
        while (Date.now() - start < timeout) {
            const files = fs.readdirSync(downloadPath);
            const crdownload = files.find(f => f.endsWith('.crdownload'));
            if (!crdownload) {
                // Find the most recently modified file since allowAndName uses UUIDs
                let newestFile = null;
                let newestTime = 0;
                for (const file of files) {
                    const fullPath = path.join(downloadPath, file);
                    const stats = fs.statSync(fullPath);
                    if (stats.mtimeMs > newestTime) {
                        newestTime = stats.mtimeMs;
                        newestFile = fullPath;
                    }
                }
                
                // Only consider it a match if it was created/modified after we started polling
                if (newestFile && newestTime > start - 10000) {
                    // Rename it to .csv so parser doesn't get confused
                    downloadedFile = newestFile + '.csv';
                    fs.renameSync(newestFile, downloadedFile);
                    console.log('Download complete and renamed to CSV: ', downloadedFile);
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!downloadedFile) {
            await page.screenshot({ path: 'debug_download_failed.png' });
            throw new Error('Download timed out or failed.');
        }
        
        if (downloadedFile) {
            console.log('Download successful! We can parse the file now.');
            
            console.log('Old data already cleared. Proceeding to parse.');

            console.log('Reading and parsing downloaded file...');
            const results = [];

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
                        const firstKey = Object.keys(data)[0];
                        
                        const val = (key, alt1, alt2) => data[key] || (alt1 ? data[alt1] : null) || (alt2 ? data[alt2] : null);

                        results.push({
                            division: location.location_name,
                            part_no: val('Part #', 'Part Number'),
                            description: val('Description', 'Descriptic', 'Descriptio'),
                            qty: parseFloat(val('Qty', 'Quantity')) || 0,
                            total_price: parseFloat(val('Total Price')) || 0,
                            last_issue: val('Last Issue Date', 'Last Issue'),
                            last_receipt: val('Last Received Date', 'Last Receipt'),
                            availability: val('Availability', 'Availabilit'),
                            status: val('Status'),
                            product_category: val('Product Category', 'Product C'),
                            dealer_name: val('Dealer Name', 'Dealer Na'),
                            hsn: val('HSN'),
                            location_3: val('Location 3'),
                            location_2: val('Location 2'),
                            location_1: val('Location 1'),
                            min: parseFloat(val('Min', 'Minimum')) || 0,
                            max: parseFloat(val('Max', 'Maximum')) || 0,
                            inventory_indicator: val('Inventory Location', 'Inventory Indicator', 'Inventory I'),
                            xyz_class: val('XYZ Class'),
                            abc_class: val('ABC Class'),
                            vendor: val('Vendor'),
                            weighted_average: val('Weighted Average', 'Weighted '),
                            safety_stock: val('Safety', 'Safety Stock'),
                            tm_part_indicator: val('TM Part Indicator', 'TM Part In'),
                            product_line: val('Product Line', 'Product Li')
                        });
                    })
                    .on('end', async () => {
                        try {
                            notify(`Finished parsing CSV for ${location.location_name}. Found ${results.length} rows. Uploading to database...`);
                            const BATCH_SIZE = 1000;
                            console.log(`Starting upload to Supabase in batches of ${BATCH_SIZE}...`);
                            
                            for (let i = 0; i < results.length; i += BATCH_SIZE) {
                                const batch = results.slice(i, i + BATCH_SIZE);
                                const { error: insertError } = await supabase.from('tata_spare_inventory').insert(batch);
                                if (insertError) {
                                    console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError.message);
                                    throw insertError;
                                } else {
                                    console.log(`Successfully inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
                                }
                            }
                            notify(`Upload complete for ${location.location_name}! File processed and deleted.`);
                            
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
            
            summaryMessages.push(`${location.location_name} INVENTORY DATA UPLOADED ${rowsCount} ROWS`);
            notify(`${location.location_name} INVENTORY DATA UPLOADED ${rowsCount} ROWS`);

        } else {
            throw new Error('Download timed out or failed.');
        }

    } catch (error) {
        console.error(`An error occurred during scraping for ${location.location_name}:`, error);
        notify(`ERROR: ${location.location_name} failed due to: ${error.message}`);
        // Do NOT throw error, so it can continue to the next location
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
    } // End of locations loop
    return summaryMessages;
}

// Remove the self-executing call so we only run when triggered by the server
// fetchConsumptionData();

export { fetchInventoryData };
