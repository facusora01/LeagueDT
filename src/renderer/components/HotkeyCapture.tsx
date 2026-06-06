import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

// Maps a browser KeyboardEvent to an Electron accelerator string.
function toAccelerator(e: React.KeyboardEvent): string | null {
  const key = e.key;
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null; // wait for a real key

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (parts.length === 0) return null; // require at least one modifier

  const named: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Escape: 'Escape', Enter: 'Enter', Tab: 'Tab',
  };
  const main = named[key] ?? (key.length === 1 ? key.toUpperCase() : key);
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
