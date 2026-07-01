import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

// Live queries automatically re-render components when the underlying
// IndexedDB data changes, so we never manually manage a cache.

export function useProblems() {
  return useLiveQuery(
    () => db.problems.orderBy('updatedAt').reverse().toArray(),
    [],
  );
}

export function useProblem(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.problems.get(id) : undefined),
    [id],
  );
}
