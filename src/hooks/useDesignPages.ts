import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export function useDesignPages(problemId: string | undefined) {
  return useLiveQuery(
    () =>
      problemId
        ? db.designPages.where('problemId').equals(problemId).sortBy('order')
        : [],
    [problemId],
  );
}
