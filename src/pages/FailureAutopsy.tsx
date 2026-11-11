import { useMemo } from 'react';
import { ChevronLeft, History, RotateCcw, Wrench } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Panel, TONE_TEXT } from '../components/UI/Panel';
import { analyzeFailure } from '../engine/failureAnalyzer';
import { sound } from '../services/sound';
import { useGame } from '../state/useGame';

const KIND_LABEL = { build: 'DESIGN', flight: 'FLIGHT', hazard: 'HAZARD', situation: 'EVENT', decision: 'DECISION', outcome: 'RESULT' } as const;

export function FailureAutopsy() {
  const { dispatch, mission, timeline } = useGame();
  const autopsy = useMemo(() => (timeline && mission ? analyzeFailure(timeline, mission) : null), [timeline, mission]);
  if (!mission || !timeline) return null;

  if (!autopsy) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Panel title="Failure Autopsy">
          <p className="text-sm text-phosphor">Nothing failed in this timeline. There is no damage to investigate.</p>
          <Button className="mt-4" variant="ghost" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'outcome' })}>Back to Report</Button>
        </Panel>
      </div>
    );
  }
  const failure = autopsy.grade === 'failure';
  const tone = failure ? 'crit' : 'warn';

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-4">
      <div>
        <p className={`label ${TONE_TEXT[tone]}`}>{failure ? 'FAILURE AUTOPSY' : 'DAMAGE ANALYSIS'} · {mission.codename} · TIMELINE {timeline.name}</p>
        <h1 className="display mt-1 text-2xl font-bold text-ink">{autopsy.whatFailed}</h1>
        <p className="mt-1 text-xs text-mute">Reconstructed from {timeline.state.log.length} simulation log entries. Nothing in this report is pre-written.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="What failed" tone={tone}>
          <p className="text-sm text-ink/90">{autopsy.whatFailedDetail}</p>
        </Panel>
        <Panel title="When" tone={tone}>
          <p className="text-sm text-ink/90">{autopsy.whenFailed}</p>
        </Panel>
        <Panel title={autopsy.primaryCause.isDesign ? 'Root cause — a design decision' : 'Root cause — an in-flight event'} tone={tone}>
          <p className={`text-sm ${TONE_TEXT[tone]}`}>{autopsy.primaryCause.title}</p>
          <p className="mt-1 text-xs text-ink/75">{autopsy.primaryCause.text}</p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Cascade */}
        <Panel title="Cascade — how one event caused another" tone={tone}>
          <ol>
            {autopsy.cascade.map((link, index) => (
              <li key={index} className="relative grid grid-cols-[84px_1fr] gap-3 pb-4 last:pb-0">
                <div className="text-right text-xs">
                  <div className="tabular-nums text-mute">DAY {link.day}</div>
                  <div className="text-[10px] tracking-wider text-cyan/80">{KIND_LABEL[link.kind]}</div>
                </div>
                <div className={`border-l-2 pl-3 ${link.severity === 'crit' ? 'border-alert' : 'border-amber'}`}>
                  <div className={`text-sm ${link.severity === 'crit' ? 'text-alert' : 'text-amber'}`}>{link.title}</div>
                  <p className="text-xs text-ink/70">{link.text}</p>
                  {link.changes.length > 0 && <p className="text-xs text-cyan/80">{link.changes.join(' · ')}</p>}
                  {link.because.map((reason) => (
                    <p key={reason} className="text-xs text-mute">↳ {reason}</p>
                  ))}
                  {index < autopsy.cascade.length - 1 && <div className="mt-2 text-xs text-mute">▼ led to</div>}
                </div>
              </li>
            ))}
            <li className="grid grid-cols-[84px_1fr] gap-3 pt-4">
              <div className="text-right text-[10px] tracking-wider text-alert">RESULT</div>
              <div className={`border-l-2 pl-3 ${failure ? 'border-alert' : 'border-amber'}`}>
                <div className={`display text-sm font-bold ${TONE_TEXT[tone]}`}>{timeline.outcome?.headline}</div>
              </div>
            </li>
          </ol>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Underlying engineering weakness" tone="warn">
            {autopsy.weaknesses.length > 0 ? (
              <ul className="space-y-2 text-xs text-ink/85">
                {autopsy.weaknesses.map((w) => <li key={w} className="border-l-2 border-amber pl-2">{w}</li>)}
              </ul>
            ) : (
              <p className="text-xs text-ink/75">No design weakness contributed. The spacecraft was sound; what happened followed from decisions made in flight.</p>
            )}
          </Panel>

          <Panel title="Decisions that contributed" tone="warn">
            {autopsy.decisions.length > 0 ? (
              <ul className="space-y-3">
                {autopsy.decisions.map((d) => (
                  <li key={d.challengeIndex} className="text-xs">
                    <div className="label">Challenge {d.challengeIndex + 1} — {d.challengeTitle}</div>
                    <div className="text-amber">You chose: {d.chosen}</div>
                    <div className="text-ink/70">Result: {d.result}</div>
                    <button
                      onClick={() => { sound.timeMachine(); dispatch({ type: 'REWIND', timelineId: timeline.id, challengeIndex: d.challengeIndex }); }}
                      className="mt-1.5 flex items-center gap-1.5 border border-amber px-2 py-1 uppercase tracking-wider text-amber transition-colors hover:bg-amber hover:text-void"
                    >
                      <RotateCcw size={11} /> Rewind → {d.alternative}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink/75">No in-flight decision contributed. This outcome was set by the design before launch.</p>
            )}
          </Panel>

          <Panel title="Recommended for the next timeline" tone="good">
            <ul className="space-y-2 text-xs text-ink/85">
              {autopsy.recommendations.map((r) => <li key={r} className="flex gap-2"><span className="text-phosphor">▸</span>{r}</li>)}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'outcome' })}>Mission Report</Button>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<Wrench size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'builder' })}>Redesign Spacecraft</Button>
          <Button variant="amber" icon={<History size={14} />} onClick={() => dispatch({ type: 'TIME_MACHINE', open: true })}>Open Time Machine</Button>
        </div>
      </div>
    </div>
  );
}
