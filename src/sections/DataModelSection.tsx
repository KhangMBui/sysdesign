import { useEffect, useRef, useState } from 'react';
import type { DataModelEntity, EntityField, Problem } from '../db/types';
import {
  addEntityField,
  createDataModelEntity,
  deleteDataModelEntity,
  deleteEntityField,
  FIELD_TYPES,
  reorderDataModelEntities,
  reorderEntityFields,
  updateDataModelEntity,
  updateEntityField,
} from '../db/repository';
import { useDataModelEntities } from '../hooks/useDataModelEntities';
import { useDragReorder } from '../lib/useDragReorder';
import { inputClass } from '../components/ui';

interface Props {
  problem: Problem;
}

export default function DataModelSection({ problem }: Props) {
  const entities = useDataModelEntities(problem.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNewId, setFocusNewId] = useState<string | null>(null);

  const selectedEntity =
    entities?.find((e) => e.id === selectedId) ?? entities?.[0] ?? null;

  useEffect(() => {
    if (!entities?.length) return;
    if (!selectedId || !entities.find((e) => e.id === selectedId)) {
      setSelectedId(entities[0].id);
    }
  }, [entities, selectedId]);

  const dnd = useDragReorder(
    entities?.map((e) => e.id) ?? [],
    (orderedIds) => reorderDataModelEntities(problem.id, orderedIds),
  );

  async function handleAdd() {
    const id = await createDataModelEntity(problem.id);
    setSelectedId(id);
    setFocusNewId(id);
  }

  async function handleDelete(id: string) {
    if (!entities) return;
    if (entities.length <= 1) {
      await deleteDataModelEntity(id);
      setSelectedId(null);
      return;
    }
    const idx = entities.findIndex((e) => e.id === id);
    const nextId = entities[idx + 1]?.id ?? entities[idx - 1]?.id;
    await deleteDataModelEntity(id);
    if (id === selectedId) setSelectedId(nextId ?? null);
  }

  if (entities === undefined) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Data Model</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Define entities and their fields to sketch out your database schema.
        </p>
      </div>

      {entities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No entities yet.</p>
          <button
            onClick={handleAdd}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-indigo-300 text-base leading-none">
              +
            </span>
            Add first entity
          </button>
        </div>
      ) : (
        <div
          className="flex items-start gap-5"
          style={{ minHeight: 480, height: 'calc(100vh - 320px)' }}
        >
          {/* Left: entity list */}
          <div className="flex h-full w-56 shrink-0 flex-col">
            <ul className="flex-1 space-y-1 overflow-y-auto pr-1">
              {entities.map((entity, idx) => {
                const isSelected = selectedEntity?.id === entity.id;
                const isOver = dnd.overId === entity.id && dnd.dragId !== entity.id;
                return (
                  <li
                    key={entity.id}
                    {...dnd.rowProps(entity.id)}
                    onClick={() => setSelectedId(entity.id)}
                    className={`group flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-2 transition ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    } ${isOver ? 'border-indigo-400 ring-2 ring-indigo-100' : ''} ${
                      dnd.dragId === entity.id ? 'opacity-40' : ''
                    }`}
                  >
                    <span
                      {...dnd.handleProps(entity.id)}
                      title="Drag to reorder"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 cursor-grab touch-none rounded p-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                    >
                      <DragIcon />
                    </span>

                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        isSelected ? 'font-medium text-indigo-800' : 'text-slate-700'
                      }`}
                    >
                      {entity.name || `Entity ${idx + 1}`}
                    </span>

                    {entity.fields.length > 0 && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 text-xs tabular-nums ${
                          isSelected
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {entity.fields.length}
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entity.id);
                      }}
                      title="Delete entity"
                      className="hidden shrink-0 rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block"
                    >
                      <XIcon size={12} />
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
              Add entity
            </button>
          </div>

          {/* Right: entity editor */}
          {selectedEntity && (
            <EntityEditor
              key={selectedEntity.id}
              entity={selectedEntity}
              autoFocusName={focusNewId === selectedEntity.id}
              onUpdate={(changes) => updateDataModelEntity(selectedEntity.id, changes)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ------- EntityEditor -------------------------------------------------------

interface EditorProps {
  entity: DataModelEntity;
  autoFocusName: boolean;
  onUpdate: (changes: Partial<DataModelEntity>) => void;
}

function EntityEditor({ entity, autoFocusName, onUpdate }: EditorProps) {
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);

  const fieldDnd = useDragReorder(
    entity.fields.map((f) => f.id),
    (orderedIds) => reorderEntityFields(entity.id, orderedIds),
  );

  async function handleAddField() {
    const id = await addEntityField(entity.id);
    setFocusFieldId(id);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
      {/* Entity name */}
      <input
        type="text"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocusName}
        defaultValue={entity.name}
        placeholder="Entity name (e.g. User, Order, Product)"
        onBlur={(e) => onUpdate({ name: e.target.value })}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />

      {/* Description */}
      <textarea
        rows={2}
        defaultValue={entity.description}
        placeholder="Short description of this entity (optional)"
        onBlur={(e) => onUpdate({ description: e.target.value })}
        className={`${inputClass} resize-none`}
      />

      {/* Fields table */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Fields</span>
          <span className="text-xs text-slate-400">{entity.fields.length} field{entity.fields.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Column headers */}
        {entity.fields.length > 0 && (
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className="w-5 shrink-0" />
            <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
              Name
            </span>
            <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
              Type
            </span>
            <span className="flex shrink-0 gap-1">
              <span className="w-8 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                PK
              </span>
              <span className="w-8 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                FK
              </span>
              <span className="w-8 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                NN
              </span>
            </span>
            <span className="flex-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Notes
            </span>
            <span className="w-6 shrink-0" />
          </div>
        )}

        {entity.fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            No fields yet. Add your first field below.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entity.fields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                autoFocus={focusFieldId === field.id}
                isDragging={fieldDnd.dragId === field.id}
                isOver={fieldDnd.overId === field.id && fieldDnd.dragId !== field.id}
                handleProps={fieldDnd.handleProps(field.id)}
                rowProps={fieldDnd.rowProps(field.id)}
                onUpdate={(changes) => updateEntityField(entity.id, field.id, changes)}
                onDelete={() => deleteEntityField(entity.id, field.id)}
              />
            ))}
          </ul>
        )}

        <button
          onClick={handleAddField}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full border border-indigo-300 text-base leading-none">
            +
          </span>
          Add field
        </button>
      </div>
    </div>
  );
}

// ------- FieldRow -----------------------------------------------------------

interface FieldRowProps {
  field: EntityField;
  autoFocus: boolean;
  isDragging: boolean;
  isOver: boolean;
  handleProps: React.HTMLAttributes<HTMLElement> & { draggable: boolean };
  rowProps: React.HTMLAttributes<HTMLLIElement>;
  onUpdate: (changes: Partial<EntityField>) => void;
  onDelete: () => void;
}

function FieldRow({
  field,
  autoFocus,
  isDragging,
  isOver,
  handleProps,
  rowProps,
  onUpdate,
  onDelete,
}: FieldRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  return (
    <li
      {...rowProps}
      className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 transition ${
        isDragging ? 'opacity-40' : ''
      } ${isOver ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}
    >
      {/* Drag handle */}
      <span
        {...handleProps}
        title="Drag to reorder"
        className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
      >
        <DragIcon />
      </span>

      {/* Field name — monospace */}
      <input
        ref={nameRef}
        type="text"
        defaultValue={field.name}
        placeholder="field_name"
        onBlur={(e) => onUpdate({ name: e.target.value })}
        className="w-40 shrink-0 rounded border border-transparent bg-slate-50 px-2 py-1 font-mono text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-100"
      />

      {/* Type select */}
      <select
        defaultValue={field.type}
        onChange={(e) => onUpdate({ type: e.target.value })}
        className="w-28 shrink-0 rounded border border-transparent bg-slate-50 px-2 py-1 text-sm text-slate-700 hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
      >
        {FIELD_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Constraint badges */}
      <div className="flex shrink-0 gap-1">
        <ConstraintBadge
          active={field.isPK}
          label="PK"
          activeClass="bg-indigo-600 text-white border-indigo-600"
          inactiveClass="border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-500"
          onClick={() => onUpdate({ isPK: !field.isPK })}
          title="Primary Key"
        />
        <ConstraintBadge
          active={field.isFK}
          label="FK"
          activeClass="bg-amber-500 text-white border-amber-500"
          inactiveClass="border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-500"
          onClick={() => onUpdate({ isFK: !field.isFK })}
          title="Foreign Key"
        />
        <ConstraintBadge
          active={field.isRequired}
          label="NN"
          activeClass="bg-slate-600 text-white border-slate-600"
          inactiveClass="border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-500"
          onClick={() => onUpdate({ isRequired: !field.isRequired })}
          title="Not Null / Required"
        />
      </div>

      {/* Notes */}
      <input
        type="text"
        defaultValue={field.notes}
        placeholder="Notes…"
        onBlur={(e) => onUpdate({ notes: e.target.value })}
        className="min-w-0 flex-1 rounded border border-transparent bg-slate-50 px-2 py-1 text-sm text-slate-600 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-100"
      />

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Remove field"
        className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
      >
        <XIcon size={14} />
      </button>
    </li>
  );
}

// ------- ConstraintBadge ----------------------------------------------------

function ConstraintBadge({
  active,
  label,
  activeClass,
  inactiveClass,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  activeClass: string;
  inactiveClass: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-6 w-8 place-items-center rounded border text-xs font-bold transition ${
        active ? activeClass : inactiveClass
      }`}
    >
      {label}
    </button>
  );
}

// ------- SVG helpers --------------------------------------------------------

function DragIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="8" cy="5" r="2" />
      <circle cx="16" cy="5" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="8" cy="19" r="2" />
      <circle cx="16" cy="19" r="2" />
    </svg>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
