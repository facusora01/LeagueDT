import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { championSquare } from '../lib/ddragon';
import { Card, SectionTitle, ScoreBar, EmptyState } from '../components/common';
import type { DraftStateDTO, ChampionRecDTO, BanSugDTO, RuneRecDTO } from '../../shared/types';

const PHASE_LABEL: Record<string, string> = {
  idle: 'Esperando',
  banning: 'Fase de Bans',
  picking: 'Fase de Picks',
  finished: 'Draft Finalizado',
};

export const DraftView: React.FC = () => {
  const [state, setState] = useState<DraftStateDTO | null>(null);
  const [recs, setRecs] = useState<ChampionRecDTO[]>([]);
  const [bans, setBans] = useState<BanSugDTO[]>([]);
  const [runes, setRunes] = useState<RuneRecDTO | null>(null);

  useEffect(() => {
    api.getDraftState().then(setState);
    api.onDraftStateChanged(setState);
    api.onDraftRecommendations(setRecs);
    api.onDraftBanSuggestions(setBans);
    api.onDraftRuneSuggestion(setRunes);
  }, []);

  const phase = state?.phase ?? 'idle';
  const isIdle = phase === 'idle';

  return (
    <div className="space-y-4">
      {/* Phase header */}
      <Card className="p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">{PHASE_LABEL[phase]}</h2>
          <p className="text-sm text-text-secondary">
            {isIdle ? 'Entrá a champion select para ver recomendaciones' : 'Análisis en vivo'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state?.isMyTurn && (
            <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded-full text-sm animate-pulse">
              Tu turno
            </span>
          )}
          <button
            onClick={() => api.simulateDraft('pick')}
            className="px-3 py-1.5 text-xs bg-surface-light text-text-secondary border border-border rounded-md hover:text-text-primary"
          >
            Simular picks
          </button>
          <button
            onClick={() => api.simulateDraft('ban')}
            className="px-3 py-1.5 text-xs bg-surface-light text-text-secondary border border-border rounded-md hover:text-text-primary"
          >
            Simular bans
          </button>
        </div>
      </Card>

      {isIdle && (
        <EmptyState title="No hay draft activo" hint="Las recomendaciones aparecen al entrar en champion select" />
      )}

      {!isIdle && (
        <div className="grid grid-cols-2 gap-4">
          {/* Teams */}
          <Card className="p-4">
            <SectionTitle>Composiciones</SectionTitle>
            <div className="space-y-3">
              <TeamRow label="Aliados" champs={state?.allyPicks ?? []} variant="ally" />
              <TeamRow label="Enemigos" champs={state?.enemyPicks ?? []} variant="enemy" />
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-text-muted mb-1">Bans</p>
                <div className="flex gap-1 flex-wrap">
                  {[...(state?.allyBans ?? []), ...(state?.enemyBans ?? [])].map((id, i) => (
                    <img
                      key={i}
                      src={championSquare(id)}
                      alt=""
                      className="w-7 h-7 rounded grayscale opacity-60 border border-border"
                      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                  ))}
                  {(state?.allyBans.length ?? 0) + (state?.enemyBans.length ?? 0) === 0 && (
                    <span className="text-xs text-text-muted">Sin bans aún</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Recommendations / Bans */}
          <Card className="p-4">
            {phase === 'banning' ? (
              <>
                <SectionTitle>Bans Sugeridos</SectionTitle>
                <RecList items={bans.map(b => ({
                  id: b.champion.id,
                  name: b.champion.name,
                  score: b.score,
                  reasons: b.reasons,
                }))} />
              </>
            ) : (
              <>
                <SectionTitle>Picks Recomendados</SectionTitle>
                <RecList items={recs.map(r => ({
                  id: r.champion.id,
                  name: r.champion.name,
                  score: r.score,
                  reasons: r.reasons,
                  badge: r.masteryLevel > 0 ? `M${r.masteryLevel}` : undefined,
                }))} />
              </>
            )}
          </Card>
        </div>
      )}

      {/* Rune suggestion for the local player's champion */}
      {!isIdle && runes && (
        <Card className="p-4">
          <SectionTitle>Runas Recomendadas</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-text-muted">Keystone</span>
              <span className="text-secondary font-semibold">{runes.keystone.name}</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-sm">
              <div>
                <span className="text-text-muted">Primaria: </span>
                <span className="text-primary">{runes.primaryTree.name}</span>
              </div>
              <div>
                <span className="text-text-muted">Secundaria: </span>
                <span className="text-text-secondary">{runes.secondaryTree.name}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">{runes.reasoning}</p>
        </Card>
      )}
    </div>
  );
};

const TeamRow: React.FC<{ label: string; champs: { id: number; name: string }[]; variant: 'ally' | 'enemy' }> = ({
  label,
  champs,
  variant,
}) => {
  const labelColor = variant === 'ally' ? 'text-primary' : 'text-destructive';
  const borderColor = variant === 'ally' ? 'border-primary/40' : 'border-destructive/40';
  return (
    <div>
      <p className={`text-xs mb-1 ${labelColor}`}>{label}</p>
      <div className="flex gap-1">
        {champs.length === 0 && <span className="text-xs text-text-muted">—</span>}
        {champs.map(c => (
          <img
            key={c.id}
            src={championSquare(c.id)}
            alt={c.name}
            title={c.name}
            className={`w-9 h-9 rounded border ${borderColor}`}
            onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
          />
        ))}
      </div>
    </div>
  );
};

interface RecItem {
  id: number;
  name: string;
  score: number;
  reasons: string[];
  badge?: string;
}

const RecList: React.FC<{ items: RecItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return <EmptyState title="Calculando…" hint="Esperando tu turno" />;
  }
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-light transition-colors">
          <img
            src={championSquare(item.id)}
            alt=""
            className="w-10 h-10 rounded border border-border shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary truncate">
                {item.name}
                {item.badge && <span className="ml-2 text-[10px] text-secondary">{item.badge}</span>}
              </span>
              <span className="text-xs text-text-muted ml-2">{item.score}</span>
            </div>
            <ScoreBar score={item.score} />
            <p className="text-[11px] text-text-muted mt-1 truncate">{item.reasons[0]}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
