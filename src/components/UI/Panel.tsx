import type { ReactNode } from 'react';

export type Tone = 'good' | 'warn' | 'crit' | 'info' | 'mute';

export const TONE_TEXT: Record<Tone, string> = {
  good: 'text-phosphor',
  warn: 'text-amber',
  crit: 'text-alert',
  info: 'text-cyan',
  mute: 'text-mute',
};

export const TONE_BG: Record<Tone, string> = {
  good: 'bg-phosphor',
  warn: 'bg-amber',
  crit: 'bg-alert',
  info: 'bg-cyan',
  mute: 'bg-mute',
};

export const TONE_BORDER: Record<Tone, string> = {
  good: 'border-phosphor-dim',
  warn: 'border-amber/60',
  crit: 'border-alert/70',
  info: 'border-cyan/50',
  mute: 'border-line',
};

interface PanelProps {
  title?: string;
  right?: ReactNode;
  tone?: Tone;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** The basic mission-control console panel with a labelled header strip. */
export function Panel({ title, right, tone = 'good', className = '', bodyClassName = 'p-4', children }: PanelProps) {
  return (
    <section className={`panel flex min-h-0 flex-col ${className}`}>
      {title && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-panel-hi/60 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 ${TONE_BG[tone]}`} />
            <h2 className="label !text-ink">{title}</h2>
          </div>
          {right && <div className="label">{right}</div>}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
