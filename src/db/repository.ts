import { db } from './database';
import { newId } from '../lib/id';
import type { Problem, ApiEndpoint, ApiStatusCode, DeepDive, DataModelEntity, EntityField } from './types';

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
  await db.transaction('rw', db.problems, db.designPages, db.deepDives, db.dataModelEntities, async () => {
    await db.designPages.where('problemId').equals(id).delete();
    await db.deepDives.where('problemId').equals(id).delete();
    await db.dataModelEntities.where('problemId').equals(id).delete();
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

export const HTTP_STATUS_CODES = [
  { code: '100', label: '100 Continue' },
  { code: '101', label: '101 Switching Protocols' },
  { code: '200', label: '200 OK' },
  { code: '201', label: '201 Created' },
  { code: '202', label: '202 Accepted' },
  { code: '204', label: '204 No Content' },
  { code: '206', label: '206 Partial Content' },
  { code: '301', label: '301 Moved Permanently' },
  { code: '302', label: '302 Found' },
  { code: '304', label: '304 Not Modified' },
  { code: '307', label: '307 Temporary Redirect' },
  { code: '308', label: '308 Permanent Redirect' },
  { code: '400', label: '400 Bad Request' },
  { code: '401', label: '401 Unauthorized' },
  { code: '403', label: '403 Forbidden' },
  { code: '404', label: '404 Not Found' },
  { code: '405', label: '405 Method Not Allowed' },
  { code: '409', label: '409 Conflict' },
  { code: '410', label: '410 Gone' },
  { code: '412', label: '412 Precondition Failed' },
  { code: '422', label: '422 Unprocessable Entity' },
  { code: '429', label: '429 Too Many Requests' },
  { code: '500', label: '500 Internal Server Error' },
  { code: '501', label: '501 Not Implemented' },
  { code: '502', label: '502 Bad Gateway' },
  { code: '503', label: '503 Service Unavailable' },
  { code: '504', label: '504 Gateway Timeout' },
];

export async function addApiEndpoint(problemId: string): Promise<string> {
  const id = newId('ep');
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      p.apiEndpoints = [
        ...p.apiEndpoints,
        { id, method: 'GET', path: '', requestBody: '', responseBody: '', auth: '', notes: '', statusCodes: [] },
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

export async function addApiStatusCode(
  problemId: string,
  endpointId: string,
): Promise<string> {
  const id = newId('sc');
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      const ep = p.apiEndpoints.find((e) => e.id === endpointId);
      if (ep) {
        ep.statusCodes = [...(ep.statusCodes ?? []), { id, code: '200', responseBody: '' }];
      }
      p.updatedAt = Date.now();
    });
  return id;
}

export async function updateApiStatusCode(
  problemId: string,
  endpointId: string,
  statusCodeId: string,
  changes: Partial<ApiStatusCode>,
): Promise<void> {
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      const ep = p.apiEndpoints.find((e) => e.id === endpointId);
      if (ep) {
        const sc = (ep.statusCodes ?? []).find((s) => s.id === statusCodeId);
        if (sc) Object.assign(sc, changes);
      }
      p.updatedAt = Date.now();
    });
}

export async function deleteApiStatusCode(
  problemId: string,
  endpointId: string,
  statusCodeId: string,
): Promise<void> {
  await db.problems
    .where('id')
    .equals(problemId)
    .modify((p) => {
      const ep = p.apiEndpoints.find((e) => e.id === endpointId);
      if (ep) {
        ep.statusCodes = (ep.statusCodes ?? []).filter((s) => s.id !== statusCodeId);
      }
      p.updatedAt = Date.now();
    });
}

// ---- Design Pages ---------------------------------------------------------
// Each DesignPage holds one Excalidraw scene serialized to JSON. Stored in
// its own table (not embedded on Problem) because scenes can be large.

export async function createDesignPage(
  problemId: string,
  title = 'Design v1',
): Promise<string> {
  const now = Date.now();
  const id = newId('dp');
  const order = await db.designPages.where('problemId').equals(problemId).count();
  await db.designPages.add({ id, problemId, title, order, scene: null, createdAt: now, updatedAt: now });
  return id;
}

export async function updateDesignPageScene(id: string, scene: unknown): Promise<void> {
  await db.designPages.update(id, { scene, updatedAt: Date.now() });
}

export async function updateDesignPageNotes(id: string, notes: string): Promise<void> {
  await db.designPages.update(id, { notes, updatedAt: Date.now() });
}

