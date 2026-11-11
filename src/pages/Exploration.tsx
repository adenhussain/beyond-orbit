import { useState } from 'react';
import { Shield, Wind } from 'lucide-react';
import { PhaserGame } from '../components/Game/PhaserGame';
import { HudBar } from '../components/HUD/HudBar';
import { PauseMenu } from '../components/HUD/PauseMenu';
import { InventoryHud } from '../components/Inventory/InventoryHud';
import type { SuitHud } from '../game/bridge';
import { useGame } from '../state/useGame';

/**
 * Exploration phase. The world itself is the Phaser scene; this component
 * only lays a small HUD over it.
 */
export function Exploration() {
  const { state, mission } = useGame();
  const [hud, setHud] = useState<SuitHud>({ suit: 100, oxygen: 100, zone: '' });
  if (!mission) return null;

  const total = Object.values(state.inventory).reduce((a, b) => a + b, 0);

  return (
    <div className="relative h-full overflow-hidden">
      <PhaserGame scene="exploration" inputLocked={state.paused} onHud={setHud} />

      {/* Suit status */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 space-y-2 border border-line bg-navy/80 p-2.5">
        <HudBar icon={<Shield size={14} />} label="Suit integrity" value={`${Math.round(hud.suit)}%`} pct={hud.suit} />
        <HudBar icon={<Wind size={14} />} label="Oxygen" value={`${Math.round(hud.oxygen)}%`} pct={hud.oxygen} warnBelow={30} />
      </div>

      {/* Objective */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 hidden max-w-md -translate-x-1/2 border border-line bg-navy/80 px-4 py-2 text-center xl:block">
        <div className="label text-cyan">{mission.codename} · {hud.zone}</div>
        <div className="text-sm text-ink">
          {total === 0
            ? 'Explore the base and collect spacecraft supplies'
            : 'Collect what your design needs, then enter the workshop at the far east end'}
        </div>
      </div>

      {/* Inventory */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 w-72 border border-line bg-navy/80 p-2">
        <div className="label mb-1 flex justify-between"><span>Inventory</span><span className="text-phosphor">{total} item{total === 1 ? '' : 's'}</span></div>
        <InventoryHud inventory={state.inventory} />
      </div>

      {hud.oxygen < 25 && (
        <div className="blink pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2 border border-alert bg-alert/15 px-4 py-1.5 text-sm text-alert">
          OXYGEN CRITICAL — FIND AN O2 STATION
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 text-[11px] tracking-wider text-mute">
        {/* On narrow windows the objective moves down here so it never covers the astronaut. */}
        <div className="text-cyan xl:hidden">OBJECTIVE: COLLECT SUPPLIES → WORKSHOP AT THE FAR EAST END</div>
        A/D MOVE · SPACE JUMP · SHIFT SPRINT · E INTERACT · ESC PAUSE
      </div>

      <PauseMenu />
    </div>
  );
}
