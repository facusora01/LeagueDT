import React, { useEffect, useState } from 'react';
import { api, hasApi } from './lib/api';
import { setVersion, indexChampions } from './lib/ddragon';
import { TitleBar } from './components/TitleBar';
import { Sidebar, type ViewId } from './components/Sidebar';
import { SummonerView } from './views/SummonerView';
import { DraftView } from './views/DraftView';
import { IngameView } from './views/IngameView';
import { OverlayView } from './views/OverlayView';
import { OverlayEditor } from './views/OverlayEditor';

type OverlayMode = 'off' | 'live' | 'edit';

const App: React.FC = () => {
  const [view, setView] = useState<ViewId>('summoner');
  const [lcuStatus, setLcuStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [ddVersion, setDdVersion] = useState<string | null>(null);
  const [draftActive, setDraftActive] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('off');

  useEffect(() => {
    if (!hasApi) return;

    // Load DataDragon version + champion index for image lookups
    api.getDDVersion().then(v => {
      setDdVersion(v);
      setVersion(v);
    });
    api.getAllChampions().then(indexChampions);

    // LCU status
    api.getLcuStatus().then(setLcuStatus);
    api.onLcuStatusChange(setLcuStatus);

    // Live indicators for sidebar dots + auto-switch views
    api.getDraftState().then(s => setDraftActive(s.phase !== 'idle'));
    api.onDraftStateChanged(s => {
      const active = s.phase !== 'idle' && s.phase !== 'finished';
      setDraftActive(active);
      if (active) setView('draft');
    });
    api.onGameStarted(() => { setGameActive(true); setView('ingame'); });
    api.onGameEnded(() => setGameActive(false));

    // Overlay mode (live via hotkey, edit via settings)
    api.getOverlayMode().then(s => setOverlayMode(s.mode));
    api.onOverlayMode(setOverlayMode);
  }, []);

  // Make the page background transparent while any overlay mode is active.
  useEffect(() => {
    document.body.style.background = overlayMode !== 'off' ? 'transparent' : '';
  }, [overlayMode]);

  if (!hasApi) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Ejecutando fuera de Electron — sin acceso a electronAPI.
      </div>
    );
  }

  if (overlayMode === 'live') return <OverlayView />;
  if (overlayMode === 'edit') return <OverlayEditor />;

  return (
    <div className="flex flex-col h-full bg-background text-text-primary">
      <TitleBar lcuStatus={lcuStatus} ddVersion={ddVersion} />
      <div className="flex flex-1 min-h-0">
        <Sidebar active={view} onSelect={setView} draftActive={draftActive} gameActive={gameActive} />
        <main className="flex-1 overflow-y-auto p-5">
          {view === 'summoner' && <SummonerView />}
          {view === 'draft' && <DraftView />}
          {view === 'ingame' && <IngameView />}
        </main>
      </div>
    </div>
  );
};

export default App;
