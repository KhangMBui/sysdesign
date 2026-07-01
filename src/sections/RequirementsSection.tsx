import { useEffect, useRef, useState } from 'react';
import type { Problem } from '../db/types';
import {
  addRequirement,
  deleteRequirement,
  reorderRequirements,
  updateRequirement,
  type ReqField,
} from '../db/repository';
import { useDragReorder } from '../lib/useDragReorder';

interface Props {
  problem: Problem;
  field: ReqField;
  heading: string;
  helper: string;
  placeholder: string;
}

export default function RequirementsSection({
  problem,
  field,
  heading,
  helper,
  placeholder,
}: Props) {
  const items = problem[field];
  const [focusId, setFocusId] = useState<string | null>(null);

  const dnd = useDragReorder(
    items.map((i) => i.id),
    (ids) => reorderRequirements(problem.id, field, ids),
  );

  async function handleAdd() {
    const id = await addRequirement(problem.id, field);
    setFocusId(id);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">{heading}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{helper}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Nothing here yet. Add your first requirement below.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((req, index) => (
            <RequirementRow
              key={req.id}
              index={index}
              text={req.text}
              placeholder={placeholder}
              autoFocus={focusId === req.id}
              isDragging={dnd.dragId === req.id}
              isOver={dnd.overId === req.id && dnd.dragId !== req.id}
              handleProps={dnd.handleProps(req.id)}
              rowProps={dnd.rowProps(req.id)}
              onSave={(t) => updateRequirement(problem.id, field, req.id, t)}
              onRemove={() => deleteRequirement(problem.id, field, req.id)}
            />
          ))}
        </ul>
      )}

      <button
        onClick={handleAdd}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-indigo-300 text-base leading-none">
          +
        </span>
        Add another
      </button>
    </div>
  );
}

interface RowProps {
  index: number;
  text: string;
  placeholder: string;
  autoFocus: boolean;
  isDragging: boolean;
  isOver: boolean;
  handleProps: React.HTMLAttributes<HTMLElement> & { draggable: boolean };
  rowProps: React.HTMLAttributes<HTMLLIElement>;
  onSave: (text: string) => void;
  onRemove: () => void;
}

function RequirementRow({
  index,
  text,
  placeholder,
  autoFocus,
  isDragging,
  isOver,
  handleProps,
  rowProps,
  onSave,
  onRemove,
}: RowProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <li
      {...rowProps}
      className={`flex items-start gap-1 rounded-lg border bg-white p-2 transition ${
        isDragging ? 'opacity-40' : ''
      } ${isOver ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}
    >
      <span
        {...handleProps}
        title="Drag to reorder"
        className="mt-2 cursor-grab touch-none rounded p-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </span>

      <span className="mt-2.5 w-5 shrink-0 text-right text-xs tabular-nums text-slate-400">
        {index + 1}.
      </span>

      <textarea
        ref={ref}
        rows={2}
        defaultValue={text}
        placeholder={placeholder}
        onBlur={(e) => onSave(e.target.value)}
        className="min-h-[2.5rem] flex-1 resize-y rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />

      <button
        onClick={onRemove}
        className="mt-1.5 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        Remove
      </button>
    </li>
  );
}
