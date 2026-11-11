import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  pct: number;
  /** Below this percentage the bar turns amber; below half of it, red and blinking. */
  warnBelow?: number;
}

/** A compact HUD gauge that sits over the game world. */
export function HudBar({ icon, label, value, pct, warnBelow = 40 }: Props) {
  const critical = pct < warnBelow / 2;
  const warn = pct < warnBelow;
  const color = critical ? 'bg-alert' : warn ? 'bg-amber' : 'bg-phosphor';
  const text = critical ? 'text-alert' : warn ? 'text-amber' : 'text-phosphor';
  return (
    <div className="flex items-center gap-2">
      <span className={`${text} ${critical ? 'blink' : ''}`}>{icon}</span>
      <div className="w-40">
        <div className="flex justify-between text-[10px] uppercase tracking-widest">
          <span className="text-mute">{label}</span>
          <span className={`tabular-nums ${text}`}>{value}</span>
        </div>
        <div className="h-1.5 border border-line bg-void/80">
          <div className={`h-full transition-[width] duration-300 ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </div>
      </div>
    </div>
  );
}
