import { useMemo, useState } from 'react';
import { ChevronLeft, ClipboardCheck, Trash2 } from 'lucide-react';
import { InventoryHud } from '../components/Inventory/InventoryHud';
import { DebtPanel } from '../components/ResourceDashboard/DebtPanel';
import { ResourceDashboard } from '../components/ResourceDashboard/ResourceDashboard';
import { ComponentCard } from '../components/SpacecraftBuilder/ComponentCard';
import { ConfigReview } from '../components/SpacecraftBuilder/ConfigReview';
import { ShipSchematic } from '../components/SpacecraftBuilder/ShipSchematic';
import { WarningsPanel } from '../components/SpacecraftBuilder/WarningsPanel';
import { Button } from '../components/UI/Button';
import { Panel } from '../components/UI/Panel';
import { BUILD_SECTIONS } from '../data/buildSections';
import { buildMaterials, materialsFor } from '../data/resources';
import { SLOTS, componentsForSlot, emptyBuild } from '../data/spacecraftComponents';
import { toggleAction, toggleComponent } from '../engine/buildEditor';
import { calculateBuildStats, canLaunch } from '../engine/resourceCalculator';
import { calculateBuildDebt } from '../engine/technicalDebt';
import { sound } from '../services/sound';
import { useGame } from '../state/useGame';
import type { ResourceId } from '../types/resources';

/**
 * The spacecraft workshop. The astronaut walked here; everything installed
 * is paid for with the supplies they collected outside.
 */
