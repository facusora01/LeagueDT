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

// ─── Panel layout (position + size per panel) ────────────────────────────────

export type PanelId = 'timer' | 'threats' | 'items' | 'tips';

export interface PanelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type OverlayLayout = Record<PanelId, PanelBox>;

const LAYOUT_KEY = 'overlayLayout';

export const PANEL_IDS: PanelId[] = ['timer', 'threats', 'items', 'tips'];

export const PANEL_TITLES: Record<PanelId, string> = {
  timer: 'Timer / KDA',
  threats: 'Amenazas',
  items: 'Items',
  tips: 'Tips',
};

// Defaults derived from the current screen so panels start in sensible corners.
export function defaultLayout(): OverlayLayout {
  const W = window.innerWidth;
  const H = window.innerHeight;
  return {
    timer: { x: 12, y: 12, w: 210, h: 58 },
    threats: { x: W - 236, y: Math.round(H * 0.15), w: 224, h: 190 },
    items: { x: W - 236, y: Math.round(H * 0.55), w: 224, h: 190 },
    tips: { x: 12, y: Math.round(H * 0.45), w: 300, h: 150 },
  };
}

export function getOverlayLayout(): OverlayLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return { ...defaultLayout(), ...JSON.parse(raw) };
  } catch {
    /* fall through to defaults */
  }
  return defaultLayout();
}

export function setOverlayLayout(layout: OverlayLayout): void {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}
