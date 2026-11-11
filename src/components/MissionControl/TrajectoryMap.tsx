import type { Mission } from '../../types/mission';
import type { Timeline } from '../../types/timeline';

interface Props {
  mission: Mission;
  timeline: Timeline;
  /** Animated mission progress, 0..100. */
  progress: number;
}

// Quadratic curve from Earth (left) to the destination (right).
const P0 = { x: 70, y: 150 };
const P1 = { x: 400, y: -30 };
const P2 = { x: 730, y: 150 };

function pointAt(t: number) {
  const u = 1 - t;
  return {
    x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
    y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y,
  };
}

/** Mission progress shown as a trajectory with the three decision points. */
export function TrajectoryMap({ mission, timeline, progress }: Props) {
  const ship = pointAt(progress / 100);
  const ahead = pointAt(Math.min(1, progress / 100 + 0.01));
  const angle = (Math.atan2(ahead.y - ship.y, ahead.x - ship.x) * 180) / Math.PI;
  const path = `M${P0.x} ${P0.y} Q${P1.x} ${P1.y} ${P2.x} ${P2.y}`;
  const mars = mission.id === 'mars';

  return (
    <svg viewBox="0 0 800 210" className="w-full" role="img" aria-label={`Mission progress ${Math.round(progress)}%`}>
      {/* Earth */}
      <circle cx={P0.x} cy={P0.y} r="22" fill="#12324a" stroke="#74d4ff" />
      <path d="M58 142 q8 -8 16 0 t10 6" fill="none" stroke="#5dfc9a" opacity="0.6" />
      <text x={P0.x} y="196" textAnchor="middle" fill="#6f879d" fontSize="11" letterSpacing="2">EARTH</text>
      {/* Destination */}
      <circle cx={P2.x} cy={P2.y} r="22" fill={mars ? '#5b2a1a' : '#3a424b'} stroke={mars ? '#e07a4f' : '#b4c0cc'} />
      <text x={P2.x} y="196" textAnchor="middle" fill="#6f879d" fontSize="11" letterSpacing="2">{mars ? 'MARS' : 'MOON'}</text>

      {/* planned path, then flown path on top */}
      <path d={path} fill="none" stroke="#2c5273" strokeWidth="1.5" strokeDasharray="5 7" className="dash-flow" />
      <path d={path} fill="none" stroke="#5dfc9a" strokeWidth="2" pathLength={100} strokeDasharray={`${progress} 100`} />

      {/* decision points */}
      {mission.segmentProgress.slice(0, 3).map((pct, index) => {
        const p = pointAt(pct / 100);
        const decision = timeline.decisions.find((d) => d.challengeIndex === index);
        const current = timeline.challengeIndex === index && timeline.stage !== 'cruise';
        const color = decision ? '#5dfc9a' : current ? '#ffb547' : '#2c5273';
        return (
          <g key={pct} className={current && !decision ? 'blink' : undefined}>
            <rect x={p.x - 7} y={p.y - 7} width="14" height="14" transform={`rotate(45 ${p.x} ${p.y})`} fill="#03060c" stroke={color} strokeWidth="1.5" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fill={color} fontSize="10">{decision ? decision.optionId : index + 1}</text>
            <text x={p.x} y={p.y + 26} textAnchor="middle" fill="#6f879d" fontSize="9" letterSpacing="1">
              {mission.phases[index].name.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* spacecraft */}
      <g transform={`translate(${ship.x} ${ship.y}) rotate(${angle})`}>
        <circle r="11" fill="none" stroke="#5dfc9a" opacity="0.35" />
        <path d="M9 0 L-6 -5 L-3 0 L-6 5 Z" fill="#5dfc9a" />
      </g>
    </svg>
  );
}
