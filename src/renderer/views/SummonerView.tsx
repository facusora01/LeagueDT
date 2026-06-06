import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { championSquare, profileIcon } from '../lib/ddragon';
import { Card, SectionTitle, EmptyState } from '../components/common';
import { HotkeyCapture } from '../components/HotkeyCapture';
import type { Summoner, ChampionMastery } from '../../shared/types';

const REGIONS = ['LA2', 'LA1', 'NA1', 'BR1', 'EUW1', 'EUN1', 'KR', 'JP1'];

const KeyStatus: React.FC<{ status: string; hasStored: boolean }> = ({ status, hasStored }) => {
  if (status === 'checking') return <span className="text-xs text-text-muted">Validando…</span>;
  if (status === 'valid') return <span className="text-xs text-success">✓ Válida</span>;
  if (status === 'invalid') return <span className="text-xs text-destructive">✗ Inválida o expirada</span>;
  if (status === 'unknown') return <span className="text-xs text-warning">Guardada (no se pudo validar)</span>;
  if (hasStored) return <span className="text-xs text-text-muted">Hay una key guardada</span>;
  return <></>;
};

export const SummonerView: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'unknown'>('idle');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('LA2');
  const [summoner, setSummoner] = useState<Summoner | null>(null);
  const [masteries, setMasteries] = useState<ChampionMastery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAllSummoners().then(list => {
      if (list.length > 0) {
        setSummoner(list[0]);
        loadMastery(list[0].id);
      }
    });
    api.getSettings().then(s => setHasStoredKey(!!s?.apiKey));

    // Auto-detected account from the running League client
    api.onCurrentSummoner(s => {
      setSummoner(s);
      loadMastery(s.id);
    });
    api.onMasterySynced(id => loadMastery(id));
  }, []);

  async function loadMastery(summonerId: string) {
    try {
      const m = await api.getMastery(summonerId);
      setMasteries(m.slice(0, 12));
    } catch { /* ignore */ }
  }

  async function saveKey() {
    if (!apiKey.trim()) return;
    setKeyStatus('checking');
    const res = await api.setApiKey(apiKey.trim());
    setKeyStatus(res.validity);
    if (res.validity !== 'invalid') setHasStoredKey(true);
  }

  async function search() {
    setError(null);
    setLoading(true);
    try {
      const s = await api.searchSummoner(gameName.trim(), tagLine.trim(), region);
      setSummoner(s);
      await api.syncMastery(s.id);
      await loadMastery(s.id);
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('401') || msg.includes('403')) {
        setError('API key inválida o expirada. Regenerá una en developer.riotgames.com y guardala arriba.');
      } else if (msg.includes('404')) {
        setError('Invocador no encontrado. Revisá nombre, tag y región.');
      } else if (msg.includes('not set')) {
        setError('Falta la API key. Ingresala y guardala arriba.');
      } else {
        setError(msg || 'Error al buscar invocador.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* API Key */}
      <Card className="p-4">
        <SectionTitle right={<KeyStatus status={keyStatus} hasStored={hasStoredKey} />}>
          Riot API Key
        </SectionTitle>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <button
            onClick={saveKey}
            className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-md text-sm hover:bg-primary/30 transition-colors"
          >
            Guardar
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Se obtiene en developer.riotgames.com. Las dev keys expiran cada 24h.
        </p>
      </Card>

      {/* Settings */}
      <Card className="p-4">
        <SectionTitle>Atajo del overlay</SectionTitle>
        <HotkeyCapture />
        <p className="text-xs text-text-muted mt-2">
          Tocá el botón y presioná la combinación (necesita al menos un modificador, ej. Ctrl o Alt).
        </p>
      </Card>

      {/* Search */}
      <Card className="p-4">
        <SectionTitle>Buscar Invocador</SectionTitle>
        <div className="flex gap-2">
          <input
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            placeholder="Nombre"
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <span className="flex items-center text-text-muted">#</span>
          <input
            value={tagLine}
            onChange={e => setTagLine(e.target.value)}
            placeholder="TAG"
            className="w-24 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-2 text-sm outline-none focus:border-primary"
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={search}
            disabled={loading || !gameName || !tagLine}
            className="px-4 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-md text-sm hover:bg-secondary/30 transition-colors disabled:opacity-40"
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </Card>

      {/* Profile */}
      {summoner && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <img
              src={profileIcon(summoner.profileIconId)}
              alt=""
              className="w-16 h-16 rounded-lg border border-secondary/40"
              onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
            />
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {summoner.name}<span className="text-text-muted text-base">#{summoner.tagLine}</span>
              </h2>
              <p className="text-sm text-text-secondary">
                Nivel {summoner.level} · {summoner.region}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Mastery */}
      {summoner && (
        <Card className="p-4">
          <SectionTitle>Maestría de Campeones</SectionTitle>
          {masteries.length === 0 ? (
            <EmptyState title="Sin datos de maestría" hint="Buscá un invocador para sincronizar" />
          ) : (
            <div className="grid grid-cols-6 gap-3">
              {masteries.map(m => (
                <div key={m.championId} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <img
                      src={championSquare(m.championId)}
                      alt=""
                      className="w-12 h-12 rounded-md border border-border"
                      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                    <span className="absolute -bottom-1 -right-1 bg-background border border-secondary/40 text-secondary text-[10px] px-1 rounded">
                      {m.level}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {(m.points / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
