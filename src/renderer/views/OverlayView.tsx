import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { championSquareByName, itemIcon } from '../lib/ddragon';
import { ThreatBadge, TipPriorityBorder, formatGameTime } from '../components/common';
import { getOverlayOpacity } from '../lib/overlayPrefs';
import type { GameStateDTO, ThreatDTO, ItemBuildDTO, TipDTO } from '../../shared/types';

// Translucent, click-through panels positioned to avoid the in-game HUD:
//   timer  → top-left (free area)
//   threats→ upper-right, below the scoreboard / FPS readout
//   items  → lower-right, above the minimap
//   tips   → mid-left, above the chat box
export const OverlayView: React.FC = () => {
  const [game, setGame] = useState<GameStateDTO | null>(null);
  const [threats, setThreats] = useState<ThreatDTO[]>([]);
  const [build, setBuild] = useState<ItemBuildDTO | null>(null);
  const [tips, setTips] = useState<TipDTO[]>([]);
  const opacity = getOverlayOpacity();

  useEffect(() => {
    api.onGameStarted(setGame);
    api.onGameStateUpdate(setGame);
    api.onGameEnded(() => { setGame(null); setThreats([]); setBuild(null); setTips([]); });
    api.onThreatsUpdate(setThreats);
    api.onItemsUpdate(setBuild);
    api.onTipsUpdate(newTips =>
      setTips(prev => {
        const merged = [...newTips, ...prev];
        const seen = new Set<string>();
        return merged.filter(t => (seen.has(t.id) ? false : seen.add(t.id))).slice(0, 4);
      }),
    );
  }, []);

  const panel = 'bg-background/90 backdrop-blur-sm border border-border/60 rounded-lg p-2.5 shadow-xl';

  return (
    <div className="w-full h-full relative text-text-primary pointer-events-none select-none">
      {/* Top-left: timer + KDA */}
      {game && (
        <div className={`absolute top-2 left-2 ${panel} flex items-center gap-3`} style={{ opacity }}>
          <span className="text-lg font-mono font-bold text-secondary">{formatGameTime(game.gameTime)}</span>
          <div className="text-xs">
            <div className="text-text-primary">{game.localPlayer.championName}</div>
            <div className="text-text-muted">
              {game.localPlayer.kills}/{game.localPlayer.deaths}/{game.localPlayer.assists} · {game.localPlayer.cs} CS
            </div>
          </div>
        </div>
      )}

      {/* Upper-right: threats (below scoreboard / FPS) */}
      {threats.length > 0 && (
        <div className={`absolute top-[15%] right-2 w-56 ${panel}`} style={{ opacity }}>
          <h3 className="text-[10px] uppercase tracking-wider text-secondary mb-1.5">Amenazas</h3>
          <div className="space-y-1">
            {threats.slice(0, 5).map(t => (
              <div key={t.summonerName} className="flex items-center gap-2">
                <img
                  src={championSquareByName(t.championName)}
                  alt=""
                  className="w-6 h-6 rounded border border-border"
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                />
                <span className="text-xs flex-1 truncate">{t.championName}</span>
                <ThreatBadge level={t.threatLevel} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lower-right: items (above the minimap) */}
      {build && build.items.length > 0 && (
        <div className={`absolute bottom-[30%] right-2 w-56 ${panel}`} style={{ opacity }}>
          <h3 className="text-[10px] uppercase tracking-wider text-secondary mb-1.5">Items</h3>
          <div className="space-y-1">
            {build.items.slice(0, 5).map(item => (
              <div key={item.itemId} className="flex items-center gap-2">
                <img
                  src={itemIcon(item.itemId)}
                  alt=""
                  className="w-6 h-6 rounded border border-secondary/30"
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                />
                <span className="text-xs truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mid-left: tips (above the chat box) */}
      {tips.length > 0 && (
        <div className={`absolute bottom-[32%] left-2 w-72 ${panel}`} style={{ opacity }}>
          <h3 className="text-[10px] uppercase tracking-wider text-secondary mb-1.5">Tips</h3>
          <div className="space-y-1">
            {tips.map(tip => (
              <div key={tip.id} className={`pl-2 border-l-2 ${TipPriorityBorder(tip.priority)}`}>
                <span className="text-xs">{tip.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint when no game yet */}
      {!game && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm border border-border/60 rounded-full px-4 py-1.5 text-xs text-text-muted"
          style={{ opacity }}
        >
          Overlay activo — esperando partida
        </div>
      )}
    </div>
  );
};
