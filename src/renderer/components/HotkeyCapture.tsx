import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

// Maps a browser KeyboardEvent to an Electron accelerator string.
// Uses e.code (physical key) so modifiers/layouts don't mangle the result
// (e.g. Alt+O yields a dead char in e.key but "KeyO" in e.code).
function toAccelerator(e: React.KeyboardEvent): string | null {
  const code = e.code;
  if (/^(Control|Shift|Alt|Meta|OS)(Left|Right)?$/.test(code)) return null;

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (parts.length === 0) return null; // require at least one modifier

  let main: string | null = null;
  let m: RegExpMatchArray | null;
  if ((m = code.match(/^Key([A-Z])$/))) main = m[1];
  else if ((m = code.match(/^Digit(\d)$/))) main = m[1];
  else if ((m = code.match(/^F(\d{1,2})$/))) main = `F${m[1]}`;
  else {
    const named: Record<string, string> = {
      Space: 'Space', Enter: 'Enter', Tab: 'Tab', Backslash: '\\',
      ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
      Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
    };
    main = named[code] ?? null;
  }
  if (!main) return null;

  parts.push(main);
  return parts.join('+');
}

// Human-friendly display of an accelerator.
function pretty(accel: string): string {
  return accel.replace('CommandOrControl', 'Ctrl').replace(/\+/g, ' + ');
}

export const HotkeyCapture: React.FC = () => {
  const [hotkey, setHotkey] = useState<string>('');
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    api.getOverlayHotkey().then(r => setHotkey(r.hotkey));
  }, []);

  async function onKeyDown(e: React.KeyboardEvent) {
    if (!capturing) return;
    e.preventDefault();
    const accel = toAccelerator(e);
    if (!accel) return;

    setCapturing(false);
    const res = await api.setOverlayHotkey(accel);
    if (res.ok) {
      setHotkey(res.hotkey);
      setStatus('✓ Guardado');
    } else {
      setStatus('No se pudo registrar (¿en uso por otra app?)');
    }
    setTimeout(() => setStatus(null), 2500);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onKeyDown={onKeyDown}
        onClick={() => { setCapturing(true); setStatus(null); }}
        onBlur={() => setCapturing(false)}
        className={`px-3 py-2 rounded-md text-sm font-mono border transition-colors ${
          capturing
            ? 'bg-primary/20 text-primary border-primary/50 animate-pulse'
            : 'bg-background text-text-primary border-border hover:border-primary/50'
        }`}
      >
        {capturing ? 'Presioná la combinación…' : pretty(hotkey || 'Ctrl + Shift + O')}
      </button>
      {status && <span className="text-xs text-text-muted">{status}</span>}
    </div>
  );
};
