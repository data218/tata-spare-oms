# Fetch workflow

The dashboard queues work through `/api/sync`; `local-worker.mjs` performs the
portal scraping. Vercel hosts the dashboard/API, not the permanent worker.

- Pending and processing jobs retain their queued locations. Consumption tasks
  are identified by date range, so another range does not silently reuse dates.
- Stop marks a job cancelled. The updated worker checks cancellation while
  scraping, closes its browser, and does not revive cancelled jobs.
- Consumption imports replace only their requested date interval, preserving
  history outside that interval. Partial/aborted consumption uploads are cleaned
  up before a retry. No database migration is required.
- Progress monitoring reports missing jobs, repeated read failures and a worker
  that has not picked up a queued job within two minutes. A monitoring timeout
  does not cancel server-side work; check the worker before submitting again.

## Validate

```sh
npm ci
npm run test:fetch
npm run build
```

The fetch regression suite uses in-memory database adapters and does not queue
live work or change production records. Run `npm test` for all arithmetic and
fetch tests, and `npm run test:filters` for dashboard filter fixtures.

## Roll out

Deploy the same commit to Vercel and the machine running the permanent worker.
After the current scrape finishes, stop that worker, update its checkout, run
`npm ci`, and restart `npm run work` using its existing credentials. Deploying
Vercel alone does not update a worker on another machine. In Codex cloud use the
saved proxy/browser startup configuration. Confirm database access and portal
credentials before starting any worker against live jobs.
