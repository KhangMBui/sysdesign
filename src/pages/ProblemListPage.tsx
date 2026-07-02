import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblems } from '../hooks/useProblems';
import { deleteProblem, toggleCompleted } from '../db/repository';
import { Button, DifficultyBadge, inputClass } from '../components/ui';
import ProblemFormModal from '../components/ProblemFormModal';
import Modal from '../components/Modal';
import type { Difficulty, Problem } from '../db/types';

const filters: Difficulty[] = ['', 'Junior', 'Mid-Level', 'Senior'];
const DIFFICULTY_ORDER: Record<string, number> = { Junior: 0, 'Mid-Level': 1, Senior: 2, '': 3 };

export default function ProblemListPage() {
  const problems = useProblems();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Problem | undefined>();
  const [deleting, setDeleting] = useState<Problem | undefined>();

  const filtered = useMemo(() => {
    if (!problems) return [];
    const q = query.trim().toLowerCase();
    return problems
      .filter((p) => {
        if (difficulty && p.difficulty !== difficulty) return false;
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const da = DIFFICULTY_ORDER[a.difficulty] ?? 3;
        const db = DIFFICULTY_ORDER[b.difficulty] ?? 3;
        return da !== db ? da - db : a.title.localeCompare(b.title);
      });
  }, [problems, query, difficulty]);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(p: Problem) {
    setEditing(p);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (deleting) await deleteProblem(deleting.id);
    setDeleting(undefined);
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Design Questions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your custom problems. Create, organize, and practice.
          </p>
        </div>
        <Button onClick={openCreate}>
          <span className="text-base leading-none">+</span> New problem
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          className={`${inputClass} sm:flex-1`}
          placeholder="Search problems…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={`${inputClass} sm:w-52`}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          {filters.map((d) => (
            <option key={d || 'all'} value={d}>
              {d || 'All difficulties'}
            </option>
          ))}
        </select>
      </div>

      {problems === undefined ? (
        <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState hasProblems={problems.length > 0} onCreate={openCreate} />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filtered.map((p) => (
            <li key={p.id} className="group flex items-center gap-4 px-4 py-4 hover:bg-slate-50/70">
              <button
                onClick={() => toggleCompleted(p.id)}
                aria-label={p.completed ? 'Mark as not done' : 'Mark as done'}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                  p.completed
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 text-transparent hover:border-indigo-400'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </button>

              <button
                onClick={() => navigate(`/problems/${p.id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-slate-800 group-hover:text-indigo-700">
                    {p.title}
                  </span>
                  <DifficultyBadge difficulty={p.difficulty} />
                </div>
                {p.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{p.description}</p>
                )}
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <Button variant="secondary" onClick={() => navigate(`/problems/${p.id}`)}>
                  Practice
                </Button>
                <IconButton title="Edit" onClick={() => openEdit(p)}>
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </IconButton>
                <IconButton title="Delete" onClick={() => setDeleting(p)}>
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProblemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        problem={editing}
        onCreated={(id) => navigate(`/problems/${id}`)}
      />

      <Modal
        open={Boolean(deleting)}
        title="Delete problem"
        onClose={() => setDeleting(undefined)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(undefined)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-medium text-slate-800">{deleting?.title}</span> and all its
          designs and deep dives? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

function EmptyState({ hasProblems, onCreate }: { hasProblems: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <p className="text-sm text-slate-500">
        {hasProblems ? 'No problems match your search.' : 'No problems yet.'}
      </p>
      {!hasProblems && (
        <div className="mt-4">
          <Button onClick={onCreate}>Create your first problem</Button>
        </div>
      )}
    </div>
  );
}
