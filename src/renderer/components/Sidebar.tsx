import React from 'react';

export type ViewId = 'summoner' | 'draft' | 'ingame';

interface NavItem {
  id: ViewId;
  label: string;
  glyph: string;
}

const ITEMS: NavItem[] = [
  { id: 'summoner', label: 'Invocador', glyph: '👤' },
  { id: 'draft', label: 'Draft', glyph: '⚔️' },
  { id: 'ingame', label: 'En Partida', glyph: '🎯' },
];

interface Props {
  active: ViewId;
  onSelect: (id: ViewId) => void;
  draftActive: boolean;
  gameActive: boolean;
}

export const Sidebar: React.FC<Props> = ({ active, onSelect, draftActive, gameActive }) => (
  <nav className="w-44 shrink-0 bg-surface border-r border-border flex flex-col py-3 gap-1">
    {ITEMS.map(item => {
      const isActive = active === item.id;
      const live =
        (item.id === 'draft' && draftActive) || (item.id === 'ingame' && gameActive);
      return (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`mx-2 px-3 py-2.5 rounded-md flex items-center gap-3 text-sm transition-colors text-left ${
            isActive
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-text-secondary hover:bg-surface-light hover:text-text-primary border border-transparent'
          }`}
        >
          <span className="text-base">{item.glyph}</span>
          <span className="flex-1">{item.label}</span>
          {live && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
        </button>
      );
    })}
  </nav>
);
