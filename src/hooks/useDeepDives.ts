import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery } from '@tanstack/react-query';
import { db } from '../db/database';
import { apiFetch } from '../api/client';
import { getCurrentUser, subscribeAuthChange } from '../lib/authStore';
import type { DeepDive } from '../db/types';

function useIsAuthenticated(): boolean {
  return useSyncExternalStore(
    subscribeAuthChange,
    () => getCurrentUser() !== null,
    () => false,
  );
}

export function useDeepDives(problemId: string | undefined): DeepDive[] | undefined {
  const isAuth = useIsAuthenticated();
  const local = useLiveQuery(
    () =>
      problemId
        ? db.deepDives.where('problemId').equals(problemId).sortBy('order')
        : [],
    [problemId],
  );
  const { data: remote } = useQuery<DeepDive[]>({
    queryKey: ['deep-dives', problemId],
    queryFn: () => apiFetch<DeepDive[]>(`/problems/${problemId}/deep-dives`),
    enabled: isAuth && !!problemId,
  });
  return isAuth ? remote : local;
}
