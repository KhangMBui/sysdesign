// Core data model for the system design practice app.
// Small, always-loaded lists (requirements, API endpoints) are embedded
// inside the Problem record. Larger / independently-listed data
// (design canvas pages, deep dives) live in their own tables.

export type Difficulty = '' | 'Junior' | 'Mid-Level' | 'Senior';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Requirement {
  id: string;
  text: string;
}

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  requestBody: string;
  responseBody: string;
  auth: string;
  notes: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  constraints: string;
  notes: string;
  difficulty: Difficulty;
  completed: boolean;
  functionalReqs: Requirement[];
  nonFunctionalReqs: Requirement[];
  apiEndpoints: ApiEndpoint[];
  createdAt: number;
  updatedAt: number;
}

// Excalidraw scene payload. Kept as `unknown` at the type level so we
// don't couple the data layer to Excalidraw's evolving types; the canvas
// section casts it when loading/saving. (Added in a later build step.)
export interface DesignPage {
  id: string;
  problemId: string;
  title: string;
  order: number;
  scene: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface DeepDive {
  id: string;
  problemId: string;
  title: string;
  prompt: string;
  response: string;
  notes: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}
