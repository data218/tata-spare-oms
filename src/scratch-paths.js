import fs from 'fs';
import os from 'os';
import path from 'path';

// Vercel functions run on a read-only filesystem with writable /tmp scratch space
// (500 MB). Everything the scrapers produce -- the Chrome profile, the downloaded
// exports, and the debug screenshots/dumps -- has to live under /tmp or the run
// dies with EROFS as soon as it touches the filesystem.
//
// A fresh directory per invocation also stops the download poller from picking up
// files left behind by an earlier run.
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'tata-scraper-'));

export const profileDir = path.join(ROOT, 'chrome-profile');
export const downloadDir = path.join(ROOT, 'downloads');

export function scratch(name) {
  return path.join(ROOT, name);
}
