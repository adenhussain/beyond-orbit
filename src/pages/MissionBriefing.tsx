import { useEffect, useState } from 'react';
import { ChevronLeft, Wrench } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Panel } from '../components/UI/Panel';
import { useGame } from '../state/useGame';

/** Reveals text one character at a time, like a teletype. */
function useTypewriter(text: string, speed = 12): string {
  const [length, setLength] = useState(0);
  useEffect(() => {
    setLength(0);
    const timer = setInterval(() => {
      setLength((current) => {
        if (current >= text.length) clearInterval(timer);
        return Math.min(text.length, current + 2);
      });
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return text.slice(0, length);
}

export function MissionBriefing() {
  const { mission, dispatch } = useGame();
  const fullText = mission ? mission.briefing.join('\n\n') : '';
  const typed = useTypewriter(fullText);
  if (!mission) return null;

  const done = typed.length >= fullText.length;
  const stops = ['Explore the base and collect supplies', 'Build the spacecraft in the workshop', 'Launch', ...mission.phases.map((p) => p.name)];

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-5 p-5">
      <div>
        <p className="label text-cyan">{mission.codename} — EYES ONLY</p>
        <h1 className="display mt-1 text-2xl font-bold text-ink">{mission.name}</h1>
      </div>

      <Panel title="Briefing from the Flight Director" right={done ? 'END OF MESSAGE' : 'RECEIVING…'}>
        <p className="min-h-56 whitespace-pre-line text-[15px] leading-relaxed text-phosphor">
          {typed}
          {!done && <span className="blink">█</span>}
        </p>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Primary Objective" tone="info">
          <p className="text-sm text-ink/90">{mission.objective}</p>
          <p className="mt-3 text-xs text-mute">
            Success requires returning {mission.scienceTarget} science points to Earth. Half of that earns a partial success.
          </p>
        </Panel>
        <Panel title="Flight Plan" tone="info">
          <ol className="space-y-1.5 text-sm">
            {stops.map((stop, index) => (
              <li key={stop} className="flex items-center gap-3">
                <span className="w-5 text-right text-mute">{index + 1}</span>
                <span className="h-px w-4 bg-line-hi" />
                <span className="text-ink/90">{stop}</span>
                {index >= 3 && index <= 5 && <span className="label text-amber">⚠ decision point</span>}
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'missions' })}>
          Change Mission
        </Button>
        <Button icon={<Wrench size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'explore' })}>
          Suit Up — Begin Exploration
        </Button>
      </div>
    </div>
  );
}
