import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const [pingResponse, setPingResponse] = useState<string>('Esperando ping...');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.ping().then(response => {
        setPingResponse(response);
      });
    } else {
      setPingResponse('No electronAPI found (Ejecutando en navegador)');
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
      <div className="draggable w-full h-10 bg-surface-light absolute top-0 left-0 flex items-center px-4 shadow-sm select-none border-b border-border z-10">
        <h1 className="font-semibold text-primary">LeagueDT</h1>
      </div>
      
      <div className="w-96 max-w-full text-center mt-12 p-6 rounded-lg bg-surface border border-border shadow-xl no-drag">
        <h2 className="text-2xl font-bold mb-4 text-secondary">Director Técnico Listo</h2>
        <p className="text-muted-foreground mb-4">El proyecto Base (Fase 1) está corriendo correctamente.</p>
        
        <div className="bg-surface-light p-3 rounded-md border border-border text-sm font-mono text-left overflow-hidden">
          <span className="text-info">IPC Status:</span> {pingResponse}
        </div>
      </div>
    </div>
  );
};

export default App;
