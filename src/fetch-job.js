// Shared identities prevent a worker from overwriting another run or date range.
export const unitKey = (unit) => unit.kind === 'consumption'
  ? `consumption:${unit.fromDate || ''}:${unit.toDate || ''}`
  : `${unit.kind}:${unit.location || ''}`;

export const isCancelled = (job) => Boolean(job?.cancelledAt || job?.status === 'cancelled');
export const sameRun = (a, b) => (a?.id || a?.queue?.createdAt) === (b?.id || b?.queue?.createdAt);

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
