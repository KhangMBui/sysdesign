import { useEffect, useState } from 'react';
import type { DeepDive, Problem } from '../db/types';
import {
  createDeepDive,
  deleteDeepDive,
  reorderDeepDives,
  updateDeepDive,
} from '../db/repository';
import { useDeepDives } from '../hooks/useDeepDives';
import { useDragReorder } from '../lib/useDragReorder';
import { Field, inputClass } from '../components/ui';

interface Props {
  problem: Problem;
}

export default function DeepDivesSection({ problem }: Props) {
  const dives = useDeepDives(problem.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNewId, setFocusNewId] = useState<string | null>(null);

  // Derive selected dive: honor selectedId if valid, else first.
  const selectedDive =
    dives?.find((d) => d.id === selectedId) ?? dives?.[0] ?? null;

  // Auto-select first item when data loads or selection becomes stale.
  useEffect(() => {
    if (!dives?.length) return;
    if (!selectedId || !dives.find((d) => d.id === selectedId)) {
      setSelectedId(dives[0].id);
    }
  }, [dives, selectedId]);

  const dnd = useDragReorder(
    dives?.map((d) => d.id) ?? [],
    (orderedIds) => reorderDeepDives(problem.id, orderedIds),
  );

  async function handleAdd() {
    const id = await createDeepDive(problem.id);
    setSelectedId(id);
    setFocusNewId(id);
  }

  async function handleDelete(id: string) {
    if (!dives) return;
    if (dives.length <= 1) {
      await deleteDeepDive(id);
      setSelectedId(null);
      return;
    }
    const idx = dives.findIndex((d) => d.id === id);
    const nextId = dives[idx + 1]?.id ?? dives[idx - 1]?.id;
    await deleteDeepDive(id);
    if (id === selectedId) setSelectedId(nextId ?? null);
  }

  if (dives === undefined) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Deep Dives</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Explore tricky design decisions in depth. Each question has a prompt,
          your response, and optional notes.
        </p>
      </div>

      {dives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No deep dives yet.</p>
          <button
            onClick={handleAdd}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-indigo-300 text-base leading-none">
              +
            </span>
            Add first question
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-5">
          {/* Left: question list */}
          <div className="w-56 shrink-0">
            <ul className="space-y-1">
              {dives.map((dive, idx) => {
                const isSelected = selectedDive?.id === dive.id;
                const isOver = dnd.overId === dive.id && dnd.dragId !== dive.id;
                return (
                  <li
                    key={dive.id}
                    {...dnd.rowProps(dive.id)}
                    onClick={() => setSelectedId(dive.id)}
                    className={`group flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-2 transition ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    } ${isOver ? 'border-indigo-400 ring-2 ring-indigo-100' : ''} ${
                      dnd.dragId === dive.id ? 'opacity-40' : ''
                    }`}
                  >
                    <span
                      {...dnd.handleProps(dive.id)}
                      title="Drag to reorder"
                      className="cursor-grab touch-none rounded p-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="8" cy="5" r="2" />
                        <circle cx="16" cy="5" r="2" />
                        <circle cx="8" cy="12" r="2" />
                        <circle cx="16" cy="12" r="2" />
                        <circle cx="8" cy="19" r="2" />
                        <circle cx="16" cy="19" r="2" />
                      </svg>
                    </span>

                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        isSelected ? 'font-medium text-indigo-800' : 'text-slate-700'
                      }`}
                    >
                      {dive.title || `Question ${idx + 1}`}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(dive.id);
                      }}
                      title="Delete"
                      className="hidden shrink-0 rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={handleAdd}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full border border-indigo-300 text-base leading-none">
                +
              </span>
              Add another
            </button>
          </div>

          {/* Right: editor for selected dive */}
          {selectedDive && (
            <DeepDiveEditor
              key={selectedDive.id}
              dive={selectedDive}
              autoFocusTitle={focusNewId === selectedDive.id}
              onUpdate={(changes) => updateDeepDive(selectedDive.id, changes)}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface EditorProps {
  dive: DeepDive;
  autoFocusTitle: boolean;
  onUpdate: (changes: Partial<DeepDive>) => void;
}

function DeepDiveEditor({ dive, autoFocusTitle, onUpdate }: EditorProps) {
  return (
    <div className="min-w-0 flex-1 space-y-5">
      <Field label="Question title">
        <input
          type="text"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocusTitle}
          defaultValue={dive.title}
          placeholder="e.g. How would you handle hot partition issues?"
          onBlur={(e) => onUpdate({ title: e.target.value })}
          className={inputClass}
        />
      </Field>

      <Field label="Question prompt">
        <textarea
          rows={3}
          defaultValue={dive.prompt}
          placeholder="Additional context, constraints, or scenario for this question…"
          onBlur={(e) => onUpdate({ prompt: e.target.value })}
          className={`${inputClass} resize-y`}
        />
      </Field>

      <Field label="My response">
        <textarea
          rows={12}
          defaultValue={dive.response}
          placeholder="Write your detailed answer here. Cover the tradeoffs, scale considerations, and your reasoning."
          onBlur={(e) => onUpdate({ response: e.target.value })}
          className={`${inputClass} min-h-[14rem] resize-y`}
        />
      </Field>

      <Field label="Notes (optional)">
        <textarea
          rows={3}
          defaultValue={dive.notes}
          placeholder="Key takeaways, references, or follow-up points…"
          onBlur={(e) => onUpdate({ notes: e.target.value })}
          className={`${inputClass} resize-y`}
        />
      </Field>

      <p className="text-xs text-slate-400">Changes save automatically when you click away.</p>
    </div>
  );
}
