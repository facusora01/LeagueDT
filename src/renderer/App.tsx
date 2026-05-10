import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const [pingResponse, setPingResponse] = useState<string>('Esperando ping...');
  const [lcuStatus, setLcuStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [dbSettings, setDbSettings] = useState<any>(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.ping().then(response => {
        setPingResponse(response);
      });

      // Get initial status
      window.electronAPI.getLcuStatus().then(status => {
        setLcuStatus(status);
      });

      // Listen for LCU status changes
      window.electronAPI.onLcuStatusChange((status) => {
        setLcuStatus(status);
      });

      // Fetch DB Settings
      window.electronAPI.getSettings().then(settings => {
        setDbSettings(settings);
      });
    } else {
      setPingResponse('No electronAPI found (Ejecutando en navegador)');
    }
  }, []);

  const toggleTheme = async () => {
    if (window.electronAPI && dbSettings) {
      const newTheme = dbSettings.theme === 'dark' ? 'light' : 'dark';
      const updated = await window.electronAPI.updateSettings({ theme: newTheme });
      setDbSettings(updated);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
      <div className="draggable w-full h-10 bg-surface-light absolute top-0 left-0 flex items-center px-4 shadow-sm select-none border-b border-border z-10">
        <h1 className="font-semibold text-primary">LeagueDT</h1>
      </div>
      
      <div className="w-96 max-w-full text-center mt-12 p-6 rounded-lg bg-surface border border-border shadow-xl no-drag">
        <h2 className="text-2xl font-bold mb-4 text-secondary">Director Técnico Listo</h2>
        <p className="text-muted-foreground mb-6">El proyecto Base (Fase 1) está corriendo correctamente. Conectando Phase 2...</p>
        
        <div className={`p-4 rounded-md border flex items-center justify-between mb-4 ${
          lcuStatus === 'connected' 
            ? 'bg-success/10 border-success/30 text-success' 
            : 'bg-destructive/10 border-destructive/30 text-destructive'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${lcuStatus === 'connected' ? 'bg-success shadow-[0_0_8px_theme(colors.success.DEFAULT)]' : 'bg-destructive animate-pulse'}`}></div>
            <span className="font-medium">
              {lcuStatus === 'connected' ? 'Cliente Conectado' : 'Esperando Cliente de LoL...'}
            </span>
          </div>
        </div>

        <div className="bg-surface-light p-3 rounded-md border border-border text-sm font-mono text-left overflow-hidden opacity-70 mb-4">
          <span className="text-info">IPC Status:</span> {pingResponse}
        </div>

        {dbSettings && (
          <div className="p-4 rounded-md border border-border text-left">
            <h3 className="font-semibold text-primary mb-2 flex items-center justify-between">
              Base de Datos SQLite
              <button 
                onClick={toggleTheme}
                className="text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors"
              >
                Alternar Tema
              </button>
            </h3>
            <pre className="text-xs text-muted-foreground overflow-auto p-2 bg-background rounded">
              {JSON.stringify(dbSettings, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
