import type { LogEntry } from '../../types/gameState';
import { TONE_TEXT } from '../UI/Panel';
import type { Tone } from '../UI/Panel';

const SEVERITY_TONE: Record<LogEntry['severity'], Tone> = {
  info: 'mute',
  good: 'good',
  warn: 'warn',
  crit: 'crit',
};

const KIND_LABEL: Record<LogEntry['kind'], string> = {
  build: 'DESIGN',
  flight: 'FLIGHT',
  hazard: 'HAZARD',
  situation: 'ALERT',
  decision: 'DECISION',
  outcome: 'RESULT',
};

/** The simulation log, newest first. This is the record the autopsy reads. */
export function EventLog({ entries, limit }: { entries: LogEntry[]; limit?: number }) {
  const shown = [...entries].reverse().slice(0, limit);
  return (
    <ol className="space-y-2">
      {shown.map((entry) => (
        <li key={entry.id} className="grid grid-cols-[64px_1fr] gap-2 text-xs">
          <span className="tabular-nums text-mute">DAY {entry.day}</span>
          <div>
            <div className={TONE_TEXT[SEVERITY_TONE[entry.severity]]}>
              <span className="mr-1.5 text-[10px] tracking-wider opacity-70">[{KIND_LABEL[entry.kind]}]</span>
              {entry.title}
            </div>
            <p className="text-ink/60">{entry.text}</p>
            {entry.changes.length > 0 && <p className="text-cyan/80">{entry.changes.join(' · ')}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
