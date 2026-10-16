// Shared HTML-escaping helpers.
// Use these whenever interpolating values that originate from scraped portal
// data or the database into innerHTML / template strings, to avoid injecting
// markup (XSS) or breaking out of attributes.

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Escape a value destined for a JS string literal that is embedded inside an
// HTML attribute (e.g. onclick="fn('...')"). Combines HTML + JS escaping.
export function escapeJsAttr(value) {
  return escapeHtml(
    String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
  );
}

if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.escapeJsAttr = escapeJsAttr;
}
