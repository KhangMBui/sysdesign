import Dexie, { type Table } from 'dexie';
import type { Problem, DesignPage, DeepDive, DataModelEntity } from './types';

// Local-first storage. Everything is persisted in the browser's IndexedDB
// via Dexie. No server, no network — data stays on this machine.
export class AppDatabase extends Dexie {
  problems!: Table<Problem, string>;
  designPages!: Table<DesignPage, string>;
  deepDives!: Table<DeepDive, string>;
  dataModelEntities!: Table<DataModelEntity, string>;

  constructor() {
    super('sysdesign-practice');
    // Only indexed fields are listed here. Non-indexed fields are still
    // stored — Dexie persists the whole object.
    this.version(1).stores({
      problems: 'id, title, updatedAt, completed',
      designPages: 'id, problemId, order',
      deepDives: 'id, problemId, order',
    });
    this.version(2).stores({
      dataModelEntities: 'id, problemId, order',
    });
  }
}

export const db = new AppDatabase();
