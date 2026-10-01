import puppeteer from 'puppeteer';
import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// puppeteer-extra resolves any plugin it considers "missing" through a dynamic
// `require(name)` that Vercel's dependency tracer cannot follow. Importing them
// statically keeps them and their transitive deps inside the lambda bundle.
import 'puppeteer-extra-plugin-user-data-dir';
import 'puppeteer-extra-plugin-user-preferences';

// The stealth plugin lazy-requires each evasion by name at runtime. Vercel's
// file tracer cannot follow those dynamic requires, so every evasion is missing
// from the bundle and the first one to load throws MODULE_NOT_FOUND. Import
// them statically so they are traced and included.
import 'puppeteer-extra-plugin-stealth/evasions/chrome.app/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/chrome.csi/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/chrome.runtime/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/defaultArgs/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/media.codecs/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.languages/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.permissions/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.plugins/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.vendor/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.webdriver/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/sourceurl/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/user-agent-override/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/webgl.vendor/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/window.outerdimensions/index.js';

// puppeteer-extra's default export is built by require()ing 'puppeteer' and then
// 'puppeteer-core' from its CommonJS bundle. puppeteer 25.x is ESM-only, so those
// require() calls throw ERR_REQUIRE_ESM on any runtime without require(esm) support.
// puppeteer-extra swallows both errors and only rethrows the last one from its
// `pptr` getter, which launch() reads -- so the failure surfaces at browser launch
// instead of at import time, with no hint that the import itself was the problem.
//
// Passing the real (ESM) puppeteer instance to addExtra() skips that lookup
// entirely, so the scrapers no longer depend on the lambda's Node version.
const extra = addExtra(puppeteer);
extra.use(StealthPlugin());

// Flags Chrome needs in a container regardless of where it runs. Serverless
// runtimes have no sandbox and a tiny /dev/shm, and the portal uses a cert the
// container does not trust.
const baseArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-popup-blocking',
  '--ignore-certificate-errors',
];

// Launches the stealth-wrapped browser. On Vercel there is no system Chrome and
// npm skips `puppeteer`'s postinstall browser download (install scripts are not
// allowed), so a plain launch() looks for a Chrome that was never fetched.
// @sparticuz/chromium ships a headless build matched to this puppeteer version
// and unpacks it into the writable /tmp at runtime.
export async function launchBrowser(overrides = {}) {
  const { args: extraArgs = [], ...rest } = overrides;
  const options = {
    headless: process.env.SCRAPER_HEADLESS === 'false' ? false : 'new',
    protocolTimeout: Number(process.env.SCRAPER_PROTOCOL_TIMEOUT || 180000),
    defaultViewport: null,
    ...rest,
    args: [...baseArgs, ...extraArgs],
  };

  if (process.env.VERCEL) {
    const { default: chromium } = await import('@sparticuz/chromium');
    options.executablePath = await chromium.executablePath();
    // @sparticuz/chromium ships chrome-headless-shell, so puppeteer must run in
    // its 'shell' headless mode. The package bakes the matching --headless flag
    // into chromium.args and exposes no `headless` property of its own.
    options.headless = process.env.SCRAPER_HEADLESS === 'false' ? false : 'shell';
    // `--single-process` is in @sparticuz's default set, but it breaks the
    // multi-frame/AJAX behaviour the Siebel portal relies on, so the report
    // navigation silently does nothing. Drop it and keep the rest.
    options.args = [...chromium.args.filter(a => a !== '--single-process'), ...baseArgs, ...extraArgs];
  } else if (process.env.SCRAPER_CHANNEL) {
    options.channel = process.env.SCRAPER_CHANNEL;
  }

  return extra.launch(options);
}

export default extra;
