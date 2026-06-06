import React, { useState } from 'react';
import { HotkeyCapture } from './HotkeyCapture';
import {
  getOverlayOpacity,
  setOverlayOpacity,
  MIN_OPACITY,
  MAX_OPACITY,
} from '../lib/overlayPrefs';

export const OverlaySettings: React.FC = () => {
  const [opacity, setOpacity] = useState(getOverlayOpacity());

  function onOpacity(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setOpacity(v);
    setOverlayOpacity(v);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-text-secondary mb-1.5">Atajo</label>
        <HotkeyCapture />
        <p className="text-xs text-text-muted mt-1.5">
          Tocá el botón y presioná la tecla o combinación (ej. F8, Ctrl+/, Alt+O).
          Ojo: una tecla sola se reserva en todo el sistema.
        </p>
      </div>

      <div>
        <label className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
          <span>Transparencia de los paneles</span>
          <span className="text-text-muted">{Math.round(opacity * 100)}%</span>
        </label>
        <input
          type="range"
          min={MIN_OPACITY}
          max={MAX_OPACITY}
          step={0.05}
          value={opacity}
          onChange={onOpacity}
          className="w-full accent-primary"
        />

        {/* Live preview: a sample panel over a faux game backdrop */}
        <div className="mt-2 relative h-24 rounded-md overflow-hidden border border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-blue-900" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_60%,white,transparent_40%)]" />
          <div
            className="absolute top-2 right-2 w-40 bg-background border border-border/60 rounded-lg p-2 shadow-lg"
            style={{ opacity }}
          >
            <div className="text-[10px] uppercase tracking-wider text-secondary mb-1">Amenazas</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-primary">Zed</span>
              <span className="text-[10px] px-1.5 rounded bg-destructive/30 text-destructive border border-destructive/60">HIGH</span>
            </div>
            <div className="text-[10px] text-text-muted">KDA 9.0 · fed</div>
          </div>
        </div>

        <p className="text-xs text-text-muted mt-1.5">
          Más bajo = más transparente (ves más del juego). Se aplica al abrir el overlay.
        </p>
      </div>
    </div>
  );
};
