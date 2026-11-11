import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, GitBranch, Lock, Radio, TriangleAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAdvisories, getChallenge, getLockReason, situationEntries } from '../../engine/challengeManager';
import { HISTORY } from '../../data/history';
import { analysisWaitSeconds, lightDelay } from '../../engine/lightTime';
import { DEBT_LABEL } from '../../engine/resourceCalculator';
import { sound } from '../../services/sound';
import { useGame } from '../../state/useGame';
import type { ChallengeOption, Verdict } from '../../types/challenge';
import { Button } from '../UI/Button';
import { TONE_BORDER, TONE_TEXT } from '../UI/Panel';
import type { Tone } from '../UI/Panel';

const VERDICT_TONE: Record<Verdict, Tone> = { good: 'good', mixed: 'warn', bad: 'crit' };
const VERDICT_LABEL: Record<Verdict, string> = { good: 'NOMINAL', mixed: 'TRADE-OFF ACCEPTED', bad: 'OFF-NOMINAL' };

/**
 * The in-flight challenge: shows the situation, two options with live
 * flight-director advice, and afterwards what the decision actually changed.
 */
export function ChallengeDialog() {
  const { mission, timeline, dispatch } = useGame();

  // RADIO DELAY: Mission Control's analysis travels to Earth and back at the
  // speed of light. On Mars that takes many minutes, so the player either
  // waits for Earth or acts on onboard data alone, as real Mars crews would.
  const delay = lightDelay(mission?.id ?? 'lunar');
  const waitTotal = analysisWaitSeconds(delay);
  const pointKey = `${timeline?.id}-${timeline?.challengeIndex}`;
  const [waited, setWaited] = useState({ key: pointKey, seconds: 0 });
  const elapsed = waited.key === pointKey ? waited.seconds : 0;
  useEffect(() => {
    if (waitTotal === 0) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setWaited({ key: pointKey, seconds });
      if (seconds >= waitTotal) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [pointKey, waitTotal]);
  const analysisReady = elapsed >= waitTotal;

  if (!mission || !timeline || (timeline.stage !== 'challenge' && timeline.stage !== 'result')) return null;

  const challenge = getChallenge(mission.id, timeline.challengeIndex);
  const state = timeline.state;
  const record = timeline.stage === 'result' ? timeline.decisions[timeline.decisions.length - 1] : null;

  // "Butterfly" lines: what earlier design and decisions did to this challenge.
  const snapshot = timeline.snapshots.find((s) => s.challengeIndex === challenge.index);
  const situation = situationEntries(snapshot?.state ?? state, challenge);

  const lockFor = (option: ChallengeOption): string | null => {
    const stateLock = getLockReason(state, mission, option);
    if (stateLock) return stateLock;
    const tm = timeline.lockedOption;
    if (tm && tm.challengeIndex === challenge.index && tm.optionId === option.id) {
      return `Already explored in timeline ${timeline.parentName}. Choose the alternative.`;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-void/85 p-4" role="dialog" aria-modal="true" aria-label={challenge.title}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
        className="panel my-auto w-full max-w-5xl !border-alert/70"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-alert/50 bg-alert/10 px-5 py-2.5">
          <span className="flex items-center gap-2 text-sm tracking-wider text-alert">
            <TriangleAlert size={15} className="blink" /> {challenge.alert}
          </span>
          <span className="label">
            CHALLENGE {challenge.index + 1} OF 3 · DAY {state.day} · {state.phase.toUpperCase()}
          </span>
        </header>

        <div className="p-5">
          <h2 className="display text-xl font-bold text-ink">{challenge.title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink/85">{challenge.description}</p>

          {timeline.lockedOption?.challengeIndex === challenge.index && !record && (
            <p className="mt-3 flex items-center gap-2 border border-amber/50 bg-amber/5 px-3 py-2 text-xs text-amber">
              <GitBranch size={13} /> TIME MACHINE: you have returned to this decision point. Spacecraft state restored exactly as it was on day {state.day}.
            </p>
          )}

          {!record && (
            <div className={`mt-4 flex items-start gap-2 border px-3 py-2 text-xs ${analysisReady ? 'border-line text-ink/75' : 'border-cyan/60 bg-cyan/5 text-cyan'}`}>
              <Radio size={13} className={`mt-0.5 shrink-0 ${analysisReady ? '' : 'blink'}`} />
              <span>
                EARTH LINK — signal delay {delay.label} each way ({Math.round(delay.distanceKm / 1e6) > 0 ? `${(delay.distanceKm / 1e6).toFixed(1)} million km` : `${Math.round(delay.distanceKm).toLocaleString()} km`}).{' '}
                {waitTotal === 0
                  ? 'Mission Control analysis is available almost instantly.'
                  : analysisReady
                    ? 'Mission Control analysis received.'
                    : `Mission Control analysis arrives in ${Math.ceil(waitTotal - elapsed)} s (1 game second per real minute of round trip). You may act now on onboard data alone.`}
              </span>
            </div>
          )}

          {situation.length > 0 && (
            <div className="mt-4 border-l-2 border-cyan pl-3">
              <div className="label text-cyan">Consequences of your design and earlier decisions</div>
              <ul className="mt-1 space-y-1.5">
                {situation.map((entry) => (
                  <li key={entry.id} className="text-xs">
                    <span className={entry.severity === 'crit' ? 'text-alert' : entry.severity === 'good' ? 'text-phosphor' : 'text-amber'}>{entry.title}</span>
                    <span className="text-ink/65"> — {entry.text}</span>
                    {entry.changes.length > 0 && <span className="text-cyan/80"> [{entry.changes.join(', ')}]</span>}
                    {(() => {
                      const causes = [
                        ...entry.causedByFlags.flatMap((f) =>
                          state.flagOrigins[f]
                            ? [`"${state.flagOrigins[f].optionLabel}" at Challenge ${state.flagOrigins[f].challengeIndex + 1}`]
                            : f.startsWith('sw_') ? ['real solar activity recorded by NASA before launch'] : [],
                        ),
                        ...entry.causedByDebts.map((d) => `${DEBT_LABEL[d].toLowerCase()} debt from your design`),
                        ...(entry.causedByDesign ?? []),
                      ];
                      return causes.length > 0 && <span className="block text-mute">↳ Cause: {causes.join('; ')}</span>;
                    })()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!record ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {challenge.options.map((option) => {
                const lock = lockFor(option);
                const advisories = getAdvisories(state, mission, option);
                return (
                  <article key={option.id} className={`flex flex-col border p-4 ${lock ? 'border-line opacity-60' : 'border-line-hi bg-panel-hi/40'}`}>
                    <div className="label text-cyan">OPTION {option.id}</div>
                    <h3 className="display mt-1 text-base font-bold text-ink">{option.label}</h3>
                    <p className="mt-1 text-sm text-ink/75">{option.summary}</p>
                    <ul className="mt-3 space-y-0.5 text-xs">
                      {option.pros.map((p) => <li key={p} className="text-phosphor">+ {p}</li>)}
                      {option.cons.map((c) => <li key={c} className="text-amber">− {c}</li>)}
                    </ul>
                    {advisories.length > 0 && (
                      <div className="mt-3 border-t border-line pt-2">
                        <div className="label mb-1">Flight director analysis (Earth)</div>
                        {analysisReady ? (
                          <ul className="space-y-1 text-xs">
                            {advisories.map((a) => (
                              <li key={a.text} className={TONE_TEXT[a.level]}>▸ {a.text}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="blink text-xs text-cyan">▸ Awaiting transmission from Earth…</p>
                        )}
                      </div>
                    )}
                    <div className="mt-auto pt-4">
                      {lock ? (
                        <p className="flex items-start gap-1.5 text-xs text-mute"><Lock size={12} className="mt-0.5 shrink-0" />{lock}</p>
                      ) : (
                        <Button
                          className="w-full" variant="amber"
                          onClick={() => { sound.confirm(); dispatch({ type: 'DECIDE', optionId: option.id }); }}
                        >
                          Execute Option {option.id}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-5 border p-4 ${TONE_BORDER[VERDICT_TONE[record.verdict]]}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="label">DECISION EXECUTED — OPTION {record.optionId}: {record.optionLabel}</span>
                <span className={`label ${TONE_TEXT[VERDICT_TONE[record.verdict]]}`}>{VERDICT_LABEL[record.verdict]}</span>
              </div>
              <h3 className={`display mt-2 text-lg font-bold ${TONE_TEXT[VERDICT_TONE[record.verdict]]}`}>{record.resultTitle}</h3>
              <p className="mt-1 text-sm text-ink/85">{record.narrative}</p>
              {record.changes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {record.changes.map((change) => (
                    <span key={change} className="border border-line bg-void px-2 py-0.5 text-xs text-cyan">{change}</span>
                  ))}
                </div>
              )}
              {HISTORY[challenge.id] && (
                <div className="mt-4 border border-cyan/50 bg-cyan/5 p-3">
                  <div className="label flex items-center gap-1.5 !text-cyan"><BookOpen size={12} /> This really happened · {HISTORY[challenge.id].mission} · {HISTORY[challenge.id].year}</div>
                  <div className="mt-1 text-sm text-ink">{HISTORY[challenge.id].title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-ink/75">{HISTORY[challenge.id].happened}</p>
                  <p className="mt-1.5 text-xs text-phosphor">Lesson: {HISTORY[challenge.id].lesson}</p>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button icon={<ChevronRight size={14} />} onClick={() => dispatch({ type: 'CONTINUE' })}>
                  Continue Mission
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
