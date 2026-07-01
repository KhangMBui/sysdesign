import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProblem } from '../hooks/useProblems';
import { useDesignPages } from '../hooks/useDesignPages';
import { useDeepDives } from '../hooks/useDeepDives';
import { updateProblem } from '../db/repository';
import { DifficultyBadge, inputClass } from '../components/ui';
import RequirementsSection from '../sections/RequirementsSection';
import ApiDesignSection from '../sections/ApiDesignSection';
import DesignSection from '../sections/DesignSection';
import DeepDivesSection from '../sections/DeepDivesSection';
import type { Problem } from '../db/types';

// The practice workflow is broken into sections, mirroring a real
// system-design interview flow. Only Overview is built in this step;
// the rest arrive in later build steps.
const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'functional', label: 'Functional Reqs' },
  { key: 'nonfunctional', label: 'Non-Functional Reqs' },
  { key: 'api', label: 'API Design' },
  { key: 'design', label: 'High-Level Design' },
  { key: 'deepdives', label: 'Deep Dives' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

export default function ProblemDetailPage() {
  const { problemId, section } = useParams();
  const navigate = useNavigate();
  const problem = useProblem(problemId);
  const designPages = useDesignPages(problemId);
  const deepDives = useDeepDives(problemId);
  const active: SectionKey =
    (SECTIONS.find((s) => s.key === section)?.key as SectionKey) ?? 'overview';

  if (problem === undefined) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading…</p>;
  }
  if (problem === null || !problem) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500">This problem no longer exists.</p>
        <div className="mt-4">
          <Link to="/problems" className="text-sm font-medium text-indigo-600 hover:underline">
            ← Back to all problems
          </Link>
        </div>
      </div>
    );
  }

  const counts: Record<SectionKey, number | null> = {
    overview: null,
    functional: problem.functionalReqs.length,
    nonfunctional: problem.nonFunctionalReqs.length,
    api: problem.apiEndpoints.length,
    design: designPages?.length ?? null,
    deepdives: deepDives?.length ?? null,
  };

  return (
    <div>
      <Link
        to="/problems"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        ← All problems
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{problem.title}</h1>
        <DifficultyBadge difficulty={problem.difficulty} />
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        {SECTIONS.map((s) => {
          const isActive = s.key === active;
          const count = counts[s.key];
          return (
            <button
              key={s.key}
              onClick={() => navigate(`/problems/${problem.id}/${s.key}`)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {s.label}
              {count ? (
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {active === 'overview' ? (
        <OverviewSection problem={problem} />
      ) : active === 'functional' ? (
        <RequirementsSection
          problem={problem}
          field="functionalReqs"
          heading="Functional Requirements"
          helper="What should the system do? One capability per item."
          placeholder="e.g. Users can shorten a long URL into a short link."
        />
      ) : active === 'nonfunctional' ? (
        <RequirementsSection
          problem={problem}
          field="nonFunctionalReqs"
          heading="Non-Functional Requirements"
          helper="System qualities: latency, availability, consistency, scale, durability, security."
          placeholder="e.g. Low latency — redirects resolve in under 100ms."
        />
      ) : active === 'api' ? (
        <ApiDesignSection problem={problem} />
      ) : active === 'design' ? (
        <DesignSection problem={problem} />
      ) : active === 'deepdives' ? (
        <DeepDivesSection problem={problem} />
      ) : (
        <ComingSoon label={SECTIONS.find((s) => s.key === active)!.label} />
      )}
    </div>
  );
}

function OverviewSection({ problem }: { problem: Problem }) {
  // Auto-save on blur keeps things simple and avoids a save button.
  const save = (changes: Partial<Problem>) => updateProblem(problem.id, changes);

  return (
    <div className="max-w-3xl space-y-5">
      <LabeledTextarea
        label="Description"
        rows={3}
        defaultValue={problem.description}
        onSave={(v) => save({ description: v })}
      />
      <LabeledTextarea
        label="Constraints"
        rows={3}
        defaultValue={problem.constraints}
        onSave={(v) => save({ constraints: v })}
      />
      <LabeledTextarea
        label="Notes / extra context"
        rows={4}
        defaultValue={problem.notes}
        onSave={(v) => save({ notes: v })}
      />
      <p className="text-xs text-slate-400">Changes save automatically when you click away.</p>
    </div>
  );
}

function LabeledTextarea({
  label,
  rows,
  defaultValue,
  onSave,
}: {
  label: string;
  rows: number;
  defaultValue: string;
  onSave: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <textarea
        // key on defaultValue so switching problems resets the field
        key={defaultValue}
        rows={rows}
        defaultValue={defaultValue}
        onBlur={(e) => onSave(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-sm text-slate-400">This section is built in the next step.</p>
    </div>
  );
}
