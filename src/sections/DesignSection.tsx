import '@excalidraw/excalidraw/index.css';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { Excalidraw, serializeAsJSON, convertToExcalidrawElements, viewportCoordsToSceneCoords } from '@excalidraw/excalidraw';
import type { Problem } from '../db/types';
import {
  createDesignPage,
  deleteDesignPage,
  renameDesignPage,
  reorderDesignPages,
  updateDesignPageNotes,
  updateDesignPageScene,
} from '../db/repository';
import { inputClass } from '../components/ui';
import { useDesignPages } from '../hooks/useDesignPages';
import { useDragReorder } from '../lib/useDragReorder';

type ExcalidrawAPI = Parameters<NonNullable<ComponentProps<typeof Excalidraw>['excalidrawAPI']>>[0];
type ExcalidrawInitData = ComponentProps<typeof Excalidraw>['initialData'];

type ShapeType = 'rectangle' | 'rounded' | 'diamond' | 'ellipse' | 'cylinder';

interface ComponentDef {
  label: string;
  color: string;
  shape: ShapeType;
  strokeStyle?: 'solid' | 'dashed';
  width: number;
  height: number;
}

const PALETTE_ITEMS: ComponentDef[] = [
  { label: 'Client',           color: '#dbeafe', shape: 'rounded',   width: 140, height: 60 },
  { label: 'Load Balancer',    color: '#fee2e2', shape: 'diamond',   width: 140, height: 80 },
  { label: 'API Gateway',      color: '#fef3c7', shape: 'rectangle', width: 160, height: 60, strokeStyle: 'dashed' },
  { label: 'Web Server',       color: '#dcfce7', shape: 'rounded',   width: 140, height: 60 },
  { label: 'App Service',      color: '#ede9fe', shape: 'rectangle', width: 160, height: 60 },
  { label: 'Microservice',     color: '#d1fae5', shape: 'diamond',   width: 130, height: 70 },
  { label: 'Database',         color: '#e0e7ff', shape: 'cylinder',  width: 120, height: 90 },
  { label: 'Cache',            color: '#fce7f3', shape: 'cylinder',  width: 120, height: 90 },
  { label: 'Message Queue',    color: '#fef9c3', shape: 'rectangle', width: 180, height: 60 },
  { label: 'Object Storage',   color: '#ecfccb', shape: 'cylinder',  width: 130, height: 90 },
  { label: 'CDN',              color: '#f3e8ff', shape: 'ellipse',   width: 160, height: 70 },
  { label: 'Search Service',   color: '#cffafe', shape: 'rounded',   width: 160, height: 60 },
  { label: 'Worker',           color: '#f0fdf4', shape: 'diamond',   width: 120, height: 70 },
  { label: 'Notification Svc', color: '#ffe4e6', shape: 'rounded',   width: 160, height: 60 },
  { label: 'External API',     color: '#f8fafc', shape: 'rectangle', width: 160, height: 60, strokeStyle: 'dashed' },
  { label: 'Generic Box',      color: '#f1f5f9', shape: 'rectangle', width: 160, height: 60 },
];

type SkeletonList = NonNullable<Parameters<typeof convertToExcalidrawElements>[0]>;

function buildPaletteElements(def: ComponentDef, x: number, y: number): SkeletonList {
  const { label, color, shape, strokeStyle, width, height } = def;
  const base = {
    backgroundColor: color,
    fillStyle: 'solid' as const,
    strokeColor: '#64748b',
    strokeWidth: 1.5,
    strokeStyle: (strokeStyle ?? 'solid') as 'solid' | 'dashed',
  };

  if (shape === 'cylinder') {
    const capH = 18;
    const groupId = Math.random().toString(36).slice(2, 10);
    return [
      {
        type: 'rectangle' as const,
        x, y: y + capH / 2,
        width, height: height - capH / 2,
        ...base,
        roundness: null,
        groupIds: [groupId],
        label: { text: label, fontSize: 12 },
      },
      {
        type: 'ellipse' as const,
        x, y,
        width, height: capH,
        ...base,
        groupIds: [groupId],
      },
    ] as SkeletonList;
  }

  if (shape === 'diamond') {
    return [{
      type: 'diamond' as const,
      x, y, width, height,
      ...base,
      label: { text: label, fontSize: 12 },
    }] as SkeletonList;
  }

  if (shape === 'ellipse') {
    return [{
      type: 'ellipse' as const,
      x, y, width, height,
      ...base,
      label: { text: label, fontSize: 12 },
    }] as SkeletonList;
  }

  return [{
    type: 'rectangle' as const,
    x, y, width, height,
    ...base,
    roundness: shape === 'rounded' ? { type: 3 as const } : null,
    label: { text: label, fontSize: 12 },
  }] as SkeletonList;
}

interface Props {
  problem: Problem;
}

