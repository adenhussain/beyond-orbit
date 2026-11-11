import type { Build, CategoryId } from '../../types/spacecraft';

interface Props {
  build: Build;
  active?: CategoryId;
  onSelect?: (category: CategoryId) => void;
}

const ON = '#5dfc9a';
const OFF = '#2c5273';

/**
 * A line drawing of the lander that changes with the selected components.
 * Empty slots are drawn dashed. Clicking a part opens its category.
 */
export function ShipSchematic({ build, active, onSelect }: Props) {
  const has = (id: string) => Object.values(build).some((ids) => ids.includes(id));
  const filled = (slot: keyof Build) => build[slot].length > 0;
  const stroke = (on: boolean) => ({
    stroke: on ? ON : OFF,
    strokeDasharray: on ? undefined : '4 4',
    fill: on ? 'rgba(93,252,154,0.07)' : 'none',
    strokeWidth: 1.5,
  });
  const group = (category: CategoryId) => ({
    onClick: onSelect ? () => onSelect(category) : undefined,
    style: { cursor: onSelect ? 'pointer' : 'default' },
    opacity: !active || active === category ? 1 : 0.55,
  });

  const busWidth = has('bus_heavy') ? 110 : has('bus_light') ? 80 : 96;
  const busX = 150 - busWidth / 2;
  const wing = has('pw_solar_l') ? 78 : has('pw_solar_s') ? 34 : 0;
  const tankR = has('tank_l') ? 22 : has('tank_m') ? 17 : has('tank_s') ? 12 : 14;
  const nozzle = has('eng_methalox') ? 24 : has('eng_biprop') ? 18 : 11;
  const dish = has('com_hga') ? 24 : has('com_mga') ? 13 : 0;

  return (
    <svg viewBox="0 0 300 250" className="w-full" role="img" aria-label="Spacecraft schematic">
      {/* grid */}
      {[50, 100, 150, 200].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#0f1e30" />)}
      {[50, 100, 150, 200, 250].map((x) => <line key={x} y1="0" y2="250" x1={x} x2={x} stroke="#0f1e30" />)}

      {/* POWER */}
      <g {...group('power')}>
        {has('pw_rtg') ? (
          <>
            <line x1={busX} y1="118" x2={busX - 34} y2="100" stroke={ON} strokeWidth="1.5" />
            <rect x={busX - 54} y="86" width="22" height="30" {...stroke(true)} />
            {[92, 100, 108].map((y) => <line key={y} x1={busX - 58} x2={busX - 28} y1={y} y2={y} stroke={ON} />)}
          </>
        ) : (
          <>
            <rect x={busX - (wing || 40) - 6} y="104" width={wing || 40} height="22" {...stroke(filled('generation'))} />
            <rect x={busX + busWidth + 6} y="104" width={wing || 40} height="22" {...stroke(filled('generation'))} />
            {filled('generation') && [0.33, 0.66].map((f) => (
              <g key={f}>
                <line x1={busX - 6 - wing * f} x2={busX - 6 - wing * f} y1="104" y2="126" stroke={ON} opacity="0.5" />
                <line x1={busX + busWidth + 6 + wing * f} x2={busX + busWidth + 6 + wing * f} y1="104" y2="126" stroke={ON} opacity="0.5" />
              </g>
            ))}
          </>
        )}
        <rect x={busX + 8} y="132" width="20" height="12" {...stroke(filled('storage'))} />
      </g>

      {/* STRUCTURE */}
      <g {...group('structure')}>
        <rect x={busX} y="90" width={busWidth} height="62" {...stroke(filled('bus'))} />
        {filled('thermal') && (
          <rect x={busX - 3} y="87" width={busWidth + 6} height="68" fill="none" stroke="#ffb547"
            strokeWidth={has('th_active') ? 2 : 1} strokeDasharray={has('th_mli') ? '2 3' : undefined} opacity="0.8" />
        )}
        <line x1={busX + 6} y1="152" x2={busX - 22} y2="214" stroke={filled('bus') ? ON : OFF} strokeWidth="1.5" />
        <line x1={busX + busWidth - 6} y1="152" x2={busX + busWidth + 22} y2="214" stroke={filled('bus') ? ON : OFF} strokeWidth="1.5" />
        <line x1={busX - 32} y1="214" x2={busX - 12} y2="214" stroke={filled('bus') ? ON : OFF} strokeWidth="2" />
        <line x1={busX + busWidth + 12} y1="214" x2={busX + busWidth + 32} y2="214" stroke={filled('bus') ? ON : OFF} strokeWidth="2" />
      </g>

      {/* PROPULSION */}
      <g {...group('propulsion')}>
        <circle cx="150" cy="124" r={tankR} {...stroke(filled('tank'))} />
        <path d={`M${150 - nozzle / 2.5} 152 L${150 - nozzle} ${166 + nozzle / 2} L${150 + nozzle} ${166 + nozzle / 2} L${150 + nozzle / 2.5} 152 Z`} {...stroke(filled('engine'))} />
      </g>

      {/* COMMS */}
      <g {...group('comms')}>
        <line x1={busX + busWidth - 16} y1="90" x2={busX + busWidth - 16} y2="64" stroke={filled('antenna') ? ON : OFF} strokeWidth="1.5" strokeDasharray={filled('antenna') ? undefined : '4 4'} />
        {dish > 0 ? (
          <path d={`M${busX + busWidth - 16 - dish} 58 Q${busX + busWidth - 16} ${58 + dish} ${busX + busWidth - 16 + dish} 58`} {...stroke(true)} />
        ) : (
          <circle cx={busX + busWidth - 16} cy="60" r="4" {...stroke(filled('antenna'))} />
        )}
        {filled('backup') && <line x1={busX + busWidth - 34} y1="90" x2={busX + busWidth - 40} y2="70" stroke="#74d4ff" strokeWidth="1.5" />}
      </g>

      {/* SCIENCE */}
      <g {...group('science')}>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={busX + 8 + i * 18} y="76" width="13" height="13" {...stroke(build.instruments.length > i)} />
        ))}
        {has('sci_drill') && <line x1={busX + 16} y1="152" x2={busX + 16} y2="222" stroke={ON} strokeWidth="2" strokeDasharray="3 2" />}
      </g>

      {/* COMPUTER */}
      <g {...group('computer')}>
        <rect x={busX + busWidth - 30} y="132" width="20" height="12" {...stroke(filled('cpu'))} />
        <circle cx={busX + busWidth - 8} cy="98" r="4" {...stroke(filled('nav'))} />
      </g>

      <line x1="20" x2="280" y1="222" y2="222" stroke="#1b3147" strokeDasharray="1 4" />
    </svg>
  );
}
