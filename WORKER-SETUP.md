# Automatic Fetch on Windows

The website queues Fetch Inventory and Fetch Consumption requests in Supabase.
The Windows worker downloads Tata reports and uploads them to Supabase. One
designated PC must remain on, signed in, awake and connected to the internet.
No PowerShell window needs to stay open after the background worker is installed.

## One-time setup

In PowerShell, in the project folder:

```powershell
git pull --ff-only origin main
npm.cmd run worker:install
```

Dependencies and Puppeteer's Chrome must already be installed. For a new checkout,
run `npm.cmd ci` and `npx.cmd puppeteer browsers install chrome` first. Use the same
Windows account that installed Chrome and configured the Tata credentials.

The installer registers `TataOMS-Worker` for the current Windows account, starts
it immediately, and checks that the task remains running. Its supervisor runs
hidden, writes logs and restarts Node after exits. Windows starts it again at
each sign-in. It does not require administrator privileges or a stored Windows
password. If Windows denies task registration, an administrator must allow it.

After successful installation, close the previous manual worker terminal. The
existing worker lock prevents the background worker from duplicating that manual
worker; it takes over after the manual process exits.

Users can then click Fetch on the website. Realtime usually starts jobs immediately;
the fallback poll checks every 30 seconds. Stock is replaced only after the new
location report is downloaded, validated and uploaded.

## Check or remove

```powershell
npm.cmd run worker:status
npm.cmd run worker:start
npm.cmd run worker:uninstall
```

`logs/worker-service.log` records supervisor starts/restarts. The latest Node
process output and errors are in `logs/worker-output.log` and
`logs/worker-error.log`. Do not post credentials or entire report files publicly.

If the PC is off, asleep or signed out, jobs wait until the worker is available.
For operation independent of this PC, install the worker on an always-on host
that can reach Tata; the website alone is currently a queue, not the scraper host.

Before updating a running installation, let active Fetch tasks finish. Pull the
latest code and run `npm.cmd run worker:install` again to refresh the startup task.

## Add a Tata location from Settings

After installing the updated worker once, run
`npm.cmd run worker:access -- --open` on the worker PC. Sign in as admin in the
browser that opens. Settings opens and fills the private setup code automatically.
It stays only in that tab's session, bound to the admin username, and is cleared
on logout. A closed tab/new browser needs pairing again. Ordinary Fetch does not
require this setup code.

The code travels in a URL fragment (never sent in HTTP requests) and is removed
from the address/history immediately. Do not share the pairing link. Running
`npm.cmd run worker:access` without `-- --open` still displays the code for private
copying; do not post it in chat or screenshots.

Enter the location name, Tata username and password, then click **Test & Save**.
The browser verifies the worker identity using the setup code and encrypts the
request before writing it to Supabase. The worker authorizes and tests the login
and inventory report access. Only a successful test creates/updates the location.
Testing does not download stock or change inventory/consumption records.

New passwords are encrypted in `tata_locations.password`. The private decryption
key and setup code stay in `%USERPROFILE%\.tata-oms-worker\identity.json`, outside
the checkout. Only the worker can read those passwords back. Existing legacy
credentials/environment configuration continue to work. Credentials saved through
Settings take precedence over older environment credentials for the same location.

Keep the identity folder private and back it up securely: a replacement worker
needs the same identity to decrypt saved credentials. If it is lost, locations
must be tested/saved again with their Tata passwords. Do not delete the identity
when updating the Git checkout. The setup code grants credential-management
access independently of the browser's existing local user accounts.
