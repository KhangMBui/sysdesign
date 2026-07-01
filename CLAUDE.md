# CLAUDE.md — Dev notes for Claude Code

## Build steps completed
- Step 1: Scaffold, data layer, problem list, detail shell + Overview
- Step 2: Functional & non-functional requirements (add/edit/delete/reorder)
- Step 3: API design section
- Step 4: High-level design canvas (Excalidraw, multiple pages, component palette)
- Step 5: Deep Dives section (two-panel: left list, right editor)
- **Next: Step 6** — Export/import JSON + responsive polish

## Stack
React 18 + TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`), Vite 6,
React Router v6, Dexie v4 (IndexedDB), `dexie-react-hooks` (`useLiveQuery`),
Tailwind CSS v4 (`@tailwindcss/vite`), `@excalidraw/excalidraw` v0.18.

## Key conventions

### Data layer
- **Small embedded arrays** (requirements, apiEndpoints) live inside the
  `Problem` record. Mutate atomically with `db.problems.where('id').equals(id).modify(p => { ... })`, always bumping `p.updatedAt`.
- **Larger independent tables** (designPages, deepDives) keyed by `problemId`.
- All CRUD in `src/db/repository.ts`. IDs via `newId(prefix)` from `src/lib/id.ts`.
- `deleteProblem` cascades to designPages and deepDives.

### Hooks
- `src/hooks/` — all `useLiveQuery` wrappers. Follow `useProblems`/`useProblem`/`useDesignPages` pattern.
- Hooks return `undefined` while loading, then the actual data. Components guard with `if (x === undefined) return <loading>`.

### UI
- Shared primitives in `src/components/ui.tsx`: `Button`, `Field`, `inputClass`, `DifficultyBadge`.
- Reusable `Modal` in `src/components/Modal.tsx`.
- Tailwind indigo accent. No extra CSS files needed.

### Editing pattern
- Text inputs: **uncontrolled** (`defaultValue` + `onBlur` to save). Live-query re-renders never clobber in-progress typing.
- Selects: **uncontrolled** (`defaultValue` + `onChange` to save immediately).
- Add-then-focus: keep a `focusId` state, set on add, pass `autoFocus={focusId === item.id}` to row component, `useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])`.

### Reordering
- `useDragReorder(ids, onReorder)` in `src/lib/useDragReorder.ts`. Spread `handleProps` on the drag handle element, `rowProps` on the row wrapper.
- Works for both vertical lists (requirements) and horizontal tabs (design pages).

### Sections architecture
- Sections in `src/sections/`. Rendered by `ProblemDetailPage.tsx` based on the `:section` URL param.
- Tabs: overview, functional, nonfunctional, api, design, deepdives.
- Count badges: embedded arrays → `problem.xxx.length`, separate tables → call `useXxxHook` in `ProblemDetailPage` and use `data?.length ?? null`.

### Excalidraw (Step 4)
- CSS import: `import '@excalidraw/excalidraw/index.css'` once at top of `DesignSection.tsx`.
- Serialize scene: `serializeAsJSON(elements, appState, files, 'local')` → JSON string → stored as `DesignPage.scene`.
- Load scene: `JSON.parse(scene as string)` passed to `initialData` prop (lazy `useState` so it only reads on mount).
- Key the `<ExcalidrawCanvas>` component by `activePage.id` so it remounts cleanly on page switch.
- Imperative API: `excalidrawAPI={(api) => { apiRef.current = api; }}`. Type: `Parameters<NonNullable<ComponentProps<typeof Excalidraw>['excalidrawAPI']>>[0]`.
- Insert palette elements: `convertToExcalidrawElements([...skeleton])` → `api.updateScene({ elements: [...current, ...newEls] })`.
- Debounce saves 500ms in `onChange`; clear timer on unmount via `useEffect` cleanup.

## File map
```
src/
  db/
    types.ts          Problem, Requirement, ApiEndpoint, DesignPage, DeepDive
    database.ts       Dexie setup (problems, designPages, deepDives tables)
    repository.ts     All CRUD helpers + seedIfEmpty
  hooks/
    useProblems.ts    useProblems(), useProblem(id)
    useDesignPages.ts useDesignPages(problemId)
  lib/
    id.ts             newId(prefix)
    useDragReorder.ts drag-to-reorder hook
  components/
    Layout.tsx        Header + <Outlet>
    Modal.tsx         Generic modal
    ProblemFormModal.tsx
    ui.tsx            Button, Field, inputClass, DifficultyBadge
  pages/
    ProblemListPage.tsx
    ProblemDetailPage.tsx   tab router + OverviewSection inline
  sections/
    RequirementsSection.tsx  (functional + non-functional, same component)
    ApiDesignSection.tsx
    DesignSection.tsx        (Excalidraw canvas, page tabs, component palette)
```
