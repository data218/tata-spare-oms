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
