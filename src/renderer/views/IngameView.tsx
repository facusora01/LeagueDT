import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { championSquareByName, itemIcon } from '../lib/ddragon';
import { Card, SectionTitle, ThreatBadge, TipPriorityBorder, EmptyState, formatGameTime } from '../components/common';
import type { GameStateDTO, ThreatDTO, ItemBuildDTO, TipDTO } from '../../shared/types';

export const IngameView: React.FC = () => {
  const [game, setGame] = useState<GameStateDTO | null>(null);
  const [threats, setThreats] = useState<ThreatDTO[]>([]);
  const [build, setBuild] = useState<ItemBuildDTO | null>(null);
  const [tips, setTips] = useState<TipDTO[]>([]);

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
        return merged.filter(t => (seen.has(t.id) ? false : seen.add(t.id))).slice(0, 8);
      }),
    );
  }, []);

  if (!game) {
    return (
      <div className="space-y-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">En Partida</h2>
            <p className="text-sm text-text-secondary">El coach se activa automáticamente al iniciar una partida</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => api.simulateGame()}
              className="px-4 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-md text-sm hover:bg-secondary/30 transition-colors"
            >
              Simular partida
            </button>
            <button
              onClick={() => api.startIngameCoach()}
              className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-md text-sm hover:bg-primary/30 transition-colors"
            >
              Forzar inicio
            </button>
          </div>
        </Card>
        <EmptyState title="No hay partida activa" hint="Entrá a una partida, o usá 'Simular partida' para probar el coach" />
      </div>
    );
  }

  const lp = game.localPlayer;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-mono font-bold text-secondary">{formatGameTime(game.gameTime)}</div>
          <div>
            <p className="text-sm font-medium text-text-primary">{lp.championName}</p>
            <p className="text-xs text-text-secondary">
              Nivel {lp.level} · {lp.kills}/{lp.deaths}/{lp.assists} · {lp.cs} CS
            </p>
          </div>
        </div>
        {lp.currentGold !== undefined && (
          <div className="text-right">
            <p className="text-xs text-text-muted">Oro</p>
            <p className="text-secondary font-medium">{lp.currentGold.toLocaleString()}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Threats */}
        <Card className="p-4">
          <SectionTitle>Amenazas Enemigas</SectionTitle>
          {threats.length === 0 ? (
            <EmptyState title="Analizando…" />
          ) : (
            <div className="space-y-2">
              {threats.map(t => (
                <div key={t.summonerName} className="flex items-center gap-3 p-2 rounded-md bg-surface-light">
                  <img
                    src={championSquareByName(t.championName)}
                    alt=""
                    className="w-9 h-9 rounded border border-border shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-text-primary truncate">{t.championName}</span>
                      <ThreatBadge level={t.threatLevel} />
                    </div>
                    <p className="text-[11px] text-text-muted truncate">
                      KDA {t.kda.toFixed(1)} · {t.reasons[0]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Items */}
        <Card className="p-4">
          <SectionTitle right={build ? <span className="text-xs text-text-muted">{build.buildStyle}</span> : undefined}>
            Items Recomendados
          </SectionTitle>
          {!build || build.items.length === 0 ? (
            <EmptyState title="Sin sugerencias aún" />
          ) : (
            <>
              <div className="space-y-2">
                {build.items.map(item => (
                  <div key={item.itemId} className="flex items-center gap-3 p-1.5 rounded-md hover:bg-surface-light">
                    <img
                      src={itemIcon(item.itemId)}
                      alt=""
                      className="w-9 h-9 rounded border border-secondary/30 shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary">{item.name}</span>
                      <p className="text-[11px] text-text-muted truncate">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-2 pt-2 border-t border-border">{build.reasoning}</p>
            </>
          )}
        </Card>
      </div>

      {/* Tips */}
      <Card className="p-4">
        <SectionTitle>Tips Estratégicos</SectionTitle>
        {tips.length === 0 ? (
          <EmptyState title="Los tips aparecen según eventos del juego" />
        ) : (
          <div className="space-y-2">
            {tips.map(tip => (
              <div
                key={tip.id}
                className={`pl-3 py-2 border-l-2 bg-surface-light rounded-r-md ${TipPriorityBorder(tip.priority)}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase text-text-muted">{tip.category}</span>
                  <span className="text-sm text-text-primary">{tip.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
