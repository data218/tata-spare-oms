import fs from 'fs';
import { scratch } from './scratch-paths.js';

export const PORTAL_ORIGIN = 'https://insights.inservices.pv.tatamotors';

// The entry point we actually want. Requesting it while signed out makes the portal
// redirect to its own login page carrying a freshly signed `redirect` token.
//
// That token cannot be built by hand: it is base64 of the target path plus a server
// side hash. A hardcoded copy expires, and once it does the portal answers a
// successful sign-in with "Invalid redirect URL format!" and never loads the app.
export const APP_URL = `${PORTAL_ORIGIN}/analytics/saw.dll?Dashboard`;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const LOGIN_READY_SELECTOR = 'input[name="j_username"]';

/**
 * Signs in to the Tata BI portal and leaves the browser on the dashboard.
 *
 * @param {import('puppeteer').Page} page
 * @param {{ username: string, password: string }} credentials
 * @param {(msg: string) => void} notify
 */
export async function loginToPortal(page, credentials, notify = () => {}) {
    const { username, password } = credentials;
    if (!username || !password) {
        throw new Error('Portal credentials are missing.');
    }

    // Let the stealth plugin handle headers (Accept-Language, sec-ch-ua, etc.)
    // Explicitly setting mismatched Chrome versions here triggers Cloudflare.

    // Reaching the app URL first is what makes the portal mint a valid redirect
    // token and put the login form on screen.
    notify('Opening Tata BI portal...');
    
    // First visit the root domain to silently pass any Cloudflare JS challenges
    // and pick up the cf_clearance cookie before requesting the sensitive app path.
    try {
        await page.goto(PORTAL_ORIGIN, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 8000));
    } catch(e) {
        // Ignore errors here, just trying to get cookies
    }

    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Without a server-issued token the login page renders with an empty body and
    // no fields at all, so this wait doubles as a check that the redirect happened.
    //
    // The portal serves the login page only to browsers that look like browsers:
    // from a datacentre IP it can answer with a Cloudflare interstitial or an
    // empty shell instead. When that happens a bare "waiting for selector" timeout
    // says nothing about why, so report what actually came back.
    try {
        await page.waitForSelector(LOGIN_READY_SELECTOR, { visible: true, timeout: 30000 });
    } catch (cause) {
        throw new Error(`Login form never appeared. ${await describePage(page)}`, { cause });
    }
    notify(`Logging in as ${username}...`);

    // Simulate human-like mouse movements to pass bot checks
    try {
        const target = await page.$(LOGIN_READY_SELECTOR);
        if (target) {
            const box = await target.boundingBox();
            if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            }
        }
    } catch(e) {}

    await page.type(LOGIN_READY_SELECTOR, username, { delay: 100 + Math.random() * 100 });
    await page.type('input[name="j_password"]', password, { delay: 100 + Math.random() * 100 });

    notify('Submitting login credentials...');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }),
        page.click('#btn_login'),
    ]);
    // The dashboard is a Knockout/Oracle JET app that keeps hydrating after load.
    try {
        await page.waitForSelector('#dashboard', { visible: true, timeout: 60000 });
    } catch (cause) {
        throw new Error(`Signed in but the dashboard did not load. ${await describePage(page)}`, { cause });
    }

    const onLoginPage = await page.$('input[name="j_username"]');
    if (onLoginPage) {
        const message = await page.evaluate(() => {
            const el = document.querySelector('.bitech-errormsg-container');
            const style = el ? window.getComputedStyle(el) : null;
            const hidden = !el || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
            return hidden ? '' : el.textContent.trim();
        });
        throw new Error(`Login failed for ${username}${message ? `: ${message}` : ' (still on the login page)'}`);
    }

    notify('Login successful.');
    return page;
}

/**
 * Summarises what the portal actually served, so a failed login is diagnosable
 * from the job log alone instead of "waiting for selector failed".
 */
async function describePage(page) {
    try {
        const info = await page.evaluate(() => ({
            title: document.title,
            inputs: document.querySelectorAll('input').length,
            scripts: document.querySelectorAll('script').length,
            text: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        }));
        const cloudflare = /just a moment|checking your browser|cf-|enable javascript and cookies/i.test(info.title + ' ' + info.text);
        return [
            `url=${page.url().replace(PORTAL_ORIGIN, '').slice(0, 90)}`,
            `title="${info.title}"`,
            `inputs=${info.inputs}`,
            `scripts=${info.scripts}`,
            cloudflare ? 'BLOCKED by Cloudflare challenge' : null,
            info.text ? `text="${info.text}"` : 'body was empty',
        ].filter(Boolean).join(' | ');
    } catch (e) {
        return `could not inspect page: ${e.message.split('\n')[0]}`;
    }
}

/** Saves the current page markup for debugging a broken selector. */
export function dumpPage(page, name) {
    try {
        fs.writeFileSync(scratch(name), page.content ? '' : '');
    } catch {
        // Debug capture only; never fail a fetch over it.
    }
}
