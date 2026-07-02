import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery } from '@tanstack/react-query';
import { db } from '../db/database';
import { apiFetch } from '../api/client';
import { getCurrentUser, subscribeAuthChange } from '../lib/authStore';
import type { Problem } from '../db/types';

function useIsAuthenticated(): boolean {
  return useSyncExternalStore(
    subscribeAuthChange,
    () => getCurrentUser() !== null,
    () => false,
  );
}

export function useProblems(): Problem[] | undefined {
  const isAuth = useIsAuthenticated();
  const local = useLiveQuery(
    () => db.problems.orderBy('updatedAt').reverse().toArray(),
    [],
  );
  const { data: remote } = useQuery<Problem[]>({
    queryKey: ['problems'],
    queryFn: () => apiFetch<Problem[]>('/problems'),
    enabled: isAuth,
  });
  return isAuth ? remote : local;
}

export function useProblem(id: string | undefined): Problem | undefined | null {
  const isAuth = useIsAuthenticated();
  const local = useLiveQuery(
    () => (id ? db.problems.get(id) : undefined),
    [id],
  );
  const { data: remote } = useQuery<Problem | null>({
    queryKey: ['problems', id],
    queryFn: () =>
      id
        ? apiFetch<Problem>(`/problems/${id}`).catch(() => null)
        : Promise.resolve(null),
    enabled: isAuth && !!id,
  });
  return isAuth ? remote : local;
}
