import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { DataModelEntity } from '../db/types';

export function useDataModelEntities(
  problemId: string | undefined,
): DataModelEntity[] | undefined {
  return useLiveQuery(
    () =>
      problemId
        ? db.dataModelEntities
            .where('problemId')
            .equals(problemId)
            .sortBy('order')
        : [],
    [problemId],
  );
}
