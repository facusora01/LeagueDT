import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { championSquare } from '../lib/ddragon';
import { SectionTitle, EmptyState } from './common';
import type { Summoner } from '../../shared/types';

const QUEUE_NAMES: Record<number, string> = {
  400: 'Normal Draft', 420: 'Ranked Solo/Duo', 430: 'Normal Blind',
  440: 'Ranked Flex', 450: 'ARAM', 490: 'Quickplay', 700: 'Clash',
  830: 'Co-op vs IA', 840: 'Co-op vs IA', 850: 'Co-op vs IA',
  900: 'URF', 1700: 'Arena',
};

function timeAgo(d: Date | string): string {
  const date = new Date(d);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export const MatchHistory: React.FC<{ summoner: Summoner }> = ({ summoner }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMatches(summoner.id, 20).then(setMatches).catch(() => {});
  }, [summoner.id]);

  async function sync() {
    setError(null);
    setLoading(true);
    try {
      await api.syncMatches(summoner.id, 10);
      setMatches(await api.getMatches(summoner.id, 20));
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      setError(msg.includes('not set') ? 'Falta la API key.' : 'Error al sincronizar partidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SectionTitle
        right={
          <button
            onClick={sync}
            disabled={loading}
            className="text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 disabled:opacity-40"
          >
            {loading ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        }
      >
        Partidas Recientes
      </SectionTitle>

      {error && <p className="text-xs text-destructive mb-2">{error}</p>}

      {matches.length === 0 ? (
        <EmptyState title="Sin partidas" hint="Tocá Sincronizar para traer tu historial" />
      ) : (
        <div className="space-y-1.5">
          {matches.map(m => {
            const me = m.participants.find((p: any) => p.puuid === summoner.puuid);
            if (!me) return null;
            const kda = me.deaths === 0 ? '∞' : ((me.kills + me.assists) / me.deaths).toFixed(1);
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-2 rounded-md border ${
                  me.win ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/25'
                }`}
              >
                <img
                  src={championSquare(me.championId)}
                  alt=""
                  className="w-10 h-10 rounded border border-border shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${me.win ? 'text-success' : 'text-destructive'}`}>
                      {me.win ? 'Victoria' : 'Derrota'}
                    </span>
                    <span className="text-xs text-text-muted">{QUEUE_NAMES[m.queueId] ?? m.gameMode}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{me.kills}/{me.deaths}/{me.assists} · {kda} KDA · {me.creepScore} CS</span>
                    <span className="text-text-muted">{timeAgo(m.gameCreation)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
