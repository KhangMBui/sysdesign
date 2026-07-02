import React, { forwardRef, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProblem } from '../hooks/useProblems';
import { useDesignPages } from '../hooks/useDesignPages';
import { useDeepDives } from '../hooks/useDeepDives';
import { useDataModelEntities } from '../hooks/useDataModelEntities';
import { updateProblem } from '../db/repository';
import { Button, DifficultyBadge, inputClass } from '../components/ui';
import RequirementsSection from '../sections/RequirementsSection';
import ApiDesignSection from '../sections/ApiDesignSection';
import DataModelSection from '../sections/DataModelSection';
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
  { key: 'datamodel', label: 'Data Model' },
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
  const dataModelEntities = useDataModelEntities(problemId);
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
    datamodel: dataModelEntities?.length ?? null,
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
      ) : active === 'datamodel' ? (
        <DataModelSection problem={problem} />
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
  const allEmpty = !problem.description && !problem.constraints && !problem.notes;
  const [editing, setEditing] = useState(allEmpty);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const constraintsRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  function save() {
    updateProblem(problem.id, {
      description: descRef.current?.value ?? problem.description,
      constraints: constraintsRef.current?.value ?? problem.constraints,
      notes: notesRef.current?.value ?? problem.notes,
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="max-w-3xl">
        <div className="mb-5 flex justify-end">
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
        </div>
        <div className="space-y-8">
          <OverviewField label="Description" text={problem.description} />
          <OverviewField label="Constraints" text={problem.constraints} />
          <OverviewField label="Notes / Extra Context" text={problem.notes} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <OverviewTextarea label="Description" rows={3} defaultValue={problem.description} ref={descRef} />
      <OverviewTextarea label="Constraints" rows={5} defaultValue={problem.constraints} ref={constraintsRef} />
      <OverviewTextarea label="Notes / Extra Context" rows={4} defaultValue={problem.notes} ref={notesRef} />
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-400">
          Use{' '}
          <code className="rounded bg-slate-100 px-1 font-mono">**bold**</code>
          {' '}to emphasise text. Each line becomes a bullet.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function OverviewField({ label, text }: { label: string; text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div>
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {lines.length === 0 ? (
        <p className="text-sm italic text-slate-400">—</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              <span>{renderBold(line)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const OverviewTextarea = forwardRef<HTMLTextAreaElement, { label: string; rows: number; defaultValue: string }>(
  ({ label, rows, defaultValue }, ref) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <textarea ref={ref} rows={rows} defaultValue={defaultValue} className={`${inputClass} resize-y`} />
    </label>
  ),
);
OverviewTextarea.displayName = 'OverviewTextarea';

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-sm text-slate-400">This section is built in the next step.</p>
    </div>
  );
}
