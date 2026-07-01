import { useEffect, useRef, useState } from 'react';
import type { ApiEndpoint, HttpMethod, Problem } from '../db/types';
import {
  addApiEndpoint,
  deleteApiEndpoint,
  HTTP_METHODS,
  reorderApiEndpoints,
  updateApiEndpoint,
} from '../db/repository';
import { useDragReorder } from '../lib/useDragReorder';

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  PATCH: 'bg-orange-50 text-orange-700 border-orange-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
};

interface Props {
  problem: Problem;
}

export default function ApiDesignSection({ problem }: Props) {
  const endpoints = problem.apiEndpoints;
  const [focusId, setFocusId] = useState<string | null>(null);

  const dnd = useDragReorder(
    endpoints.map((e) => e.id),
    (ids) => reorderApiEndpoints(problem.id, ids),
  );

  async function handleAdd() {
    const id = await addApiEndpoint(problem.id);
    setFocusId(id);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">API Design</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Define the HTTP endpoints your system exposes. Auto-saves on blur.
        </p>
      </div>

      {endpoints.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Nothing here yet. Add your first endpoint below.
        </p>
      ) : (
        <ul className="space-y-3">
          {endpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              autoFocus={focusId === ep.id}
              isDragging={dnd.dragId === ep.id}
              isOver={dnd.overId === ep.id && dnd.dragId !== ep.id}
              handleProps={dnd.handleProps(ep.id)}
              rowProps={dnd.rowProps(ep.id)}
              onUpdate={(changes) => updateApiEndpoint(problem.id, ep.id, changes)}
              onRemove={() => deleteApiEndpoint(problem.id, ep.id)}
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

interface CardProps {
  endpoint: ApiEndpoint;
  autoFocus: boolean;
  isDragging: boolean;
  isOver: boolean;
  handleProps: React.HTMLAttributes<HTMLElement> & { draggable: boolean };
  rowProps: React.HTMLAttributes<HTMLLIElement>;
  onUpdate: (changes: Partial<ApiEndpoint>) => void;
  onRemove: () => void;
}

function EndpointCard({
  endpoint,
  autoFocus,
  isDragging,
  isOver,
  handleProps,
  rowProps,
  onUpdate,
  onRemove,
}: CardProps) {
  const pathRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) pathRef.current?.focus();
  }, [autoFocus]);

  const bodyClass =
    'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 font-mono text-sm text-slate-800 placeholder:text-slate-400 placeholder:font-sans hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 resize-y';

  const textClass =
    'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 resize-y';

  return (
    <li
      {...rowProps}
      className={`rounded-xl border bg-white transition ${
        isDragging ? 'opacity-40' : ''
      } ${isOver ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-2 py-2">
        <span
          {...handleProps}
          title="Drag to reorder"
          className="cursor-grab touch-none rounded p-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
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

        <select
          defaultValue={endpoint.method}
          onChange={(e) => onUpdate({ method: e.target.value as HttpMethod })}
          className={`shrink-0 cursor-pointer rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-wide transition ${methodColors[endpoint.method]}`}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <input
          ref={pathRef}
          type="text"
          defaultValue={endpoint.path}
          placeholder="/api/v1/resource"
          onBlur={(e) => onUpdate({ path: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-mono text-sm text-slate-800 placeholder:font-sans placeholder:text-slate-400 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />

        <button
          onClick={onRemove}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          Remove
        </button>
      </div>

      {/* Body fields */}
      <div className="space-y-3 px-3 py-3">
        <BodyField label="Request body">
          <textarea
            rows={3}
            defaultValue={endpoint.requestBody}
            placeholder="{ userId: string }"
            onBlur={(e) => onUpdate({ requestBody: e.target.value })}
            className={bodyClass}
          />
        </BodyField>

        <BodyField label="Response body">
          <textarea
            rows={3}
            defaultValue={endpoint.responseBody}
            placeholder="{ id: string, shortUrl: string }"
            onBlur={(e) => onUpdate({ responseBody: e.target.value })}
            className={bodyClass}
          />
        </BodyField>

        <BodyField label="Authentication & authorization (optional)">
          <textarea
            rows={2}
            defaultValue={endpoint.auth}
            placeholder="e.g. Bearer JWT — requires user:write scope"
            onBlur={(e) => onUpdate({ auth: e.target.value })}
            className={textClass}
          />
        </BodyField>

        <BodyField label="Notes (optional)">
          <textarea
            rows={2}
            defaultValue={endpoint.notes}
            placeholder="Rate limits, idempotency, caching headers, etc."
            onBlur={(e) => onUpdate({ notes: e.target.value })}
            className={textClass}
          />
        </BodyField>
      </div>
    </li>
  );
}

function BodyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
