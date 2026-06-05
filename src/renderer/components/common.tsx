import React from 'react';

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => (
  <div className={`bg-surface border border-border rounded-lg shadow-lg ${className}`}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({
  children,
  right,
}) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold uppercase tracking-wider text-secondary">{children}</h3>
    {right}
  </div>
);

export const ScoreBar: React.FC<{ score: number; max?: number }> = ({ score, max = 100 }) => {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color =
    pct >= 70 ? 'bg-primary' : pct >= 40 ? 'bg-warning' : 'bg-text-muted';
  return (
    <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const THREAT_STYLES: Record<string, string> = {
  low: 'bg-info/15 text-info border-info/30',
  medium: 'bg-warning/15 text-warning border-warning/30',
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  extreme: 'bg-destructive/30 text-destructive border-destructive/60 font-bold',
};

export const ThreatBadge: React.FC<{ level: string }> = ({ level }) => (
  <span className={`text-xs px-2 py-0.5 rounded border ${THREAT_STYLES[level] ?? THREAT_STYLES.low}`}>
    {level.toUpperCase()}
  </span>
);

const PRIORITY_STYLES: Record<string, string> = {
  low: 'border-l-text-muted',
  medium: 'border-l-info',
  high: 'border-l-warning',
  critical: 'border-l-destructive',
};

export const TipPriorityBorder = (priority: string): string =>
  PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low;

export function formatGameTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; hint?: string }> = ({
  icon,
  title,
  hint,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-12 text-text-muted">
    {icon && <div className="mb-3 opacity-50">{icon}</div>}
    <p className="font-medium text-text-secondary">{title}</p>
    {hint && <p className="text-sm mt-1">{hint}</p>}
  </div>
);
