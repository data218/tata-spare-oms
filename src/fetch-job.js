// Shared identities prevent a worker from overwriting another run or date range.
export const unitKey = (unit) => unit.kind === 'consumption'
  ? `consumption:${unit.fromDate || ''}:${unit.toDate || ''}`
  : `${unit.kind}:${unit.location || ''}`;

export const isCancelled = (job) => Boolean(job?.cancelledAt || job?.status === 'cancelled');
export const sameRun = (a, b) => (a?.id || a?.queue?.createdAt) === (b?.id || b?.queue?.createdAt);

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// PostgREST puts filters in the URL. Comparing a whole job there exceeds proxy
// limits once scrape logs grow. Compare all queue state exactly, allowing only
// the JSON log string to vary. New writes also carry a revision, so concurrent
// updates (including log flushes) still invalidate the snapshot.
export function compareJob(query, raw) {
  const logs = /"logs"\s*:\s*("(?:[^"\\]|\\.)*")/.exec(raw);
  if (!logs) return query.eq('value', raw);
  const start = logs.index + logs[0].length - logs[1].length;
  const pattern = '^' + escapeRegex(raw.slice(0, start)) +
    '"(?:[^"\\\\]|\\\\.)*"' + escapeRegex(raw.slice(start + logs[1].length)) + '$';
  return query.filter('value', 'match', pattern);
}

export function mergeWorkerJob(job, latest) {
  if (!latest || !sameRun(job, latest) || isCancelled(latest)) return null;
  for (const unit of latest.queue?.units || []) {
    const index = job.queue.units.findIndex((other) => unitKey(other) === unitKey(unit));
    if (index === -1) job.queue.units.push(unit);
    // A user explicitly re-queued this unit while the worker was busy elsewhere.
    else if (unit.requestedAt !== job.queue.units[index].requestedAt) job.queue.units[index] = unit;
  }
  job.progress = {
    step: job.queue.units.filter((unit) => unit.status === 'done').length,
    total: job.queue.units.length,
  };
  return job;
}
