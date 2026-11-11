import type { ReactNode } from 'react';
import { TONE_BG, TONE_TEXT } from './Panel';
import type { Tone } from './Panel';

interface MeterProps {
  label: string;
  value: string;
  /** 0..100: how full the bar is. */
  pct: number;
  tone?: Tone;
  icon?: ReactNode;
  note?: string;
  /** Optional marker (0..100), e.g. the minimum required level. */
  marker?: number;
}

/** A labelled telemetry bar. The bar width always reflects a real value. */
export function Meter({ label, value, pct, tone = 'good', icon, note, marker }: MeterProps) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="label flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className={`text-sm tabular-nums ${TONE_TEXT[tone]}`}>{value}</span>
      </div>
      <div className="relative mt-1 h-2 border border-line bg-void">
        <div className={`h-full transition-[width] duration-500 ${TONE_BG[tone]}`} style={{ width: `${width}%` }} />
        {marker !== undefined && (
          <div className="absolute -top-0.5 -bottom-0.5 w-px bg-ink" style={{ left: `${Math.min(100, marker)}%` }} />
        )}
      </div>
      {note && <div className="mt-1 text-[11px] leading-tight text-mute">{note}</div>}
    </div>
  );
}
