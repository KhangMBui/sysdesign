import { apiFetch } from './client';
import type {
  Problem,
  DesignPage,
  DeepDive,
  DataModelEntity,
} from '../db/types';
import type { NewProblemInput, ReqField } from '../db/repository';
import { newId } from '../lib/id';

// ---- Problems ---------------------------------------------------------------

export async function createProblemRemote(input: Partial<NewProblemInput>): Promise<Problem> {
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
  return apiFetch<Problem>('/problems', { method: 'POST', body: JSON.stringify(problem) });
}

export async function updateProblemRemote(id: string, changes: Partial<Problem>): Promise<void> {
  await apiFetch<Problem>(`/problems/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export async function toggleCompletedRemote(id: string): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${id}`);
  await updateProblemRemote(id, { completed: !problem.completed });
}

export async function deleteProblemRemote(id: string): Promise<void> {
  await apiFetch(`/problems/${id}`, { method: 'DELETE' });
}

// ---- Requirements -----------------------------------------------------------

export async function addRequirementRemote(problemId: string, field: ReqField): Promise<string> {
  const reqId = newId('req');
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const updated = [...problem[field], { id: reqId, text: '' }];
  await updateProblemRemote(problemId, { [field]: updated });
  return reqId;
}

export async function updateRequirementRemote(
  problemId: string,
  field: ReqField,
  reqId: string,
  text: string,
): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const updated = problem[field].map((r) => (r.id === reqId ? { ...r, text } : r));
  await updateProblemRemote(problemId, { [field]: updated });
}

export async function deleteRequirementRemote(
  problemId: string,
  field: ReqField,
  reqId: string,
): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  await updateProblemRemote(problemId, { [field]: problem[field].filter((r) => r.id !== reqId) });
}

export async function reorderRequirementsRemote(
  problemId: string,
  field: ReqField,
  orderedIds: string[],
): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const byId = new Map(problem[field].map((r) => [r.id, r]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as typeof problem[ReqField];
  await updateProblemRemote(problemId, { [field]: reordered });
}

// ---- API Endpoints ----------------------------------------------------------

export async function addApiEndpointRemote(problemId: string): Promise<string> {
  const id = newId('ep');
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const updated = [
    ...problem.apiEndpoints,
    { id, method: 'GET' as const, path: '', requestBody: '', responseBody: '', auth: '', notes: '', statusCodes: [] },
  ];
  await updateProblemRemote(problemId, { apiEndpoints: updated });
  return id;
}

export async function updateApiEndpointRemote(
  problemId: string,
  endpointId: string,
  changes: Partial<Problem['apiEndpoints'][number]>,
): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const updated = problem.apiEndpoints.map((e) => (e.id === endpointId ? { ...e, ...changes } : e));
  await updateProblemRemote(problemId, { apiEndpoints: updated });
}

export async function deleteApiEndpointRemote(problemId: string, endpointId: string): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  await updateProblemRemote(problemId, {
    apiEndpoints: problem.apiEndpoints.filter((e) => e.id !== endpointId),
  });
}

export async function reorderApiEndpointsRemote(
  problemId: string,
  orderedIds: string[],
): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const byId = new Map(problem.apiEndpoints.map((e) => [e.id, e]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Problem['apiEndpoints'];
  await updateProblemRemote(problemId, { apiEndpoints: reordered });
}

export async function addApiStatusCodeRemote(
  problemId: string,
  endpointId: string,
): Promise<string> {
  const id = newId('sc');
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const updated = problem.apiEndpoints.map((e) =>
    e.id === endpointId
      ? { ...e, statusCodes: [...(e.statusCodes ?? []), { id, code: '200', responseBody: '' }] }
      : e,
  );
  await updateProblemRemote(problemId, { apiEndpoints: updated });
  return id;
}

export async function updateApiStatusCodeRemote(
  problemId: string,
  endpointId: string,
  statusCodeId: string,
  changes: Partial<Problem['apiEndpoints'][number]['statusCodes'][number]>,
): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const updated = problem.apiEndpoints.map((e) =>
    e.id === endpointId
      ? {
          ...e,
          statusCodes: (e.statusCodes ?? []).map((s) =>
            s.id === statusCodeId ? { ...s, ...changes } : s,
          ),
        }
      : e,
  );
  await updateProblemRemote(problemId, { apiEndpoints: updated });
}

export async function deleteApiStatusCodeRemote(
  problemId: string,
  endpointId: string,
  statusCodeId: string,
): Promise<void> {
  const problem = await apiFetch<Problem>(`/problems/${problemId}`);
  const updated = problem.apiEndpoints.map((e) =>
    e.id === endpointId
      ? { ...e, statusCodes: (e.statusCodes ?? []).filter((s) => s.id !== statusCodeId) }
      : e,
  );
  await updateProblemRemote(problemId, { apiEndpoints: updated });
}

// ---- Design Pages -----------------------------------------------------------

