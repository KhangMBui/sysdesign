import { db } from './database';
import { newId } from '../lib/id';
import type { Problem, ApiEndpoint } from './types';

// ---- Problems -------------------------------------------------------------

export type NewProblemInput = Pick<
  Problem,
  'title' | 'description' | 'constraints' | 'notes' | 'difficulty'
>;

export async function createProblem(
  input: Partial<NewProblemInput>,
): Promise<Problem> {
  const now = Date.now();
  const problem: Problem = {
    id: newId('prob'),
    title: input.title?.trim() || 'Untitled Problem',
    description: input.description ?? '',
    constraints: input.constraints ?? '',
    notes: input.notes ?? '',
    difficulty: input.difficulty ?? '',
    completed: false,
    functionalReqs: [],
    nonFunctionalReqs: [],
    apiEndpoints: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.problems.add(problem);
  return problem;
}

export async function updateProblem(
  id: string,
  changes: Partial<Problem>,
): Promise<void> {
  await db.problems.update(id, { ...changes, updatedAt: Date.now() });
}

export async function toggleCompleted(id: string): Promise<void> {
  const p = await db.problems.get(id);
  if (!p) return;
  await updateProblem(id, { completed: !p.completed });
}

// Deletes the problem and everything attached to it (cascade).
export async function deleteProblem(id: string): Promise<void> {
  await db.transaction('rw', db.problems, db.designPages, db.deepDives, async () => {
    await db.designPages.where('problemId').equals(id).delete();
    await db.deepDives.where('problemId').equals(id).delete();
    await db.problems.delete(id);
  });
}

// ---- Requirements ---------------------------------------------------------
// Functional and non-functional requirements are embedded arrays on the
// Problem record. `modify` mutates the stored object atomically, which avoids
// read-then-write races when edits fire in quick succession.

export type ReqField = 'functionalReqs' | 'nonFunctionalReqs';

export async function addRequirement(
  problemId: string,
  field: ReqField,
): Promise<string> {
  const id = newId('req');
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      p[field] = [...p[field], { id, text: '' }];
      p.updatedAt = Date.now();
    });
  return id;
}

export async function updateRequirement(
  problemId: string,
  field: ReqField,
  reqId: string,
  text: string,
): Promise<void> {
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      const req = p[field].find((r) => r.id === reqId);
      if (req) req.text = text;
      p.updatedAt = Date.now();
    });
}

export async function deleteRequirement(
  problemId: string,
  field: ReqField,
  reqId: string,
): Promise<void> {
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      p[field] = p[field].filter((r) => r.id !== reqId);
      p.updatedAt = Date.now();
    });
}

export async function reorderRequirements(
  problemId: string,
  field: ReqField,
  orderedIds: string[],
): Promise<void> {
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      const byId = new Map(p[field].map((r) => [r.id, r]));
      p[field] = orderedIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r));
      p.updatedAt = Date.now();
    });
}

// ---- API Endpoints --------------------------------------------------------
// Like requirements, endpoints are embedded arrays on the Problem record and
// mutated atomically via `modify`.

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export async function addApiEndpoint(problemId: string): Promise<string> {
  const id = newId('ep');
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      p.apiEndpoints = [
        ...p.apiEndpoints,
        { id, method: 'GET', path: '', requestBody: '', responseBody: '', auth: '', notes: '' },
      ];
      p.updatedAt = Date.now();
    });
  return id;
}

export async function updateApiEndpoint(
  problemId: string,
  endpointId: string,
  changes: Partial<ApiEndpoint>,
): Promise<void> {
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      const ep = p.apiEndpoints.find((e) => e.id === endpointId);
      if (ep) Object.assign(ep, changes);
      p.updatedAt = Date.now();
    });
}

export async function deleteApiEndpoint(
  problemId: string,
  endpointId: string,
): Promise<void> {
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      p.apiEndpoints = p.apiEndpoints.filter((e) => e.id !== endpointId);
      p.updatedAt = Date.now();
    });
}

export async function reorderApiEndpoints(
  problemId: string,
  orderedIds: string[],
): Promise<void> {
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      const byId = new Map(p.apiEndpoints.map((e) => [e.id, e]));
      p.apiEndpoints = orderedIds
        .map((id) => byId.get(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e));
      p.updatedAt = Date.now();
    });
}

// ---- Seed -----------------------------------------------------------------

// Populates a couple of example problems the first time the app is opened,
// so the list isn't empty. Safe to call on every startup.
export async function seedIfEmpty(): Promise<void> {
  const count = await db.problems.count();
  if (count > 0) return;
  await createProblem({
    title: 'Design a URL Shortener',
    description: 'Design a URL shortener service like bit.ly.',
    difficulty: 'Mid-Level',
    constraints: '100M new URLs / month. Reads >> writes. Links never expire by default.',
  });
  await createProblem({
    title: 'Design a Coding Contest Platform',
    description:
      'Timed contests with a fixed duration and a real-time leaderboard showing the top 50 users.',
    difficulty: 'Senior',
  });
}
