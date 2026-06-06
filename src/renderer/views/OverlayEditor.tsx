import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  getOverlayLayout,
  setOverlayLayout,
  defaultLayout,
  getOverlayOpacity,
  PANEL_IDS,
  PANEL_TITLES,
  type OverlayLayout,
  type PanelId,
  type PanelBox,
} from '../lib/overlayPrefs';

const MIN_W = 140;
const MIN_H = 56;

type Interaction = {
  mode: 'drag' | 'resize';
  id: PanelId;
  startX: number;
  startY: number;
  orig: PanelBox;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Sample content shown inside each panel while editing.
const SAMPLE: Record<PanelId, React.ReactNode> = {
  timer: <span className="text-secondary font-mono font-bold">12:34 · 6/1/2</span>,
  threats: <span className="text-text-muted">Zed HIGH · Caitlyn MED · …</span>,
  items: <span className="text-text-muted">Kraken · IE · Botas · …</span>,
  tips: <span className="text-text-muted">Dragón en 40s — agrupá</span>,
};

export const OverlayEditor: React.FC = () => {
  const [layout, setLayout] = useState<OverlayLayout>(() => getOverlayLayout());
  const interaction = useRef<Interaction | null>(null);
  const opacity = getOverlayOpacity();

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const it = interaction.current;
      if (!it) return;
      const dx = e.clientX - it.startX;
      const dy = e.clientY - it.startY;
      setLayout(prev => {
        const b = it.orig;
        const next: PanelBox =
          it.mode === 'drag'
            ? {
                ...b,
                x: clamp(b.x + dx, 0, window.innerWidth - b.w),
                y: clamp(b.y + dy, 0, window.innerHeight - b.h),
              }
            : {
                ...b,
                w: clamp(b.w + dx, MIN_W, window.innerWidth - b.x),
                h: clamp(b.h + dy, MIN_H, window.innerHeight - b.y),
              };
        return { ...prev, [it.id]: next };
      });
    }
    function onUp() {
      interaction.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function startDrag(id: PanelId, e: React.MouseEvent) {
    interaction.current = { mode: 'drag', id, startX: e.clientX, startY: e.clientY, orig: layout[id] };
  }
  function startResize(id: PanelId, e: React.MouseEvent) {
    e.stopPropagation();
    interaction.current = { mode: 'resize', id, startX: e.clientX, startY: e.clientY, orig: layout[id] };
  }

  function save() {
    setOverlayLayout(layout);
    api.setOverlayMode('off');
  }
  function cancel() {
    api.setOverlayMode('off');
  }
  function reset() {
    setLayout(defaultLayout());
  }

  return (
    <div className="w-full h-full relative select-none" style={{ background: 'rgba(0,0,0,0.25)' }}>
      {/* Toolbar above the HUD */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 shadow-xl">
        <span className="text-xs text-text-secondary mr-1">Arrastrá y redimensioná los paneles</span>
        <button onClick={reset} className="px-3 py-1.5 text-xs bg-surface-light text-text-secondary border border-border rounded-md hover:text-text-primary">
          Restaurar
        </button>
        <button onClick={cancel} className="px-3 py-1.5 text-xs bg-destructive/20 text-destructive border border-destructive/30 rounded-md hover:bg-destructive/30">
          Cancelar
        </button>
        <button onClick={save} className="px-3 py-1.5 text-xs bg-primary/20 text-primary border border-primary/40 rounded-md hover:bg-primary/30">
          Guardar
        </button>
      </div>

      {/* Editable panels */}
      {PANEL_IDS.map(id => {
        const b = layout[id];
        return (
          <div
            key={id}
            onMouseDown={e => startDrag(id, e)}
            className="absolute bg-background/90 border-2 border-primary/60 rounded-lg shadow-xl cursor-move overflow-hidden"
            style={{ left: b.x, top: b.y, width: b.w, height: b.h, opacity }}
          >
            <div className="px-2 py-1 bg-primary/20 text-primary text-[10px] uppercase tracking-wider font-semibold">
              {PANEL_TITLES[id]}
            </div>
            <div className="p-2 text-xs">{SAMPLE[id]}</div>

            {/* Resize handle */}
            <div
              onMouseDown={e => startResize(id, e)}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-primary/60 rounded-tl"
              style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
            />
          </div>
        );
      })}
    </div>
  );
};