export async function createDesignPageRemote(problemId: string, title = 'Design v1'): Promise<string> {
  const now = Date.now();
  const id = newId('dp');
  const pages = await apiFetch<DesignPage[]>(`/problems/${problemId}/design-pages`);
  await apiFetch<DesignPage>(`/problems/${problemId}/design-pages`, {
    method: 'POST',
    body: JSON.stringify({ id, title, order: pages.length, scene: null, createdAt: now, updatedAt: now }),
  });
  return id;
}

export async function updateDesignPageSceneRemote(id: string, scene: unknown): Promise<void> {
  await apiFetch(`/design-pages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ scene }),
  });
}

export async function updateDesignPageNotesRemote(id: string, notes: string): Promise<void> {
  await apiFetch(`/design-pages/${id}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
}

export async function renameDesignPageRemote(id: string, title: string): Promise<void> {
  await apiFetch(`/design-pages/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

export async function deleteDesignPageRemote(id: string): Promise<void> {
  await apiFetch(`/design-pages/${id}`, { method: 'DELETE' });
}

export async function reorderDesignPagesRemote(
  problemId: string,
  orderedIds: string[],
): Promise<void> {
  await apiFetch(`/problems/${problemId}/design-pages/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ ids: orderedIds }),
  });
}

// ---- Deep Dives -------------------------------------------------------------

export async function createDeepDiveRemote(problemId: string): Promise<string> {
  const now = Date.now();
  const id = newId('dd');
  const dives = await apiFetch<DeepDive[]>(`/problems/${problemId}/deep-dives`);
  await apiFetch<DeepDive>(`/problems/${problemId}/deep-dives`, {
    method: 'POST',
    body: JSON.stringify({
      id, title: '', prompt: '', response: '', notes: '',
      order: dives.length, createdAt: now, updatedAt: now,
    }),
  });
  return id;
}

export async function updateDeepDiveRemote(id: string, changes: Partial<DeepDive>): Promise<void> {
  await apiFetch(`/deep-dives/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export async function deleteDeepDiveRemote(id: string): Promise<void> {
  await apiFetch(`/deep-dives/${id}`, { method: 'DELETE' });
}

export async function reorderDeepDivesRemote(
  problemId: string,
  orderedIds: string[],
): Promise<void> {
  await apiFetch(`/problems/${problemId}/deep-dives/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ ids: orderedIds }),
  });
}

// ---- Data Model Entities ----------------------------------------------------

export async function createDataModelEntityRemote(problemId: string): Promise<string> {
  const now = Date.now();
  const id = newId('dme');
  const entities = await apiFetch<DataModelEntity[]>(`/problems/${problemId}/data-model-entities`);
  await apiFetch<DataModelEntity>(`/problems/${problemId}/data-model-entities`, {
    method: 'POST',
    body: JSON.stringify({
      id, name: '', description: '', fields: [],
      order: entities.length, createdAt: now, updatedAt: now,
    }),
  });
  return id;
}

export async function updateDataModelEntityRemote(
  id: string,
  changes: Partial<DataModelEntity>,
): Promise<void> {
  await apiFetch(`/data-model-entities/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export async function deleteDataModelEntityRemote(id: string): Promise<void> {
  await apiFetch(`/data-model-entities/${id}`, { method: 'DELETE' });
}

export async function reorderDataModelEntitiesRemote(
  problemId: string,
  orderedIds: string[],
): Promise<void> {
  await apiFetch(`/problems/${problemId}/data-model-entities/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ ids: orderedIds }),
  });
}

export async function addEntityFieldRemote(entityId: string): Promise<string> {
  const fieldId = newId('fld');
  const entity = await apiFetch<DataModelEntity>(`/data-model-entities/${entityId}`);
  const updated = [
    ...entity.fields,
    { id: fieldId, name: '', type: 'string', isPK: false, isFK: false, isRequired: false, notes: '' },
  ];
  await updateDataModelEntityRemote(entityId, { fields: updated });
  return fieldId;
}

export async function updateEntityFieldRemote(
  entityId: string,
  fieldId: string,
  changes: Partial<DataModelEntity['fields'][number]>,
): Promise<void> {
  const entity = await apiFetch<DataModelEntity>(`/data-model-entities/${entityId}`);
  const updated = entity.fields.map((f) => (f.id === fieldId ? { ...f, ...changes } : f));
  await updateDataModelEntityRemote(entityId, { fields: updated });
}

export async function deleteEntityFieldRemote(entityId: string, fieldId: string): Promise<void> {
  const entity = await apiFetch<DataModelEntity>(`/data-model-entities/${entityId}`);
  await updateDataModelEntityRemote(entityId, {
    fields: entity.fields.filter((f) => f.id !== fieldId),
  });
}

export async function reorderEntityFieldsRemote(
  entityId: string,
  orderedIds: string[],
): Promise<void> {
  const entity = await apiFetch<DataModelEntity>(`/data-model-entities/${entityId}`);
  const byId = new Map(entity.fields.map((f) => [f.id, f]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as DataModelEntity['fields'];
  await updateDataModelEntityRemote(entityId, { fields: reordered });
}
