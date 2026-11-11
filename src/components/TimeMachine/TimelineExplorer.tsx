import { GitBranch, History, RotateCcw, X } from 'lucide-react';
import { challengesForMission } from '../../data/challenges';
import { DEBT_LABEL } from '../../engine/resourceCalculator';
import { DEBT_TYPES } from '../../engine/technicalDebt';
import { scoreMission } from '../../engine/missionScore';
import { rewindPoints } from '../../engine/timelineManager';
import { sound } from '../../services/sound';
import { useGame } from '../../state/useGame';
import type { Timeline } from '../../types/timeline';
import { Button } from '../UI/Button';
import { TONE_TEXT } from '../UI/Panel';
import { TimelineTree } from './TimelineTree';
import type { Tone } from '../UI/Panel';

const RESULT_TONE: Record<string, Tone> = { success: 'good', partial: 'warn', failure: 'crit' };
const RESULT_LABEL: Record<string, string> = { success: 'COMPLETE SUCCESS', partial: 'PARTIAL SUCCESS', failure: 'MISSION FAILURE' };

function statusOf(t: Timeline): { text: string; tone: Tone } {
  if (t.outcome) return { text: RESULT_LABEL[t.outcome.result], tone: RESULT_TONE[t.outcome.result] };
  return { text: `IN FLIGHT — CHALLENGE ${Math.min(3, t.challengeIndex + 1)}`, tone: 'info' };
}

/**
 * TIME MACHINE / TIMELINE EXPLORER.
 * Shows every timeline as a row of decision points, lets the player rewind
 * to any past decision (creating a new timeline), and compares the results.
 */
