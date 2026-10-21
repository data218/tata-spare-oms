export const terminalFetchStatus = (status) => ['completed', 'failed', 'cancelled'].includes(status);

// Schedule the next poll only after this one settles, avoiding overlapping reads.
export function watchFetchJob({ readJob, onUpdate, onError, jobId, now = Date.now,
  schedule = setTimeout, unschedule = clearTimeout, interval = 3000,
  pendingTimeout = 120000, timeout = 4 * 60 * 60 * 1000, maxErrors = 3 }) {
  const started = now();
  let stopped = false, timer, errors = 0;
  const stop = () => { stopped = true; unschedule(timer); };
  const poll = async () => {
    try {
      if (now() - started >= timeout) throw new Error('Progress monitoring timed out. The worker may still be running; check its logs before retrying.');
      const job = await readJob();
      if (!job) throw new Error('The fetch job is missing or is not visible to your account.');
      if (jobId && job.id !== jobId) throw new Error('Another fetch replaced this job. Refresh to view its progress.');
      if (job.status === 'pending' && now() - started >= pendingTimeout) {
        throw new Error('The job is queued, but no worker has started it. Start the local scraper worker and check its database access.');
      }
      errors = 0;
      if (stopped) return;
      await onUpdate(job);
      if (terminalFetchStatus(job.status)) stop();
    } catch (error) {
      if (stopped) return;
      errors++;
      if (errors >= maxErrors || now() - started >= timeout || now() - started >= pendingTimeout) {
        stop();
        onError(error);
      }
    }
    if (!stopped) timer = schedule(poll, interval);
  };
  timer = schedule(poll, 0);
  return stop;
}
