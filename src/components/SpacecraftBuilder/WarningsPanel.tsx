import { CircleAlert, OctagonAlert } from 'lucide-react';
import type { BuildIssue } from '../../types/spacecraft';

/** Engineering warnings produced by validateBuild(). */
export function WarningsPanel({ issues }: { issues: BuildIssue[] }) {
  const blocks = issues.filter((i) => i.level === 'block');
  const warnings = issues.filter((i) => i.level === 'warn');

  if (issues.length === 0) {
    return <p className="text-sm text-phosphor">■ All engineering checks passed with full margin.</p>;
  }
  return (
    <ul className="space-y-2">
      {blocks.map((issue) => (
        <li key={issue.title + issue.detail} className="border-l-2 border-alert bg-alert/5 py-1.5 pl-2.5 pr-1">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-alert">
            <OctagonAlert size={12} /> No-go: {issue.title}
          </div>
          <p className="mt-0.5 text-xs text-ink/75">{issue.detail}</p>
        </li>
      ))}
      {warnings.map((issue) => (
        <li key={issue.title + issue.detail} className="border-l-2 border-amber bg-amber/5 py-1.5 pl-2.5 pr-1">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber">
            <CircleAlert size={12} /> {issue.title}
          </div>
          <p className="mt-0.5 text-xs text-ink/75">{issue.detail}</p>
        </li>
      ))}
    </ul>
  );
}
