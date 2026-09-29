import puppeteer from 'puppeteer';
import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// puppeteer-extra resolves any plugin it considers "missing" through a dynamic
// `require(name)` that Vercel's dependency tracer cannot follow. Importing them
// statically keeps them and their transitive deps inside the lambda bundle.
import 'puppeteer-extra-plugin-user-data-dir';
import 'puppeteer-extra-plugin-user-preferences';

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

export default extra;
