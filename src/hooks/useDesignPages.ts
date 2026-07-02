import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery } from '@tanstack/react-query';
import { db } from '../db/database';
import { apiFetch } from '../api/client';
import { getCurrentUser, subscribeAuthChange } from '../lib/authStore';
import type { DesignPage } from '../db/types';

function useIsAuthenticated(): boolean {
  return useSyncExternalStore(
    subscribeAuthChange,
    () => getCurrentUser() !== null,
    () => false,
  );
}

export function useDesignPages(problemId: string | undefined): DesignPage[] | undefined {
  const isAuth = useIsAuthenticated();
  const local = useLiveQuery(
    () =>
      problemId
        ? db.designPages.where('problemId').equals(problemId).sortBy('order')
        : [],
    [problemId],
  );
  const { data: remote } = useQuery<DesignPage[]>({
    queryKey: ['design-pages', problemId],
    queryFn: () => apiFetch<DesignPage[]>(`/problems/${problemId}/design-pages`),
    enabled: isAuth && !!problemId,
  });
  return isAuth ? remote : local;
}
