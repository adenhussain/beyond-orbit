import type { Timeline } from '../../types/timeline';

const COLORS = { good: '#5dfc9a', mixed: '#ffb547', bad: '#ff4f4f' } as const;
const RESULT = { success: '#5dfc9a', partial: '#ffb547', failure: '#ff4f4f' } as const;

const COL = [150, 330, 510, 690]; // x of challenge 1..3 and the outcome
const ROW = 46;

/**
 * Branching diagram: every timeline is a line, and a curve shows where it
 * split from its parent. Faded nodes are decisions shared with the parent.
 */
export function TimelineTree({ timelines, activeId }: { timelines: Timeline[]; activeId: string | null }) {
  const rowOf = new Map(timelines.map((t, i) => [t.id, i]));
  const height = timelines.length * ROW + 34;

  return (
    <svg viewBox={`0 0 780 ${height}`} className="w-full" role="img" aria-label="Timeline branching diagram">
      {['CHALLENGE 1', 'CHALLENGE 2', 'CHALLENGE 3', 'OUTCOME'].map((label, i) => (
        <text key={label} x={COL[i]} y="12" textAnchor="middle" fill="#6f879d" fontSize="10" letterSpacing="1.5">{label}</text>
      ))}
      {timelines.map((t, row) => {
        const y = 40 + row * ROW;
        const start = t.branchedAtChallenge ?? 0;
        const parentRow = t.parentId ? rowOf.get(t.parentId) ?? 0 : 0;
        const parentY = 40 + parentRow * ROW;
        const active = t.id === activeId;
        const reached = t.outcome ? 3 : Math.max(start, t.decisions.length);
        return (
          <g key={t.id}>
            <text x="10" y={y + 4} fill={active ? '#5dfc9a' : '#cfdcea'} fontSize="12" letterSpacing="1.5">{t.name}{active ? ' ◄' : ''}</text>
            {/* the branch curve from the parent's decision point */}
            {t.parentId && (
              <path
                d={`M${COL[start] - 60} ${parentY} C ${COL[start] - 20} ${parentY}, ${COL[start] - 50} ${y}, ${COL[start]} ${y}`}
                fill="none" stroke="#ffb547" strokeWidth="1.5" strokeDasharray="4 3"
              />
            )}
            <line x1={t.parentId ? COL[start] : 90} x2={COL[Math.min(3, reached)]} y1={y} y2={y} stroke={active ? '#5dfc9a' : '#2c5273'} strokeWidth="2" />
            {[0, 1, 2].map((i) => {
              if (i < start) return null;
              const d = t.decisions.find((r) => r.challengeIndex === i);
              return (
                <g key={i}>
                  <rect x={COL[i] - 9} y={y - 9} width="18" height="18" transform={`rotate(45 ${COL[i]} ${y})`}
                    fill="#03060c" stroke={d ? COLORS[d.verdict] : '#2c5273'} strokeWidth="1.5" />
                  <text x={COL[i]} y={y + 4} textAnchor="middle" fill={d ? COLORS[d.verdict] : '#2c5273'} fontSize="11">{d ? d.optionId : '?'}</text>
                </g>
              );
            })}
            {t.outcome ? (
              <text x={COL[3]} y={y + 4} textAnchor="middle" fill={RESULT[t.outcome.result]} fontSize="11" letterSpacing="1">
                {t.outcome.result.toUpperCase()} · {Math.floor(t.outcome.sciencePct)}%
              </text>
            ) : (
              <text x={COL[3]} y={y + 4} textAnchor="middle" fill="#74d4ff" fontSize="11" letterSpacing="1">IN FLIGHT</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