export async function renameDesignPage(id: string, title: string): Promise<void> {
  await db.designPages.update(id, { title, updatedAt: Date.now() });
}

export async function deleteDesignPage(id: string): Promise<void> {
  await db.designPages.delete(id);
}

export async function reorderDesignPages(
  problemId: string,
  orderedIds: string[],
): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.designPages, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.designPages
        .where('id')
        .equals(orderedIds[i])
        .modify((p) => {
          if (p.problemId === problemId) {
            p.order = i;
            p.updatedAt = now;
          }
        });
    }
  });
}

// ---- Deep Dives -----------------------------------------------------------
// Large independent records (prompts + responses can be long) stored in their
// own table, keyed by problemId and sorted by `order`.

export async function createDeepDive(problemId: string): Promise<string> {
  const now = Date.now();
  const id = newId('dd');
  const order = await db.deepDives.where('problemId').equals(problemId).count();
  await db.deepDives.add({
    id,
    problemId,
    title: '',
    prompt: '',
    response: '',
    notes: '',
    order,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateDeepDive(
  id: string,
  changes: Partial<DeepDive>,
): Promise<void> {
  await db.deepDives.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteDeepDive(id: string): Promise<void> {
  await db.deepDives.delete(id);
}

export async function reorderDeepDives(
  problemId: string,
  orderedIds: string[],
): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.deepDives, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.deepDives
        .where('id')
        .equals(orderedIds[i])
        .modify((d) => {
          if (d.problemId === problemId) {
            d.order = i;
            d.updatedAt = now;
          }
        });
    }
  });
}

// ---- Data Model Entities --------------------------------------------------
// Each entity holds its fields as an embedded array (small, always loaded
// together). Entity records live in their own table, keyed by problemId.

export const FIELD_TYPES = [
  'string', 'text', 'integer', 'bigint', 'float',
  'boolean', 'timestamp', 'uuid', 'enum', 'json', 'array', 'blob',
];

export async function createDataModelEntity(problemId: string): Promise<string> {
  const now = Date.now();
  const id = newId('dme');
  const order = await db.dataModelEntities.where('problemId').equals(problemId).count();
  await db.dataModelEntities.add({
    id, problemId, name: '', description: '', fields: [], order, createdAt: now, updatedAt: now,
  });
  return id;
}

export async function updateDataModelEntity(
  id: string,
  changes: Partial<DataModelEntity>,
): Promise<void> {
  await db.dataModelEntities.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteDataModelEntity(id: string): Promise<void> {
  await db.dataModelEntities.delete(id);
}

export async function reorderDataModelEntities(
  problemId: string,
  orderedIds: string[],
): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.dataModelEntities, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.dataModelEntities
        .where('id')
        .equals(orderedIds[i])
        .modify((e) => {
          if (e.problemId === problemId) { e.order = i; e.updatedAt = now; }
        });
    }
  });
}

export async function addEntityField(entityId: string): Promise<string> {
  const id = newId('fld');
  await db.dataModelEntities
    .where('id')
    .equals(entityId)
    .modify((e) => {
      e.fields = [
        ...e.fields,
        { id, name: '', type: 'string', isPK: false, isFK: false, isRequired: false, notes: '' },
      ];
      e.updatedAt = Date.now();
    });
  return id;
}

export async function updateEntityField(
  entityId: string,
  fieldId: string,
  changes: Partial<EntityField>,
): Promise<void> {
  await db.dataModelEntities
    .where('id')
    .equals(entityId)
    .modify((e) => {
      const f = e.fields.find((x) => x.id === fieldId);
      if (f) Object.assign(f, changes);
      e.updatedAt = Date.now();
    });
}

export async function deleteEntityField(entityId: string, fieldId: string): Promise<void> {
  await db.dataModelEntities
    .where('id')
    .equals(entityId)
    .modify((e) => {
      e.fields = e.fields.filter((x) => x.id !== fieldId);
      e.updatedAt = Date.now();
    });
}

export async function reorderEntityFields(
  entityId: string,
  orderedIds: string[],
): Promise<void> {
  await db.dataModelEntities
    .where('id')
    .equals(entityId)
    .modify((e) => {
      const byId = new Map(e.fields.map((f) => [f.id, f]));
      e.fields = orderedIds
        .map((id) => byId.get(id))
        .filter((f): f is NonNullable<typeof f> => Boolean(f));
      e.updatedAt = Date.now();
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
