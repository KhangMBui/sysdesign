import { useEffect, useRef, useState } from 'react';
import type { ApiEndpoint, ApiStatusCode, HttpMethod, Problem } from '../db/types';
import {
  addApiEndpoint,
  addApiStatusCode,
  deleteApiEndpoint,
  deleteApiStatusCode,
  HTTP_METHODS,
  HTTP_STATUS_CODES,
  reorderApiEndpoints,
  updateApiEndpoint,
  updateApiStatusCode,
} from '../db/repository';
import { useDragReorder } from '../lib/useDragReorder';

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  PATCH: 'bg-orange-50 text-orange-700 border-orange-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
};

function statusBadgeClass(code: string): string {
  const n = parseInt(code, 10);
  if (n >= 200 && n < 300) return 'bg-emerald-100 text-emerald-700';
  if (n >= 300 && n < 400) return 'bg-blue-100 text-blue-700';
  if (n >= 400 && n < 500) return 'bg-amber-100 text-amber-700';
  if (n >= 500) return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
}

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
              onAddStatusCode={() => addApiStatusCode(problem.id, ep.id)}
              onUpdateStatusCode={(scId, changes) =>
                updateApiStatusCode(problem.id, ep.id, scId, changes)
              }
              onDeleteStatusCode={(scId) => deleteApiStatusCode(problem.id, ep.id, scId)}
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
  onAddStatusCode: () => void;
  onUpdateStatusCode: (scId: string, changes: Partial<ApiStatusCode>) => void;
  onDeleteStatusCode: (scId: string) => void;
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
  onAddStatusCode,
  onUpdateStatusCode,
  onDeleteStatusCode,
}: CardProps) {
  const pathRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) pathRef.current?.focus();
  }, [autoFocus]);

  const bodyClass =
    'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 font-mono text-sm text-slate-800 placeholder:text-slate-400 placeholder:font-sans hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 resize-y';

  const textClass =
    'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 resize-y';

  const statusCodes = endpoint.statusCodes ?? [];

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
          <JsonTextarea
            rows={3}
            defaultValue={endpoint.requestBody}
            placeholder='{ "userId": "string" }'
            onSave={(v) => onUpdate({ requestBody: v })}
            className={bodyClass}
          />
        </BodyField>

        <BodyField label="Response body">
          <JsonTextarea
            rows={3}
            defaultValue={endpoint.responseBody}
            placeholder='{ "id": "string", "shortUrl": "string" }'
            onSave={(v) => onUpdate({ responseBody: v })}
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

        {/* Status codes */}
        <div>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Response status codes
          </span>
          {statusCodes.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {statusCodes.map((sc) => (
                <StatusCodeRow
                  key={sc.id}
                  statusCode={sc}
                  onChangeCode={(code) => onUpdateStatusCode(sc.id, { code })}
                  onChangeBody={(responseBody) => onUpdateStatusCode(sc.id, { responseBody })}
                  onRemove={() => onDeleteStatusCode(sc.id)}
                />
              ))}
            </ul>
          )}
          <button
            onClick={onAddStatusCode}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full border border-indigo-300 text-sm leading-none">
              +
            </span>
            Add response
          </button>
        </div>
      </div>
    </li>
  );
}

interface StatusCodeRowProps {
  statusCode: ApiStatusCode;
  onChangeCode: (code: string) => void;
  onChangeBody: (responseBody: string) => void;
  onRemove: () => void;
}

function StatusCodeRow({ statusCode, onChangeCode, onChangeBody, onRemove }: StatusCodeRowProps) {
  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50/60">
      {/* Code selector row */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${statusBadgeClass(statusCode.code)}`}
        >
          {statusCode.code}
        </span>
        <select
          value={statusCode.code}
          onChange={(e) => onChangeCode(e.target.value)}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
        >
          {HTTP_STATUS_CODES.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          title="Remove"
          className="ml-auto shrink-0 rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
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
      </div>
      {/* Response body */}
      <div className="border-t border-slate-200 px-2 py-1.5">
        <JsonTextarea
          rows={2}
          defaultValue={statusCode.responseBody}
          placeholder='{ "error": "Not found" }'
          onSave={onChangeBody}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 font-mono text-xs text-slate-800 placeholder:font-sans placeholder:text-slate-400 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-100 resize-y"
        />
      </div>
    </li>
  );
}

interface JsonTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  defaultValue: string;
  onSave: (value: string) => void;
}

function JsonTextarea({ defaultValue, onSave, ...rest }: JsonTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleBlur() {
    const raw = ref.current?.value ?? '';
    let out = raw;
    try {
      out = JSON.stringify(JSON.parse(raw.trim()), null, 2);
    } catch {
      // not valid JSON — leave exactly as typed
    }
    if (ref.current && out !== raw) {
      ref.current.value = out;
    }
    onSave(out);
  }

  return <textarea ref={ref} defaultValue={defaultValue} onBlur={handleBlur} {...rest} />;
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
