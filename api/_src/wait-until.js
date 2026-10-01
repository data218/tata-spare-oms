import { waitUntil as vercelWaitUntil } from '@vercel/functions';

// @vercel/functions' waitUntil() silently no-ops when there is no Vercel request
// context (local dev), so it cannot be used to detect its own availability.
// Probing the context first matters: a false positive would answer 202 and then
// lose the unit when the instance freezes.
export function hasVercelRequestContext() {
  try {
    const store = globalThis[Symbol.for('@vercel/request-context')];
    const ctx = store && typeof store.get === 'function' ? store.get() : null;
    return Boolean(ctx && typeof ctx.waitUntil === 'function');
  } catch {
    return false;
  }
}

// Lets an invocation keep working after it has already sent its response. The
// daily run holds far more work than one 300s invocation can do, so each unit
// finishes and hands the next unit to a fresh invocation.
//
// Returns false when there is no request context, which tells the caller it has
// to await the work itself.
export function waitUntil(promise) {
  if (!hasVercelRequestContext()) return false;
  try {
    vercelWaitUntil(Promise.resolve(promise));
    return true;
  } catch (e) {
    console.log('waitUntil failed, running inline:', e.message);
    return false;
  }
}
