import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export function useDeepDives(problemId: string | undefined) {
  return useLiveQuery(
    () =>
      problemId
        ? db.deepDives.where('problemId').equals(problemId).sortBy('order')
        : [],
    [problemId],
  );
}
