# System Design Practice

A local-first web app for practicing system design problems. Create your own
problems, work through requirements / API design / a visual architecture
canvas / deep-dive questions, and save everything locally in your browser.

No account, no server, no network calls — all data lives in your browser's
IndexedDB on this machine.

## Tech stack

- **React + TypeScript** (Vite)
- **React Router** for navigation
- **Dexie** (IndexedDB) for local-first persistence, with `dexie-react-hooks`
  live queries so the UI updates automatically when data changes
- **Tailwind CSS v4** for styling
- **Excalidraw** for the high-level design canvas *(added in a later step)*

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Other scripts:

```bash
npm run build      # type-check + production build
npm run typecheck  # types only
```

## Project structure

```
src/
  db/
    types.ts        data model
    database.ts     Dexie / IndexedDB setup
    repository.ts   CRUD helpers + seed data
  hooks/
    useProblems.ts  live-query React hooks
  components/       shared UI (Layout, Modal, form, primitives)
  pages/
    ProblemListPage.tsx     list + search + CRUD
    ProblemDetailPage.tsx   section tabs (Overview built; rest stubbed)
  sections/         per-section components (added in later steps)
```

## Build roadmap

- [x] **Step 1** — Scaffold, data layer, problem list, detail shell + Overview
- [x] **Step 2** — Functional & non-functional requirements (add/edit/delete/reorder)
- [x] **Step 3** — API design section (add/edit/delete/reorder endpoints)
- [x] **Step 4** — High-level design canvas (Excalidraw) with multiple pages + component palette
- [x] **Step 5** — Deep-dive questions & responses
- [ ] Later — export/import, optional AI feedback
```
