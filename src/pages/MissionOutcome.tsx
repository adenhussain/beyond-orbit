import { useEffect, useMemo, useState } from 'react';
import { History, Search, Trophy, Users, Wrench } from 'lucide-react';
import { EventLog } from '../components/MissionControl/EventLog';
import { InventoryHud } from '../components/Inventory/InventoryHud';
import { DebtPanel } from '../components/ResourceDashboard/DebtPanel';
import { Button } from '../components/UI/Button';
import { Meter } from '../components/UI/Meter';
import { Panel, TONE_BORDER, TONE_TEXT } from '../components/UI/Panel';
import type { Tone } from '../components/UI/Panel';
import { challengesForMission } from '../data/challenges';
import { CATEGORIES, SLOTS, getComponent } from '../data/spacecraftComponents';
import { analyzeFailure } from '../engine/failureAnalyzer';
import { scoreMission } from '../engine/missionScore';
import { recordScore } from '../state/saveGame';
import { sound } from '../services/sound';
import { useGame } from '../state/useGame';

const RESULT_TONE: Record<string, Tone> = { success: 'good', partial: 'warn', failure: 'crit' };

export function MissionOutcome() {
  const { state: game, dispatch, mission, timeline, stats } = useGame();
  const outcome = timeline?.outcome ?? null;
  const autopsy = useMemo(() => (timeline && mission ? analyzeFailure(timeline, mission) : null), [timeline, mission]);
  const score = useMemo(
    () => (timeline && stats ? scoreMission(timeline, stats.cost, stats.budget) : null),
    [timeline, stats],
  );
  // Best score on this device (the demo does not count).
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  useEffect(() => {
    if (!score || !mission || game.demo) return;
    setPreviousBest(recordScore(mission.id, score.total));
  }, [score, mission, game.demo]);

  useEffect(() => {
    if (!outcome) return;
    if (outcome.result === 'failure') sound.failure(); else sound.success();
  }, [outcome]);

  if (!mission || !timeline || !outcome) return null;
  const tone = RESULT_TONE[outcome.result];
  const challenges = challengesForMission(mission.id);
  const pct = (value: number) => (outcome.scienceTarget > 0 ? (value / outcome.scienceTarget) * 100 : 0);

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-4 p-4">
      {/* Result banner */}
      <section className={`panel p-6 text-center ${TONE_BORDER[tone]}`}>
        <p className="label">PHASE 4 — MISSION REPORT · {mission.codename} · TIMELINE {timeline.name}</p>
        <h1 className={`display mt-2 text-4xl font-black glow sm:text-5xl ${TONE_TEXT[tone]}`}>{outcome.headline}</h1>
        <p className="mx-auto mt-3 max-w-3xl text-ink/85">{outcome.summary}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {autopsy && (
            <Button variant={outcome.result === 'failure' ? 'danger' : 'amber'} icon={<Search size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'autopsy' })}>
              {outcome.result === 'failure' ? 'Failure Autopsy' : 'Damage Analysis'}
            </Button>
          )}
          <Button variant="amber" icon={<History size={14} />} onClick={() => dispatch({ type: 'TIME_MACHINE', open: true })}>
            Time Machine ({game.timelines.length} timeline{game.timelines.length === 1 ? '' : 's'})
          </Button>
          <Button variant="ghost" icon={<Users size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'review' })}>
            Review Board
          </Button>
          <Button variant="ghost" icon={<Wrench size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'builder' })}>
            Redesign Spacecraft
          </Button>
        </div>
      </section>

      {score && (
        <Panel title="Mission Score" tone={tone} right={previousBest !== null && score.total > previousBest ? <span className="blink text-phosphor">NEW BEST</span> : previousBest ? `BEST ${Math.max(previousBest, score.total)}` : ''}>
          <div className="grid items-center gap-4 md:grid-cols-[220px_1fr]">
            <div className="text-center">
              <Trophy size={22} className={`mx-auto ${TONE_TEXT[tone]}`} />
              <div className={`display mt-1 text-4xl font-black tabular-nums ${TONE_TEXT[tone]}`}>{score.total}</div>
              <div className="label">of {score.max} · rank</div>
              <div className="display text-sm font-bold text-ink">{score.rank}</div>
            </div>
            <ul className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
              {score.lines.map((line) => (
                <li key={line.label}>
                  <div className="flex justify-between"><span className="text-ink">{line.label}</span><span className="tabular-nums text-phosphor">{line.points}/{line.max}</span></div>
                  <div className="h-1 bg-void"><div className="h-full bg-phosphor" style={{ width: `${(line.points / line.max) * 100}%` }} /></div>
                  <div className="text-mute">{line.detail}</div>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Mission Objective" tone="info">
          <p className="text-sm text-ink/90">{mission.objective}</p>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Destination</dt><dd className="text-ink">{mission.destination}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Mission ended</dt><dd className="text-ink">Day {timeline.state.day} · {timeline.state.phase}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Challenges completed</dt><dd className="text-ink">{timeline.decisions.length} of 3</dd></div>
          </dl>
        </Panel>

        <Panel title="Scientific Results" tone={tone}>
          <div className="space-y-3">
            <Meter label="Instrument potential" value={`${outcome.sciencePotential} pts`} pct={pct(outcome.sciencePotential) / 1.4} marker={100 / 1.4} tone="info" />
            <Meter label="Collected on site" value={`${outcome.scienceCollected.toFixed(0)} pts`} pct={pct(outcome.scienceCollected) / 1.4} marker={100 / 1.4} tone="info" />
            <Meter
              label="Returned to Earth" value={`${outcome.scienceReturned.toFixed(0)} pts · ${Math.floor(outcome.sciencePct)}%`}
              pct={pct(outcome.scienceReturned) / 1.4} marker={100 / 1.4} tone={tone}
              note={`Objective: ${outcome.scienceTarget} pts (marker). Data: ${outcome.dataReturnedGB.toFixed(1)} of ${outcome.dataGeneratedGB.toFixed(1)} GB returned; link capacity ${outcome.downlinkCapacityGB.toFixed(1)} GB.`}
            />
          </div>
        </Panel>

        <Panel title="Resources Remaining">
          <div className="space-y-3">
            <Meter label="Fuel" value={`${Math.round(outcome.final.fuel)} kg`} pct={outcome.final.fuelPct} tone={outcome.final.fuel <= 0 ? 'crit' : 'good'} />
            <Meter label="Battery" value={`${outcome.final.batteryPct.toFixed(0)}%`} pct={outcome.final.batteryPct} tone={outcome.final.batteryPct < 25 ? 'crit' : outcome.final.batteryPct < 60 ? 'warn' : 'good'} />
            <Meter label="Oxygen" value={`${Math.round(outcome.final.oxygen)}%`} pct={outcome.final.oxygen} tone={outcome.final.oxygen < 25 ? 'crit' : outcome.final.oxygen < 50 ? 'warn' : 'good'} />
            <Meter label="Structural margin" value={`${Math.round(outcome.final.hull)}`} pct={outcome.final.hull} tone={outcome.final.hull < 40 ? 'crit' : outcome.final.hull < 70 ? 'warn' : 'good'} />
            <div className="flex justify-between text-xs"><span className="text-mute">Power at end</span><span className="text-ink">{Math.round(outcome.final.powerGen)} W gen / {Math.round(outcome.final.powerDraw)} W load</span></div>
            <div className="flex justify-between text-xs"><span className="text-mute">Data rate at end</span><span className="text-ink">{Math.round(outcome.final.commKbps)} kbps</span></div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Decisions Made" tone="info" className="lg:col-span-2">
          <ol className="space-y-3">
            {challenges.map((challenge, index) => {
              const d = timeline.decisions.find((r) => r.challengeIndex === index);
              const dTone: Tone = !d ? 'mute' : d.verdict === 'good' ? 'good' : d.verdict === 'bad' ? 'crit' : 'warn';
              return (
                <li key={challenge.id} className="border-l-2 border-line-hi pl-3">
                  <div className="label">Challenge {index + 1}{d ? ` · Day ${d.day}` : ''}</div>
                  <div className="text-sm text-ink">{challenge.title}</div>
                  {d ? (
                    <>
                      <div className={`text-sm ${TONE_TEXT[dTone]}`}>Option {d.optionId}: {d.optionLabel} → {d.resultTitle}</div>
                      <p className="text-xs text-ink/65">{d.narrative}</p>
                      {d.changes.length > 0 && <p className="text-xs text-cyan/80">{d.changes.join(' · ')}</p>}
                    </>
                  ) : (
                    <div className="text-sm text-mute">Not reached — the mission ended first.</div>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel title="Technical Debt at Mission End" tone="warn">
          <DebtPanel debts={outcome.final.debt} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Reasons for This Outcome" tone={tone} className="lg:col-span-2">
          <ul className="space-y-1.5 text-sm">
            {outcome.reasons.map((reason, index) => (
              <li key={index} className={`flex gap-2 ${TONE_TEXT[reason.tone]}`}>
                <span>{reason.tone === 'good' ? '+' : reason.tone === 'warn' ? '!' : '✕'}</span>
                <span className="text-ink/85">{reason.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Supplies Collected & Spacecraft">
          <InventoryHud inventory={game.inventory} />
          <div className="my-3 border-t border-line" />
          <ul className="space-y-1.5 text-xs">
            {CATEGORIES.map((category) => (
              <li key={category.id}>
                <span className="label">{category.short}</span>{' '}
                <span className="text-ink/85">
                  {SLOTS.filter((s) => s.category === category.id).flatMap((s) => game.build[s.id]).map((id) => getComponent(id).name).join(', ') || '—'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Complete Flight Log" right={`${timeline.state.log.length} ENTRIES`} bodyClassName="max-h-72 overflow-auto p-4">
        <EventLog entries={timeline.state.log} />
      </Panel>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => dispatch({ type: 'RESET' })}>New Mission</Button>
      </div>
    </div>
  );
}
