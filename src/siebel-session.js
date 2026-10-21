// This function is evaluated inside the portal page. Only actual controls may
// dismiss a warning: a div/td containing explanatory text is not a login action.
export function clickSessionWarningAction() {
  const controls = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
  for (const control of controls) {
    const label = (control.value || control.getAttribute('aria-label') || control.textContent || '').trim().replace(/\s+/g, ' ');
    if (control.disabled || !control.getClientRects().length) continue;
    if (!/^(?:continue|log[ -]?(?:in|out)|proceed|ok|yes|accept)(?:\s*[>»])?$/i.test(label)) continue;
    control.click();
    return label;
  }
  return null;
}
