const clip = (text, limit = 300) => text.length > limit ? text.slice(0, limit) + '…' : text;
const taskLabel = (unit) => unit.kind === 'consumption' ? 'Consumption report' : unit.location || 'Inventory';
const stateLabels = { pending: 'Queued', running: 'Fetching', done: 'Completed', failed: 'Failed' };

export function fetchLogLines(raw, document, since) {
  const template = document.createElement('template');
  template.innerHTML = String(raw || '');
  template.content.querySelectorAll('script, style').forEach((node) => node.remove());
  const text = [...template.content.childNodes].map((node) => node.textContent).join('\n');
  const cutoff = Date.parse(since);
  return text.split(/\r?\n|(?=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/)
    .map((line) => line.trim()).filter(Boolean).filter((line) => {
      if (!Number.isFinite(cutoff)) return true;
      const stamp = /^(\d{4}-\d{2}-\d{2}T\S+Z)/.exec(line);
      return stamp && Date.parse(stamp[1]) >= cutoff;
    });
}

export function fetchRequestUnits(job, request) {
  return (job.queue?.units || []).filter((unit) => {
    if (request.type !== 'all' && unit.kind !== request.type) return false;
    if (unit.kind === 'inventory') return !request.targetLocation || request.targetLocation === 'ALL' || unit.location === request.targetLocation;
    return (!request.fromDate || unit.fromDate === request.fromDate) && (!request.toDate || unit.toDate === request.toDate);
  });
}

export function renderFetchStatus(container, job, request, since) {
  const document = container.ownerDocument;
  const previous = container.querySelector('details');
  const open = previous?.open || false;
  const oldLog = container.querySelector('.fetch-log-output');
  const scrollTop = oldLog?.scrollTop || 0;
  const atBottom = !oldLog || oldLog.scrollTop + oldLog.clientHeight >= oldLog.scrollHeight - 10;
  const units = fetchRequestUnits(job, request);
  const done = units.filter((unit) => unit.status === 'done').length;
  const title = document.createElement('p');
  title.className = 'fetch-status-summary';
  title.setAttribute('role', 'status');
  title.style.margin = '0 0 8px';
  title.textContent = job.status === 'cancelled' ? 'Fetch cancelled.'
    : job.status === 'failed' ? 'Fetch finished with errors. See the affected locations below.'
    : job.status === 'completed' ? 'Fetch completed.'
    : `${request.type === 'consumption' ? 'Consumption' : 'Inventory'} fetch: ${done} of ${units.length} requested tasks completed.`;
  const list = document.createElement('ul');
  list.style.cssText = 'padding-left:20px;margin:0 0 8px;';
  for (const unit of units) {
    const item = document.createElement('li');
    const state = job.status === 'cancelled' && unit.status !== 'done' ? 'Cancelled' : stateLabels[unit.status] || unit.status;
    item.textContent = `${taskLabel(unit)}: ${state}`;
    if (unit.error && ['pending', 'failed'].includes(unit.status) && job.status !== 'cancelled') {
      item.textContent += ` — ${clip(unit.error)}`;
    }
    list.append(item);
  }
  const active = (job.queue?.units || []).find((unit) => unit.status === 'running');
  const activity = document.createElement('p');
  activity.style.cssText = 'margin:0 0 8px;color:var(--text-secondary);font-size:0.8rem;';
  activity.textContent = active && !['completed', 'failed', 'cancelled'].includes(job.status)
    ? `Worker is currently fetching ${taskLabel(active)}${units.includes(active) ? '.' : '; your request is queued behind it.'}`
    : job.status === 'pending' ? 'Waiting for the scraper worker to start.' : '';
  const details = document.createElement('details');
  details.open = open;
  const summary = document.createElement('summary');
  summary.style.cursor = 'pointer';
  summary.textContent = 'View recent activity';
  const lines = fetchLogLines(job.logs, document, since);
  const output = document.createElement('pre');
  output.className = 'fetch-log-output';
  output.style.cssText = 'max-height:240px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:0.75rem;font-weight:400;line-height:1.5;background:var(--bg-color,#f8fafc);padding:10px;border-radius:4px;';
  output.textContent = lines.slice(-100).map((line) => clip(line, 500)).join('\n') || 'No new worker activity since this request.';
  const note = document.createElement('p');
  note.style.cssText = 'font-size:0.75rem;color:var(--text-secondary);';
  note.textContent = 'Showing up to 100 recent entries for this request. Earlier job history is retained in the database.';
  details.append(summary, output, note);
  container.replaceChildren(title, list, activity, details);
  output.scrollTop = atBottom ? output.scrollHeight : scrollTop;
}
