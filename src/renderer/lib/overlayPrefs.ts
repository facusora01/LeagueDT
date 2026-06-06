// Overlay display prefs live in localStorage: they're purely cosmetic and the
// overlay itself is click-through, so they're set from the normal window.

const OPACITY_KEY = 'overlayOpacity';
const DEFAULT_OPACITY = 0.85;
export const MIN_OPACITY = 0.3;
export const MAX_OPACITY = 1;

export function getOverlayOpacity(): number {
  const raw = localStorage.getItem(OPACITY_KEY);
  const n = raw ? parseFloat(raw) : NaN;
  if (Number.isNaN(n)) return DEFAULT_OPACITY;
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, n));
}

export function setOverlayOpacity(value: number): void {
  localStorage.setItem(OPACITY_KEY, String(value));
}
