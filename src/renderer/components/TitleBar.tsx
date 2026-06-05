import React from 'react';

interface Props {
  lcuStatus: 'connected' | 'disconnected';
  ddVersion: string | null;
}

export const TitleBar: React.FC<Props> = ({ lcuStatus, ddVersion }) => (
  <div className="draggable h-10 shrink-0 bg-surface-light border-b border-border flex items-center justify-between px-4 select-none">
    <div className="flex items-center gap-2">
      <span className="font-bold text-primary tracking-wide">League<span className="text-secondary">DT</span></span>
      {ddVersion && <span className="text-xs text-text-muted">patch {ddVersion}</span>}
    </div>

    <div className="no-drag flex items-center gap-2 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${
          lcuStatus === 'connected'
            ? 'bg-success shadow-[0_0_6px_var(--success)]'
            : 'bg-destructive animate-pulse'
        }`}
      />
      <span className={lcuStatus === 'connected' ? 'text-success' : 'text-text-muted'}>
        {lcuStatus === 'connected' ? 'Cliente conectado' : 'Sin cliente'}
      </span>
    </div>
  </div>
);
