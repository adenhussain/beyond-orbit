import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Target } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Panel } from '../components/UI/Panel';
import { MISSIONS } from '../data/missions';
import { sound } from '../services/sound';
import { useGame } from '../state/useGame';
import type { Mission } from '../types/mission';

function DestinationGlyph({ mission }: { mission: Mission }) {
  const mars = mission.id === 'mars';
  const body = mars ? '#c9623b' : '#9aa7b4';
  const shade = mars ? '#7d3620' : '#55606b';
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="none" stroke="#1b3147" strokeDasharray="2 5" />
      <circle cx="60" cy="60" r="38" fill={body} />
      <circle cx="46" cy="48" r="7" fill={shade} opacity="0.7" />
      <circle cx="70" cy="70" r="10" fill={shade} opacity="0.55" />
      <circle cx="72" cy="42" r="4" fill={shade} opacity="0.6" />
      <path d="M60 22 A38 38 0 0 1 60 98 A22 38 0 0 0 60 22" fill="#03060c" opacity="0.55" />
      {/* landing site marker */}
      <g className="blink">
        <circle cx={mars ? 50 : 58} cy={mars ? 52 : 93} r="3" fill="none" stroke="#5dfc9a" strokeWidth="1.5" />
        <line x1={mars ? 50 : 58} y1={mars ? 44 : 85} x2={mars ? 50 : 58} y2={mars ? 49 : 90} stroke="#5dfc9a" />
      </g>
    </svg>
  );
}

export function MissionSelection() {
  const { state, dispatch } = useGame();
  const [selectedId, setSelectedId] = useState(state.missionId ?? MISSIONS[0].id);
  const selected = MISSIONS.find((m) => m.id === selectedId)!;

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-5 p-5">
      <div>
        <p className="label text-cyan">PHASE 1 — MISSION COMMAND</p>
        <h1 className="display mt-1 text-2xl font-bold text-ink">Select Your Mission</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {MISSIONS.map((mission) => {
          const active = mission.id === selectedId;
          return (
            <button
              key={mission.id}
              onClick={() => {
                sound.select();
                setSelectedId(mission.id);
              }}
              aria-pressed={active}
              className={`panel p-5 text-left transition-colors ${
                active ? '!border-phosphor bg-panel-hi' : 'hover:!border-line-hi'
              }`}
            >
              <div className="flex gap-5">
                <DestinationGlyph mission={mission} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="label text-cyan">{mission.codename}</span>
                    <span className={`label ${mission.difficulty === 'EXTREME' ? 'text-alert' : 'text-amber'}`}>
                      {mission.difficulty}
                    </span>
                  </div>
                  <h2 className="display mt-1 text-lg font-bold text-ink">{mission.name}</h2>
                  <p className="mt-2 text-sm text-ink/75">{mission.objective}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
                    <span className="flex items-center gap-1"><MapPin size={12} />{mission.destination}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{mission.durationLabel}</span>
                  </div>
                </div>
              </div>
              <div className={`mt-4 border-t border-line pt-2 text-xs ${active ? 'text-phosphor' : 'text-mute'}`}>
                {active ? '■ SELECTED' : '□ CLICK TO SELECT'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Environmental Conditions" tone="warn">
          <ul className="space-y-2 text-sm text-ink/85">
            {selected.environment.map((line) => (
              <li key={line} className="flex gap-2"><span className="text-amber">▸</span>{line}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Required Spacecraft Capabilities" tone="info">
          <ul className="space-y-2 text-sm text-ink/85">
            {selected.requiredCapabilities.map((line) => (
              <li key={line} className="flex gap-2"><span className="text-cyan">▸</span>{line}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Mission Envelope">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><dt className="label">Budget</dt><dd className="text-phosphor">${selected.budget}M</dd></div>
            <div><dt className="label">Launch limit</dt><dd className="text-phosphor">{selected.maxLaunchMass} kg</dd></div>
            <div><dt className="label">Sunlight</dt><dd className="text-phosphor">{Math.round(selected.solarFactor * 100)}% of Earth</dd></div>
            <div><dt className="label">Data rate</dt><dd className="text-phosphor">{Math.round(selected.commFactor * 100)}% of reference</dd></div>
            <div><dt className="label">Thermal rating</dt><dd className="text-phosphor">{selected.thermalDemand} required</dd></div>
            <div><dt className="label">Duration</dt><dd className="text-phosphor">{selected.durationLabel}</dd></div>
          </dl>
          <div className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-xs text-mute">
            <Target size={13} className="mt-0.5 shrink-0" />
            Three in-flight challenges. Each offers two decisions.
          </div>
        </Panel>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'menu' })}>
          Main Menu
        </Button>
        <Button icon={<ChevronRight size={14} />} onClick={() => dispatch({ type: 'SELECT_MISSION', missionId: selectedId })}>
          Open Briefing
        </Button>
      </div>
    </div>
  );
}
