import React from 'react';
import { championSquareByName, itemIcon } from '../lib/ddragon';
import { ThreatBadge, TipPriorityBorder, formatGameTime } from './common';
import type { PanelBox } from '../lib/overlayPrefs';

// Shared, size-adaptive panel contents. Used by both the live overlay and the
// editor so resizing shows the real result. The absolute box + opacity wrapper
// is supplied by the caller.

const ROW_H = 26;
const HEADER_H = 22;

function maxRows(box: PanelBox, hasHeader: boolean): number {
  const usable = box.h - 12 - (hasHeader ? HEADER_H : 0);
  return Math.max(1, Math.floor(usable / ROW_H));
}

const imgErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.target as HTMLImageElement).style.visibility = 'hidden';
};

const Header: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] uppercase tracking-wider text-secondary mb-1 truncate">{children}</h3>
);

// ─── Timer ───────────────────────────────────────────────────────────────────

export interface TimerData {
  gameTime: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
}

export const TimerContent: React.FC<{ box: PanelBox; data: TimerData }> = ({ box, data }) => {
  const showDetails = box.w >= 150 && box.h >= 48;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="text-base font-mono font-bold text-secondary">{formatGameTime(data.gameTime)}</span>
      {showDetails && (
        <div className="text-xs min-w-0">
          <div className="text-text-primary truncate">{data.championName}</div>
          <div className="text-text-muted truncate">
            {data.kills}/{data.deaths}/{data.assists} · {data.cs} CS
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Threats ─────────────────────────────────────────────────────────────────

export interface ThreatLike {
  summonerName: string;
  championName: string;
  threatLevel: string;
}

const THREAT_SHORT: Record<string, string> = {
  extreme: 'EXT', high: 'ALTA', medium: 'MED', low: 'BAJA',
};
const THREAT_DOT: Record<string, string> = {
  extreme: 'bg-destructive', high: 'bg-destructive', medium: 'bg-warning', low: 'bg-info',
};
// Literal class strings so Tailwind detects them (no runtime composition).
const THREAT_COMPACT: Record<string, string> = {
  extreme: 'text-destructive bg-destructive/20',
  high: 'text-destructive bg-destructive/20',
  medium: 'text-warning bg-warning/20',
  low: 'text-info bg-info/20',
};

export const ThreatsContent: React.FC<{ box: PanelBox; threats: ThreatLike[] }> = ({ box, threats }) => {
  const showName = box.w >= 200;       // below: image + badge only
  const showHeader = box.h >= 70;
  const tiny = box.w < 120;            // below: image + colored dot only
  const rows = maxRows(box, showHeader);
  return (
    <>
      {showHeader && <Header>Amenazas</Header>}
      <div className="space-y-1">
        {threats.slice(0, rows).map(t => (
          <div key={t.summonerName} className="flex items-center gap-1.5 min-w-0">
            <img
              src={championSquareByName(t.championName)}
              alt=""
              className="w-6 h-6 rounded border border-border shrink-0"
              onError={imgErr}
            />
            {showName && <span className="text-xs flex-1 truncate">{t.championName}</span>}
            <span className={`shrink-0 ${showName ? '' : 'ml-auto'}`}>
              {tiny ? (
                <span className={`block w-2.5 h-2.5 rounded-full ${THREAT_DOT[t.threatLevel] ?? 'bg-info'}`} />
              ) : showName ? (
                <ThreatBadge level={t.threatLevel} />
              ) : (
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${THREAT_COMPACT[t.threatLevel] ?? THREAT_COMPACT.low}`}>
                  {THREAT_SHORT[t.threatLevel] ?? '?'}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

// ─── Items ───────────────────────────────────────────────────────────────────

export interface ItemLike {
  itemId: number;
  name: string;
}

export interface SwapLike {
  outItemId: number;
  in: ItemLike;
}

export const ItemsContent: React.FC<{ box: PanelBox; items: ItemLike[]; swaps?: SwapLike[] }> = ({
  box,
  items,
  swaps = [],
}) => {
  const iconsOnly = box.w < 165;        // below this: just the item icons
  const showHeader = box.h >= 64;

  // Build full → show swap suggestions ([owned] 🪙→ [suggested]).
  if (items.length === 0 && swaps.length > 0) {
    const rows = maxRows(box, showHeader);
    return (
      <>
        {showHeader && <Header>Cambios</Header>}
        <div className="space-y-1">
          {swaps.slice(0, rows).map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <img
                src={itemIcon(s.outItemId)}
                alt=""
                className="w-6 h-6 rounded border border-destructive/40 opacity-70 shrink-0"
                onError={imgErr}
              />
              <span className="text-secondary text-xs shrink-0" title="Vender y comprar">🪙→</span>
              <img
                src={itemIcon(s.in.itemId)}
                alt=""
                className="w-6 h-6 rounded border border-success/50 shrink-0"
                onError={imgErr}
              />
              {!iconsOnly && <span className="text-xs truncate">{s.in.name}</span>}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (iconsOnly) {
    return (
      <>
        {showHeader && <Header>Items</Header>}
        <div className="flex flex-wrap gap-1">
          {items.map(item => (
            <img
              key={item.itemId}
              src={itemIcon(item.itemId)}
              alt=""
              title={item.name}
              className="w-7 h-7 rounded border border-secondary/30"
              onError={imgErr}
            />
          ))}
        </div>
      </>
    );
  }

  const rows = maxRows(box, showHeader);
  return (
    <>
      {showHeader && <Header>Items</Header>}
      <div className="space-y-1">
        {items.slice(0, rows).map(item => (
          <div key={item.itemId} className="flex items-center gap-1.5">
            <img
              src={itemIcon(item.itemId)}
              alt=""
              className="w-6 h-6 rounded border border-secondary/30 shrink-0"
              onError={imgErr}
            />
            <span className="text-xs truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </>
  );
};

// ─── Tips ────────────────────────────────────────────────────────────────────

export interface TipLike {
  id: string;
  message: string;
  priority: string;
}

export const TipsContent: React.FC<{ box: PanelBox; tips: TipLike[] }> = ({ box, tips }) => {
  const showHeader = box.h >= 64;
  const rows = maxRows(box, showHeader);
  return (
    <>
      {showHeader && <Header>Tips</Header>}
      <div className="space-y-1">
        {tips.slice(0, rows).map(tip => (
          <div key={tip.id} className={`pl-2 border-l-2 ${TipPriorityBorder(tip.priority)}`}>
            <span className="text-xs line-clamp-2">{tip.message}</span>
          </div>
        ))}
      </div>
    </>
  );
};
