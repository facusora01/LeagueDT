import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getOverlayOpacity, getOverlayLayout, type PanelBox } from '../lib/overlayPrefs';
import { TimerContent, ThreatsContent, ItemsContent, TipsContent } from '../components/overlayPanels';
import type { GameStateDTO, ThreatDTO, ItemBuildDTO, TipDTO } from '../../shared/types';

// Translucent, click-through panels placed according to the saved layout,
// with size-adaptive contents.
export const OverlayView: React.FC = () => {
  const [game, setGame] = useState<GameStateDTO | null>(null);
  const [threats, setThreats] = useState<ThreatDTO[]>([]);
  const [build, setBuild] = useState<ItemBuildDTO | null>(null);
  const [tips, setTips] = useState<TipDTO[]>([]);
  const opacity = getOverlayOpacity();
  const layout = getOverlayLayout();

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

  const boxStyle = (b: PanelBox): React.CSSProperties => ({
    left: b.x, top: b.y, width: b.w, height: b.h, opacity,
  });
  const panel = 'absolute overflow-hidden bg-background/90 backdrop-blur-sm border border-border/60 rounded-lg p-2 shadow-xl';

  return (
    <div className="w-full h-full relative text-text-primary pointer-events-none select-none">
      {game && (
        <div className={panel} style={boxStyle(layout.timer)}>
          <TimerContent box={layout.timer} data={{ ...game.localPlayer, gameTime: game.gameTime }} />
        </div>
      )}

      {threats.length > 0 && (
        <div className={panel} style={boxStyle(layout.threats)}>
          <ThreatsContent box={layout.threats} threats={threats} />
        </div>
      )}

      {build && build.items.length > 0 && (
        <div className={panel} style={boxStyle(layout.items)}>
          <ItemsContent box={layout.items} items={build.items} />
        </div>
      )}

      {tips.length > 0 && (
        <div className={panel} style={boxStyle(layout.tips)}>
          <TipsContent box={layout.tips} tips={tips} />
        </div>
      )}

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
