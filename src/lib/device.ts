/**
 * Real device detection (phone/tablet vs desktop), not a viewport-width
 * guess — the point is to distinguish "mobile browser" from "desktop
 * browser," which matters for whether Coinflow's hosted bank-auth flow
 * should be iframed or opened as a full-page redirect.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;

  if (/Android|iPhone|iPod|Mobi/i.test(ua)) return true;

  // iPadOS 13+ reports a desktop "Macintosh" UA by default, but real Macs
  // don't have touch screens.
  if (/Mac/i.test(ua) && navigator.maxTouchPoints > 1) return true;

  return false;
}
