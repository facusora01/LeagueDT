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
          Tocá el botón y presioná la combinación (al menos un modificador: Ctrl o Alt).
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
        <p className="text-xs text-text-muted mt-1.5">
          Más bajo = más transparente (ves más del juego). Se aplica al abrir el overlay.
        </p>
      </div>
    </div>
  );
};