export function TimelineExplorer() {
  const { state, dispatch, mission, stats } = useGame();
  if (!mission) return null;
  const challenges = challengesForMission(mission.id);
  const timelines = state.timelines;

  const rows: { label: string; value: (t: Timeline) => string; tone?: (t: Timeline) => Tone }[] = [
    ...challenges.map((c, i) => ({
      label: `C${i + 1}: ${c.title}`,
      value: (t: Timeline) => t.decisions.find((d) => d.challengeIndex === i)?.optionLabel ?? '—',
      tone: (t: Timeline): Tone => {
        const d = t.decisions.find((r) => r.challengeIndex === i);
        return !d ? 'mute' : d.verdict === 'good' ? 'good' : d.verdict === 'bad' ? 'crit' : 'warn';
      },
    })),
    { label: 'Mission status', value: (t) => statusOf(t).text, tone: (t) => statusOf(t).tone },
    { label: 'Science objective', value: (t) => (t.outcome ? `${Math.floor(t.outcome.sciencePct)}%` : 'pending') },
    { label: 'Data returned', value: (t) => (t.outcome ? `${t.outcome.dataReturnedGB.toFixed(1)} GB` : 'pending') },
    { label: 'Mission score', value: (t) => (stats ? `${scoreMission(t, stats.cost, stats.budget)?.total ?? 'pending'}` : '—') },
    { label: 'Oxygen', value: (t) => `${Math.round(t.state.oxygen)}%` },
    { label: 'Fuel remaining', value: (t) => `${Math.round(t.state.fuel)} kg` },
    { label: 'Battery', value: (t) => `${Math.round((t.state.batteryWh / Math.max(1, t.state.specs.batteryCapacity)) * 100)}%` },
    { label: 'Structural margin', value: (t) => `${Math.round(t.state.hull)}` },
    ...DEBT_TYPES.map((d) => ({ label: `${DEBT_LABEL[d]} debt`, value: (t: Timeline) => `${Math.round(t.state.debt[d])}` })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-void/90 p-4" role="dialog" aria-modal="true" aria-label="Time Machine">
      <div className="panel my-auto w-full max-w-6xl !border-amber/60">
        <header className="flex items-center justify-between border-b border-amber/40 bg-amber/10 px-5 py-2.5">
          <span className="display flex items-center gap-2 text-sm font-bold text-amber"><History size={15} /> Time Machine — Timeline Explorer</span>
          <button onClick={() => dispatch({ type: 'TIME_MACHINE', open: false })} aria-label="Close Time Machine" className="text-mute hover:text-cyan"><X size={16} /></button>
        </header>

        <div className="space-y-6 p-5">
          <p className="max-w-3xl text-sm text-ink/80">
            Each row is one history of this mission. Press <span className="text-amber">REWIND</span> on any past decision to restore the
            spacecraft exactly as it was at that moment and take the other option. A new timeline is created; nothing is overwritten.
          </p>

          {/* ---- Branching diagram ---- */}
          <div className="border border-line bg-void/60 p-3">
            <TimelineTree timelines={timelines} activeId={state.activeTimelineId} />
          </div>

          {/* ---- Timeline rows ---- */}
          <div className="space-y-3">
            {timelines.map((t) => {
              const active = t.id === state.activeTimelineId;
              const status = statusOf(t);
              const points = rewindPoints(t);
              return (
                <section key={t.id} className={`border ${active ? 'border-phosphor bg-panel-hi/60' : 'border-line bg-panel'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="display text-sm font-bold text-ink">TIMELINE {t.name}</span>
                      <span className="label flex items-center gap-1">
                        {t.parentName ? <><GitBranch size={11} /> Branched from {t.parentName} at Challenge {(t.branchedAtChallenge ?? 0) + 1}</> : 'Original timeline'}
                      </span>
                      <span className={`label ${TONE_TEXT[status.tone]}`}>{status.text}</span>
                    </div>
                    {active ? (
                      <span className="label !text-phosphor">■ ACTIVE</span>
                    ) : (
                      <Button variant="ghost" onClick={() => dispatch({ type: 'SET_ACTIVE_TIMELINE', timelineId: t.id })}>
                        {t.outcome ? 'View Report' : 'Resume'}
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-px bg-line md:grid-cols-4">
                    {challenges.map((challenge, index) => {
                      const decision = t.decisions.find((d) => d.challengeIndex === index);
                      const inherited = t.branchedAtChallenge !== null && index < t.branchedAtChallenge;
                      const branchPoint = t.branchedAtChallenge === index;
                      const tone: Tone = !decision ? 'mute' : decision.verdict === 'good' ? 'good' : decision.verdict === 'bad' ? 'crit' : 'warn';
                      const other = decision ? challenge.options.find((o) => o.id !== decision.optionId)! : null;
                      return (
                        <div key={challenge.id} className={`flex flex-col bg-panel p-3 ${inherited ? 'opacity-55' : ''}`}>
                          <div className="label flex items-center justify-between">
                            <span>Challenge {index + 1}</span>
                            {inherited && <span>shared with {t.parentName}</span>}
                            {branchPoint && <span className="!text-amber">⑂ branch point</span>}
                          </div>
                          <div className="mt-1 text-sm text-ink">{challenge.title}</div>
                          {decision ? (
                            <>
                              <div className={`mt-1 text-xs ${TONE_TEXT[tone]}`}>{decision.optionId}: {decision.optionLabel}</div>
                              <div className="text-xs text-mute">→ {decision.resultTitle}</div>
                            </>
                          ) : (
                            <div className="mt-1 text-xs text-mute">
                              {t.outcome ? 'Not reached' : t.challengeIndex === index && t.stage !== 'cruise' ? 'Awaiting decision' : 'Not yet reached'}
                            </div>
                          )}
                          {decision && points.includes(index) && other && (
                            <button
                              onClick={() => { sound.timeMachine(); dispatch({ type: 'REWIND', timelineId: t.id, challengeIndex: index }); }}
                              className="mt-auto flex items-center justify-center gap-1.5 border border-amber px-2 py-1.5 text-[11px] uppercase tracking-wider text-amber transition-colors hover:bg-amber hover:text-void"
                              style={{ marginTop: 10 }}
                              title={`Restore day ${decision.day} and choose "${other.label}"`}
                            >
                              <RotateCcw size={11} /> Rewind → {other.label}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex flex-col justify-center bg-panel p-3">
                      <div className="label">Final outcome</div>
                      {t.outcome ? (
                        <>
                          <div className={`display mt-1 text-sm font-bold ${TONE_TEXT[RESULT_TONE[t.outcome.result]]}`}>{RESULT_LABEL[t.outcome.result]}</div>
                          <div className="text-xs text-mute">Science {Math.floor(t.outcome.sciencePct)}% of objective</div>
                        </>
                      ) : (
                        <div className="mt-1 text-sm text-cyan">Mission in progress</div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          {/* ---- Comparison table ---- */}
          <div>
            <h3 className="label mb-2 text-cyan">Timeline comparison</h3>
            <div className="overflow-auto border border-line">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr className="bg-panel-hi">
                    <th className="border-b border-line px-3 py-2 text-left font-normal text-mute">METRIC</th>
                    {timelines.map((t) => (
                      <th key={t.id} className={`border-b border-l border-line px-3 py-2 text-left font-normal ${t.id === state.activeTimelineId ? 'text-phosphor' : 'text-ink'}`}>
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const values = timelines.map((t) => row.value(t));
                    const differs = new Set(values).size > 1;
                    return (
                      <tr key={row.label} className="odd:bg-panel even:bg-navy">
                        <td className="px-3 py-1.5 text-mute">{row.label}</td>
                        {timelines.map((t, i) => (
                          <td key={t.id} className={`border-l border-line px-3 py-1.5 tabular-nums ${row.tone ? TONE_TEXT[row.tone(t)] : differs ? 'text-cyan' : 'text-ink/80'}`}>
                            {values[i]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {timelines.length === 1 && (
              <p className="mt-2 text-xs text-mute">Only one timeline exists. Rewind a decision above to create an alternative and compare.</p>
            )}
            {timelines.length > 1 && <p className="mt-2 text-xs text-mute">Values in blue differ between timelines.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
