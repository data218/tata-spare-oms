import puppeteer from 'puppeteer';
import { addExtra } from 'puppeteer-extra';
import 'puppeteer-extra-plugin-user-data-dir';
import 'puppeteer-extra-plugin-user-preferences';

// Apply stealth evasions directly, bypassing puppeteer-extra's dynamic require
// system. puppeteer-extra resolves a plugin's evasions with `require(<name>/evasions/<id>)`,
// which Vercel's dependency tracer cannot follow, so the lambda shipped without them and
// launch failed with MODULE_NOT_FOUND. The `puppeteer-extra-plugin-stealth` package is
// deliberately NOT a dependency; these vendored copies are registered one by one instead.
import ChromeApp from './stealth-plugin/evasions/chrome.app/index.js';
import ChromeCsi from './stealth-plugin/evasions/chrome.csi/index.js';
import ChromeLoadTimes from './stealth-plugin/evasions/chrome.loadTimes/index.js';
import ChromeRuntime from './stealth-plugin/evasions/chrome.runtime/index.js';
import DefaultArgs from './stealth-plugin/evasions/defaultArgs/index.js';
import IframeContentWindow from './stealth-plugin/evasions/iframe.contentWindow/index.js';
import MediaCodecs from './stealth-plugin/evasions/media.codecs/index.js';
import NavigatorHardwareConcurrency from './stealth-plugin/evasions/navigator.hardwareConcurrency/index.js';
import NavigatorLanguages from './stealth-plugin/evasions/navigator.languages/index.js';
import NavigatorPermissions from './stealth-plugin/evasions/navigator.permissions/index.js';
import NavigatorPlugins from './stealth-plugin/evasions/navigator.plugins/index.js';
import NavigatorVendor from './stealth-plugin/evasions/navigator.vendor/index.js';
import NavigatorWebdriver from './stealth-plugin/evasions/navigator.webdriver/index.js';
import Sourceurl from './stealth-plugin/evasions/sourceurl/index.js';
import UserAgentOverride from './stealth-plugin/evasions/user-agent-override/index.js';
import WebglVendor from './stealth-plugin/evasions/webgl.vendor/index.js';
import WindowOuterdimensions from './stealth-plugin/evasions/window.outerdimensions/index.js';

const evasions = [
  ChromeApp, ChromeCsi, ChromeLoadTimes, ChromeRuntime, DefaultArgs,
  IframeContentWindow, MediaCodecs, NavigatorHardwareConcurrency,
  NavigatorLanguages, NavigatorPermissions, NavigatorPlugins, NavigatorVendor,
  NavigatorWebdriver, Sourceurl, UserAgentOverride, WebglVendor,
  WindowOuterdimensions,
];

const extra = addExtra(puppeteer);
for (const Evasion of evasions) {
  extra.use(Evasion());
}

const baseArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-popup-blocking',
  '--ignore-certificate-errors',
];

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
    // @sparticuz/chromium unpacks the headless shell into /tmp and extracts the shared
    // libraries it needs (libnss3.so et al) to /tmp/al2023/lib, which it adds to
    // LD_LIBRARY_PATH. Both only happen on v129+: older builds gated the library
    // extraction on AWS_EXECUTION_ENV, which is never set on Vercel, so the binary
    // unpacked but could not resolve libnss3.so. Keep this package on the version
    // matching the Chromium revision that `puppeteer` pins.
    const { default: chromium } = await import('@sparticuz/chromium');
    options.executablePath = await chromium.executablePath();
    options.headless = process.env.SCRAPER_HEADLESS === 'false' ? false : 'shell';
    options.args = [...chromium.args.filter(a => a !== '--single-process'), ...baseArgs, ...extraArgs];
  } else if (process.env.SCRAPER_CHANNEL) {
    options.channel = process.env.SCRAPER_CHANNEL;
  }

  return extra.launch(options);
}

export default extra;
