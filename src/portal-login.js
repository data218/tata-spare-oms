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

    // Reaching the app URL first is what makes the portal mint a valid redirect
    // token and put the login form on screen.
    notify('Opening Tata BI portal...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Without a server-issued token the login page renders with an empty body and
    // no fields at all, so this wait doubles as a check that the redirect happened.
    await page.waitForSelector(LOGIN_READY_SELECTOR, { visible: true, timeout: 30000 });
    notify(`Logging in as ${username}...`);

    await page.type(LOGIN_READY_SELECTOR, username, { delay: 100 + Math.random() * 100 });
    await page.type('input[name="j_password"]', password, { delay: 100 + Math.random() * 100 });

    notify('Submitting login credentials...');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }),
        page.click('#btn_login'),
    ]);
    // The dashboard is a Knockout/Oracle JET app that keeps hydrating after load.
    await page.waitForSelector('#dashboard', { visible: true, timeout: 60000 });

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

/** Saves the current page markup for debugging a broken selector. */
export function dumpPage(page, name) {
    try {
        fs.writeFileSync(scratch(name), page.content ? '' : '');
    } catch {
        // Debug capture only; never fail a fetch over it.
    }
}
