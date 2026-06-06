import { uIOhook, type UiohookKeyboardEvent } from 'uiohook-napi';

// Electron-accelerator token → uiohook keycode (see uiohook-napi UiohookKey).
const TOKEN_TO_KEYCODE: Record<string, number> = {
  A: 30, B: 48, C: 46, D: 32, E: 18, F: 33, G: 34, H: 35, I: 23, J: 36, K: 37,
  L: 38, M: 50, N: 49, O: 24, P: 25, Q: 16, R: 19, S: 31, T: 20, U: 22, V: 47,
  W: 17, X: 45, Y: 21, Z: 44,
  '0': 11, '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, '6': 7, '7': 8, '8': 9, '9': 10,
  F1: 59, F2: 60, F3: 61, F4: 62, F5: 63, F6: 64, F7: 65, F8: 66, F9: 67, F10: 68,
  F11: 87, F12: 88, F13: 91, F14: 92, F15: 93, F16: 99, F17: 100, F18: 101,
  F19: 102, F20: 103, F21: 104, F22: 105, F23: 106,
  Space: 57, Enter: 28, Tab: 15, Backspace: 14, Delete: 3667, Insert: 3666,
  Home: 3655, End: 3663, PageUp: 3657, PageDown: 3665, Escape: 1,
  Up: 57416, Down: 57424, Left: 57419, Right: 57421,
  '-': 12, '=': 13, '[': 26, ']': 27, '\\': 43, ';': 39, "'": 40, '`': 41,
  ',': 51, '.': 52, '/': 53,
  num0: 82, num1: 79, num2: 80, num3: 81, num4: 75, num5: 76, num6: 77,
  num7: 71, num8: 72, num9: 73, numadd: 78, numsub: 74, nummult: 55,
  numdiv: 3637, numdec: 83,
};

interface Target {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  keycode: number;
}

function parseAccelerator(accel: string): Target | null {
  let ctrl = false, alt = false, shift = false;
  let keycode: number | null = null;

  for (const part of accel.split('+')) {
    if (['CommandOrControl', 'Control', 'Ctrl', 'Command', 'Cmd', 'Super', 'Meta'].includes(part)) ctrl = true;
    else if (['Alt', 'Option', 'AltGr'].includes(part)) alt = true;
    else if (part === 'Shift') shift = true;
    else keycode = TOKEN_TO_KEYCODE[part] ?? null;
  }

  return keycode === null ? null : { ctrl, alt, shift, keycode };
}

const DEBOUNCE_MS = 400;

/**
 * Global hotkey via a low-level keyboard hook (uiohook). Unlike Electron's
 * globalShortcut (RegisterHotKey), this still fires while a game has focus.
 */
export class HotkeyManager {
  private target: Target | null = null;
  private lastFire = 0;
  private started = false;
  private readonly onTrigger: () => void;

  constructor(onTrigger: () => void) {
    this.onTrigger = onTrigger;
  }

  /** Returns false if the accelerator can't be parsed (keeps the previous one). */
  setAccelerator(accel: string): boolean {
    const t = parseAccelerator(accel);
    if (!t) return false;
    this.target = t;
    return true;
  }

  start() {
    if (this.started) return;
    uIOhook.on('keydown', e => this.handle(e));
    try {
      uIOhook.start();
      this.started = true;
      console.log('[Hotkey] low-level keyboard hook started');
    } catch (err) {
      console.error('[Hotkey] failed to start hook:', err);
    }
  }

  stop() {
    if (!this.started) return;
    try {
      uIOhook.stop();
    } catch {
      /* ignore */
    }
    this.started = false;
  }

  private handle(e: UiohookKeyboardEvent) {
    const t = this.target;
    if (!t) return;
    if (
      e.keycode === t.keycode &&
      e.ctrlKey === t.ctrl &&
      e.altKey === t.alt &&
      e.shiftKey === t.shift
    ) {
      const now = Date.now();
      if (now - this.lastFire < DEBOUNCE_MS) return; // ignore key-repeat
      this.lastFire = now;
      this.onTrigger();
    }
  }
}
