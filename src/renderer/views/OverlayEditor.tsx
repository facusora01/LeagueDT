import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  getOverlayLayout,
  setOverlayLayout,
  defaultLayout,
  getOverlayOpacity,
  PANEL_IDS,
  type OverlayLayout,
  type PanelId,
  type PanelBox,
} from '../lib/overlayPrefs';
import {
  TimerContent,
  ThreatsContent,
  ItemsContent,
  TipsContent,
} from '../components/overlayPanels';

const MIN_W = 100;
const MIN_H = 44;

interface Edges { l?: boolean; r?: boolean; t?: boolean; b?: boolean; }
type Interaction =
  | { kind: 'drag'; id: PanelId; startX: number; startY: number; orig: PanelBox }
  | { kind: 'resize'; id: PanelId; edges: Edges; startX: number; startY: number; orig: PanelBox };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Resize handles: 4 edges + 4 corners.
const HANDLES: { edges: Edges; cls: string }[] = [
  { edges: { t: true }, cls: 'top-0 left-2 right-2 h-1.5 cursor-ns-resize' },
  { edges: { b: true }, cls: 'bottom-0 left-2 right-2 h-1.5 cursor-ns-resize' },
  { edges: { l: true }, cls: 'left-0 top-2 bottom-2 w-1.5 cursor-ew-resize' },
  { edges: { r: true }, cls: 'right-0 top-2 bottom-2 w-1.5 cursor-ew-resize' },
  { edges: { t: true, l: true }, cls: 'top-0 left-0 w-2.5 h-2.5 cursor-nwse-resize bg-primary/70' },
  { edges: { t: true, r: true }, cls: 'top-0 right-0 w-2.5 h-2.5 cursor-nesw-resize bg-primary/70' },
  { edges: { b: true, l: true }, cls: 'bottom-0 left-0 w-2.5 h-2.5 cursor-nesw-resize bg-primary/70' },
  { edges: { b: true, r: true }, cls: 'bottom-0 right-0 w-2.5 h-2.5 cursor-nwse-resize bg-primary/70' },
];

// Sample data so the panels render real (adaptive) content while editing.
const SAMPLE = {
  timer: { gameTime: 754, championName: 'Pyke', kills: 6, deaths: 1, assists: 2, cs: 20 },
  threats: [
    { summonerName: 'a', championName: 'Zed', threatLevel: 'high' },
    { summonerName: 'b', championName: 'Caitlyn', threatLevel: 'medium' },
    { summonerName: 'c', championName: 'Lulu', threatLevel: 'low' },
  ],
  items: [
    { itemId: 6691, name: "Prowler's Claw" },
    { itemId: 3031, name: 'Infinity Edge' },
    { itemId: 3006, name: "Berserker's Greaves" },
    { itemId: 3036, name: "Lord Dominik's Regards" },
  ],
  tips: [
    { id: '1', message: 'Dragón aparece en ~40s — agrupá al equipo', priority: 'high' },
    { id: '2', message: 'CS bajo — enfocate en farmear', priority: 'medium' },
  ],
};

function panelContent(id: PanelId, box: PanelBox) {
  switch (id) {
    case 'timer': return <TimerContent box={box} data={SAMPLE.timer} />;
    case 'threats': return <ThreatsContent box={box} threats={SAMPLE.threats} />;
    case 'items': return <ItemsContent box={box} items={SAMPLE.items} />;
    case 'tips': return <TipsContent box={box} tips={SAMPLE.tips} />;
  }
}

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
      const W = window.innerWidth;
      const H = window.innerHeight;

      setLayout(prev => {
        const o = it.orig;
        let next: PanelBox;
        if (it.kind === 'drag') {
          next = { ...o, x: clamp(o.x + dx, 0, W - o.w), y: clamp(o.y + dy, 0, H - o.h) };
        } else {
          let { x, y, w, h } = o;
          if (it.edges.r) w = clamp(o.w + dx, MIN_W, W - o.x);
          if (it.edges.l) { const nw = clamp(o.w - dx, MIN_W, o.x + o.w); x = o.x + o.w - nw; w = nw; }
          if (it.edges.b) h = clamp(o.h + dy, MIN_H, H - o.y);
          if (it.edges.t) { const nh = clamp(o.h - dy, MIN_H, o.y + o.h); y = o.y + o.h - nh; h = nh; }
          next = { x, y, w, h };
        }
        return { ...prev, [it.id]: next };
      });
    }
    function onUp() { interaction.current = null; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = (id: PanelId, e: React.MouseEvent) => {
    interaction.current = { kind: 'drag', id, startX: e.clientX, startY: e.clientY, orig: layout[id] };
  };
  const startResize = (id: PanelId, edges: Edges, e: React.MouseEvent) => {
    e.stopPropagation();
    interaction.current = { kind: 'resize', id, edges, startX: e.clientX, startY: e.clientY, orig: layout[id] };
  };

  const save = () => { setOverlayLayout(layout); api.setOverlayMode('off'); };
  const cancel = () => api.setOverlayMode('off');
  const reset = () => setLayout(defaultLayout());

  return (
    <div className="w-full h-full relative select-none" style={{ background: 'rgba(0,0,0,0.25)' }}>
      {/* Toolbar above the HUD */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 shadow-xl">
        <span className="text-xs text-text-secondary mr-1">Mové (arrastrando) y redimensioná (bordes)</span>
        <button onClick={reset} className="px-3 py-1.5 text-xs bg-surface-light text-text-secondary border border-border rounded-md hover:text-text-primary">Restaurar</button>
        <button onClick={cancel} className="px-3 py-1.5 text-xs bg-destructive/20 text-destructive border border-destructive/30 rounded-md hover:bg-destructive/30">Cancelar</button>
        <button onClick={save} className="px-3 py-1.5 text-xs bg-primary/20 text-primary border border-primary/40 rounded-md hover:bg-primary/30">Guardar</button>
      </div>

      {/* Editable panels */}
      {PANEL_IDS.map(id => {
        const b = layout[id];
        return (
          <div
            key={id}
            onMouseDown={e => startDrag(id, e)}
            className="absolute bg-background/90 border-2 border-primary/60 rounded-lg shadow-xl cursor-move overflow-hidden p-2 text-text-primary"
            style={{ left: b.x, top: b.y, width: b.w, height: b.h, opacity }}
          >
            {panelContent(id, b)}

            {HANDLES.map((hd, i) => (
              <div
                key={i}
                onMouseDown={e => startResize(id, hd.edges, e)}
                className={`absolute ${hd.cls}`}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};
