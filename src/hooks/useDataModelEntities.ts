import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery } from '@tanstack/react-query';
import { db } from '../db/database';
import { apiFetch } from '../api/client';
import { getCurrentUser, subscribeAuthChange } from '../lib/authStore';
import type { DataModelEntity } from '../db/types';

function useIsAuthenticated(): boolean {
  return useSyncExternalStore(
    subscribeAuthChange,
    () => getCurrentUser() !== null,
    () => false,
  );
}

export function useDataModelEntities(
  problemId: string | undefined,
): DataModelEntity[] | undefined {
  const isAuth = useIsAuthenticated();
  const local = useLiveQuery(
    () =>
      problemId
        ? db.dataModelEntities.where('problemId').equals(problemId).sortBy('order')
        : [],
    [problemId],
  );
  const { data: remote } = useQuery<DataModelEntity[]>({
    queryKey: ['data-model-entities', problemId],
    queryFn: () => apiFetch<DataModelEntity[]>(`/problems/${problemId}/data-model-entities`),
    enabled: isAuth && !!problemId,
  });
  return isAuth ? remote : local;
}