export default function DesignSection({ problem }: Props) {
  const pages = useDesignPages(problem.id);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const apiRef = useRef<ExcalidrawAPI | null>(null);

  // Derive which page to show: honor selection if valid, else first page.
  const activePage =
    pages?.find((p) => p.id === activePageId) ?? pages?.[0] ?? null;

  // Auto-select first page when pages first load or if selection becomes invalid.
  useEffect(() => {
    if (!pages?.length) return;
    if (!activePageId || !pages.find((p) => p.id === activePageId)) {
      setActivePageId(pages[0].id);
    }
  }, [pages, activePageId]);

  // Focus rename input when it appears.
  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  const dnd = useDragReorder(
    pages?.map((p) => p.id) ?? [],
    (orderedIds) => reorderDesignPages(problem.id, orderedIds),
  );

  async function handleNewPage() {
    const num = (pages?.length ?? 0) + 1;
    const id = await createDesignPage(problem.id, `Design v${num}`);
    setActivePageId(id);
  }

  async function handleDeletePage(pageId: string) {
    if (!pages || pages.length <= 1) return;
    const idx = pages.findIndex((p) => p.id === pageId);
    const nextId = pages[idx + 1]?.id ?? pages[idx - 1]?.id;
    await deleteDesignPage(pageId);
    if (pageId === activePageId) setActivePageId(nextId ?? null);
  }

  function commitRename(pageId: string, value: string) {
    const trimmed = value.trim();
    if (trimmed) renameDesignPage(pageId, trimmed);
    setRenamingId(null);
  }

  function insertComponent(def: ComponentDef) {
    const api = apiRef.current;
    if (!api) return;
    const appState = api.getAppState();
    const center = viewportCoordsToSceneCoords(
      { clientX: appState.width / 2, clientY: appState.height / 2 },
      appState,
    );
    const newEls = convertToExcalidrawElements(
      buildPaletteElements(def, center.x - def.width / 2, center.y - def.height / 2),
    );
    const current = api.getSceneElements();
    api.updateScene({ elements: [...current, ...newEls] });
  }

  if (pages === undefined) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div>
      {/* Page tab bar */}
      <div className="mb-3 flex items-center gap-0.5 overflow-x-auto border-b border-slate-200">
        {pages.map((page) => {
          const isActive = activePage?.id === page.id;
          const isRenaming = renamingId === page.id;
          const isOver = dnd.overId === page.id && dnd.dragId !== page.id;
          return (
            <div
              key={page.id}
              {...dnd.rowProps(page.id)}
              className={`group -mb-px flex items-center gap-1 border-b-2 px-2.5 py-2 text-sm font-medium transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              } ${isOver ? 'border-indigo-300' : ''} ${dnd.dragId === page.id ? 'opacity-40' : ''}`}
            >
              <span
                {...dnd.handleProps(page.id)}
                title="Drag to reorder"
                className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
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

              {isRenaming ? (
                <input
                  ref={renameRef}
                  defaultValue={page.title}
                  className="w-24 rounded border border-indigo-300 px-1 py-0.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  onBlur={(e) => commitRename(page.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      commitRename(page.id, (e.target as HTMLInputElement).value);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                />
              ) : (
                <button
                  onClick={() => setActivePageId(page.id)}
                  onDoubleClick={() => setRenamingId(page.id)}
                  className="whitespace-nowrap"
                >
                  {page.title}
                </button>
              )}

              {pages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePage(page.id);
                  }}
                  title="Delete page"
                  className="hidden rounded-sm p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={handleNewPage}
          className="ml-1 flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          + New page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No design pages yet.</p>
          <button
            onClick={handleNewPage}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Create first page
          </button>
        </div>
      ) : activePage ? (
        <>
        <textarea
          key={`${activePage.id}-notes`}
          rows={2}
          defaultValue={activePage.notes ?? ''}
          placeholder="Describe this design — key decisions, trade-offs, scale estimates…"
          onBlur={(e) => updateDesignPageNotes(activePage.id, e.target.value)}
          className={`${inputClass} mb-3 resize-y`}
        />
        <div
          className="flex overflow-hidden rounded-xl border border-slate-200"
          style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}
        >
          {/* Component palette */}
          <div className="w-40 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Components
            </p>
            {PALETTE_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => insertComponent(item)}
                title={item.label}
                className="mb-1 w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-white hover:shadow-sm"
                style={{ borderLeft: `3px solid ${item.color === '#f8fafc' || item.color === '#f1f5f9' ? '#cbd5e1' : item.color}` }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Excalidraw canvas, keyed by page id so it remounts on page switch */}
          <div className="flex-1 overflow-hidden">
            <ExcalidrawCanvas
              key={activePage.id}
              scene={activePage.scene}
              onSave={(json) => updateDesignPageScene(activePage.id, json)}
              onApiReady={(api) => {
                apiRef.current = api;
              }}
            />
          </div>
        </div>
        </>
      ) : null}
    </div>
  );
}

interface CanvasProps {
  scene: unknown;
  onSave: (json: string) => void;
  onApiReady: (api: ExcalidrawAPI) => void;
}

function ExcalidrawCanvas({ scene, onSave, onApiReady }: CanvasProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute initialData only once at mount time (component is keyed by page id).
  const [initialData] = useState<ExcalidrawInitData>(() => {
    if (!scene) return null;
    try {
      // serializeAsJSON output is structurally compatible with ExcalidrawInitialDataState.
      return JSON.parse(scene as string) as ExcalidrawInitData;
    } catch {
      return null;
    }
  });

  // Clear any pending save on unmount (page switch or component teardown).
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <Excalidraw
      initialData={initialData}
      excalidrawAPI={onApiReady}
      onChange={(elements, appState, files) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        const savedEls = elements;
        const savedState = appState;
        const savedFiles = files;
        saveTimerRef.current = setTimeout(() => {
          onSave(serializeAsJSON(savedEls, savedState, savedFiles, 'local'));
        }, 500);
      }}
    />
  );
}
