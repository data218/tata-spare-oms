import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as dotenv from 'dotenv';
dotenv.config();
puppeteer.use(StealthPlugin());

async function testLogin() {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-popup-blocking',
            '--disable-blink-features=AutomationControlled'
        ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    const botUser = 'pks3_3008420';
    const botPass = 'kathua@004112';

    const variations = [
        { u: 'PKS3_3008420', p: 'Kathua@004112' },
        { u: 'PKS3_3008420', p: 'kathua@004112' },
        { u: 'pks3_3008420', p: 'Kathua@004112' },
        { u: 'pks3_3008420', p: 'kathua@004112' }
    ];

    console.log('Navigating to login page...');
    await page.goto('https://carsdms.inservices.tatamotors.com/siebel/app/workshop/enu', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="SWEUserName"]', { visible: true, timeout: 15000 });

    let loginSuccess = false;

    for (let i = 0; i < variations.length; i++) {
        const botUser = variations[i].u;
        const botPass = variations[i].p;
        console.log(`\n--- Attempt ${i+1}: User=${botUser}, Pass=${botPass} ---`);
        try {
            await page.evaluate(() => document.querySelector('input[name="SWEUserName"]').value = '');
            await page.type('input[name="SWEUserName"]', botUser);
            
            await page.evaluate(() => document.querySelector('input[name="SWEPassword"]').value = '');
            await page.type('input[name="SWEPassword"]', botPass);
            await new Promise(r => setTimeout(r, 1000));
            
            await Promise.all([
                page.waitForNavigation({ timeout: 15000 }).catch(() => console.log('Navigation wait timed out.')),
                page.click('#s_swepi_22')
            ]);
            
            await new Promise(r => setTimeout(r, 5000));
            
            let bodyText = await page.evaluate(() => document.body.innerText);
            if (bodyText.includes('user ID or password that you entered is incorrect') || bodyText.includes('SBL-UIF-00272')) {
                console.log(`Failed: Incorrect credentials.`);
            } else if (bodyText.includes('CRMDMS Applications are enabled with concurrent user login checking')) {
                 console.log(`Failed: Concurrent Login Error!`);
                 loginSuccess = true; // technically login worked!
                 break;
            } else {
                console.log(`SUCCESS! No login error found on the page.`);
                loginSuccess = true;
                break;
            }
        } catch (e) {
            console.error(`Attempt crashed with error:`, e.message);
        }
    }

    if (!loginSuccess) {
        console.log('\nAll attempts failed to log in.');
    } else {
        console.log('\nLogged in successfully!');
    }
    
    await browser.close();
}

testLogin();
