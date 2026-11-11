import { useEffect, useMemo, useState } from 'react';
import { Banknote, ChevronLeft, Microscope, Radio, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { TONE_BORDER, TONE_TEXT } from '../components/UI/Panel';
import type { Tone } from '../components/UI/Panel';
import { buildReviewFacts, getAdvisorReviews, localReviews } from '../services/aiAdvisor';
import type { AdvisorReview } from '../services/aiAdvisor';
import { useGame } from '../state/useGame';

const ICONS: Record<string, React.JSX.Element> = {
  engineer: <Wrench size={18} />,
  finance: <Banknote size={18} />,
  science: <Microscope size={18} />,
  flight: <Radio size={18} />,
  safety: <ShieldCheck size={18} />,
};

const STANCE_TONE: Record<AdvisorReview['stance'], Tone> = { approve: 'good', concern: 'warn', critical: 'crit' };
const STANCE_LABEL: Record<AdvisorReview['stance'], string> = { approve: 'SATISFIED', concern: 'CONCERNED', critical: 'CRITICAL' };

export function ReviewBoard() {
  const { state: game, dispatch, mission, timeline, stats } = useGame();
  const facts = useMemo(
    () => (mission && stats && timeline?.outcome ? buildReviewFacts(mission, stats, timeline, game.timelines.length) : null),
    [mission, stats, timeline, game.timelines.length],
  );
  // Show the built-in reviews immediately; replace them if a backend answers.
  const [reviews, setReviews] = useState<AdvisorReview[]>(() => (facts ? localReviews(facts) : []));

  useEffect(() => {
    if (!facts) return;
    let cancelled = false;
    setReviews(localReviews(facts));
    void getAdvisorReviews(facts).then((result) => {
      if (!cancelled) setReviews(result);
    });
    return () => { cancelled = true; };
  }, [facts]);

  if (!mission || !timeline?.outcome || !facts) return null;
  const outcome = timeline.outcome;
  const usingAi = reviews.some((r) => r.source === 'ai');

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-4">
      <div>
        <p className="label text-cyan">MISSION REVIEW BOARD · {mission.codename} · TIMELINE {timeline.name}</p>
        <h1 className="display mt-1 text-2xl font-bold text-ink">Five Specialists, One Mission</h1>
        <p className="mt-1 max-w-3xl text-xs text-mute">
          Verified result from the simulation engine: <span className="text-ink">{outcome.headline}</span>. The advisors interpret that
          result from their own discipline; they do not change it. Source: {usingAi ? 'AI advisor service' : 'built-in advisor responses'}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reviews.map((review) => {
          const tone = STANCE_TONE[review.stance];
          return (
            <article key={review.id} className={`panel flex flex-col p-4 ${TONE_BORDER[tone]}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center border ${TONE_BORDER[tone]} ${TONE_TEXT[tone]}`}>{ICONS[review.id]}</div>
                <div className="min-w-0 flex-1">
                  <div className="display text-sm font-bold text-ink">{review.role}</div>
                  <div className="label">{review.focus}</div>
                </div>
                <span className={`label ${TONE_TEXT[tone]}`}>{STANCE_LABEL[review.stance]}</span>
              </div>
              <p className={`mt-3 text-sm ${TONE_TEXT[tone]}`}>“{review.headline}”</p>
              <ul className="mt-2 space-y-1.5 text-xs text-ink/80">
                {review.comments.map((comment) => <li key={comment} className="flex gap-2"><span className="text-mute">▸</span>{comment}</li>)}
              </ul>
            </article>
          );
        })}
      </div>

      <div>
        <Button variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'outcome' })}>Mission Report</Button>
      </div>
    </div>
  );
}