export function SpacecraftBuilder() {
  const { state, dispatch, mission, stats, issues } = useGame();
  const [sectionId, setSectionId] = useState(BUILD_SECTIONS[0].id);
  const [reviewing, setReviewing] = useState(false);

  const debts = useMemo(
    () => (mission && stats ? calculateBuildDebt(state.build, mission, stats).debts : null),
    [state.build, mission, stats],
  );
  if (!mission || !stats || !debts) return null;

  const build = state.build;
  const inventory = state.inventory;
  const used = buildMaterials(build);
  const ready = canLaunch(issues);
  const blockCount = issues.filter((i) => i.level === 'block').length;
  const section = BUILD_SECTIONS.find((s) => s.id === sectionId)!;

  return (
    <div className="grid min-h-full gap-4 p-4 xl:grid-cols-[290px_minmax(0,1fr)_340px]">
      {/* LEFT: categories, live schematic, inventory */}
      <div className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
        <Panel title="Construction" bodyClassName="p-0">
          <nav>
            {BUILD_SECTIONS.map((s) => {
              const slots = SLOTS.filter((slot) => s.slots.includes(slot.id));
              const missing = slots.some((slot) => slot.required && build[slot.id].length === 0);
              const count = slots.reduce((n, slot) => n + build[slot.id].length, 0);
              return (
                <button
                  key={s.id}
                  onClick={() => { sound.click(); setSectionId(s.id); }}
                  aria-current={s.id === sectionId}
                  className={`flex w-full items-center justify-between gap-2 border-b border-line px-4 py-2 text-left text-sm transition-colors last:border-b-0 ${
                    s.id === sectionId ? 'bg-panel-hi text-phosphor' : 'text-ink/80 hover:bg-panel-hi/50'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`label shrink-0 ${missing ? '!text-alert' : '!text-phosphor'}`}>
                    {missing ? 'REQ' : `${count} FITTED`}
                  </span>
                </button>
              );
            })}
          </nav>
        </Panel>
        <Panel title="Assembly Bay" right="LIVE">
          <ShipSchematic
            build={build}
            active={section.category}
            onSelect={(category) => setSectionId(BUILD_SECTIONS.find((s) => s.category === category)!.id)}
          />
          <p className="mt-1 text-center text-[11px] text-mute">The vehicle takes shape as you install parts</p>
        </Panel>
        <Panel title="Collected Supplies" right="NEEDED / HAVE" tone="info">
          <InventoryHud inventory={inventory} build={build} large />
          <p className="mt-2 text-[11px] leading-tight text-mute">
            Red means the design needs more than you collected. Repair kits are not used here; they come aboard for in-flight repairs.
          </p>
        </Panel>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" icon={<ChevronLeft size={13} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'explore' })}>
            Go Outside
          </Button>
          <Button variant="ghost" icon={<Trash2 size={13} />} onClick={() => dispatch({ type: 'LOAD_BUILD', build: emptyBuild() })}>
            Strip All
          </Button>
        </div>
      </div>

      {/* CENTRE: component selection */}
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <p className="label text-cyan">SPACECRAFT WORKSHOP · {mission.name}</p>
          <h1 className="display mt-1 text-xl font-bold text-ink">{section.label}</h1>
          <p className="mt-1 text-sm text-mute">{section.blurb}</p>
        </div>
        {SLOTS.filter((slot) => section.slots.includes(slot.id)).map((slot) => (
          <Panel
            key={slot.id}
            title={slot.label}
            tone={slot.required && build[slot.id].length === 0 ? 'crit' : 'good'}
            right={`${slot.required ? 'REQUIRED' : 'OPTIONAL'} · ${build[slot.id].length}/${slot.max} · ${slot.hint}`}
          >
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {componentsForSlot(slot.id).map((component) => {
                const action = toggleAction(build, component.id);
                const next = toggleComponent(build, component.id);
                const preview = calculateBuildStats(next, mission);
                // Can the collected supplies cover the design if this part is fitted?
                const after = buildMaterials(next);
                const needs = materialsFor(component);
                const shortOf = action === 'remove' ? [] : (Object.keys(needs) as ResourceId[]).filter((id) => after[id] > inventory[id]);
                return (
                  <ComponentCard
                    key={component.id}
                    component={component}
                    missionId={mission.id}
                    action={action}
                    current={stats}
                    preview={preview}
                    isKey={mission.keyInstruments.includes(component.id)}
                    materials={needs}
                    shortOf={shortOf}
                    onToggle={() => {
                      if (action === 'remove') sound.remove(); else sound.select();
                      dispatch({ type: 'TOGGLE_COMPONENT', componentId: component.id });
                    }}
                  />
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      {/* RIGHT: launch gate, status, debt, warnings */}
      <div className="flex flex-col gap-4 *:shrink-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-5rem)] xl:self-start xl:overflow-auto">
        <Button size="lg" disabled={!ready} icon={<ClipboardCheck size={15} />} onClick={() => setReviewing(true)}>
          {ready ? 'Review & Launch' : `${blockCount} No-Go Item${blockCount === 1 ? '' : 's'}`}
        </Button>
        <Panel title="Spacecraft Status" right="LIVE">
          <ResourceDashboard stats={stats} />
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-3 text-xs">
            <div className="flex justify-between"><dt className="text-mute">Thermal</dt><dd className={stats.thermalRating >= stats.thermalDemand ? 'text-phosphor' : 'text-amber'}>{stats.thermalRating}/{stats.thermalDemand}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Thrust/weight</dt><dd className={stats.twr >= mission.minTwr ? 'text-phosphor' : stats.twr >= 1 ? 'text-amber' : 'text-alert'}>{stats.twr.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Science</dt><dd className={stats.sciencePoints >= stats.scienceTarget ? 'text-phosphor' : 'text-amber'}>{stats.sciencePoints}/{stats.scienceTarget} pts</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Reliability</dt><dd className="text-ink">{(stats.avgReliability * 100).toFixed(1)}%</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Battery</dt><dd className="text-ink">{stats.batteryWh} Wh</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Supplies used</dt><dd className="text-ink">{Object.values(used).reduce((a, b) => a + b, 0)}</dd></div>
          </dl>
        </Panel>
        <Panel title="Technical Debt" tone="warn">
          <DebtPanel debts={debts} />
        </Panel>
        <Panel title="Engineering Warnings" tone={blockCount > 0 ? 'crit' : issues.length > 0 ? 'warn' : 'good'} right={`${issues.length} OPEN`} bodyClassName="max-h-72 overflow-auto p-3">
          <WarningsPanel issues={issues} />
        </Panel>
      </div>

      {reviewing && (
        <ConfigReview
          build={build}
          stats={stats}
          issues={issues}
          onClose={() => setReviewing(false)}
          onLaunch={() => dispatch({ type: 'LAUNCH' })}
        />
      )}
    </div>
  );
}
