import 'dotenv/config';
import postgres from 'postgres';

export const sql = postgres(process.env.DATABASE_URL!, {
  transform: postgres.camel,
  max: 10,
  idle_timeout: 30,
  // Parse BIGINT (OID 20) as JS number — safe for epoch timestamps which fit in MAX_SAFE_INTEGER
  types: {
    bigint: {
      to: 20,
      from: [20],
      serialize: (x: bigint | number | string) => String(x),
      parse: (x: string) => Number(x),
    },
  },
});

// Run this once at startup to create tables if they don't exist yet.
/** Cast unknown body values to the JSONValue type postgres.js requires for sql.json(). */
export function jv(v: unknown): Parameters<typeof sql.json>[0] {
  return v as Parameters<typeof sql.json>[0];
}

export async function initDb(): Promise<void> {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      email        TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at   BIGINT NOT NULL,
      updated_at   BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS problems (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title               TEXT NOT NULL DEFAULT 'Untitled Problem',
      description         TEXT NOT NULL DEFAULT '',
      constraints         TEXT NOT NULL DEFAULT '',
      notes               TEXT NOT NULL DEFAULT '',
      difficulty          TEXT NOT NULL DEFAULT '',
      completed           BOOLEAN NOT NULL DEFAULT FALSE,
      functional_reqs     JSONB NOT NULL DEFAULT '[]',
      non_functional_reqs JSONB NOT NULL DEFAULT '[]',
      api_endpoints       JSONB NOT NULL DEFAULT '[]',
      er_diagram_scene    TEXT,
      created_at          BIGINT NOT NULL,
      updated_at          BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS problems_user_updated
      ON problems(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS design_pages (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id  TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      title       TEXT NOT NULL DEFAULT 'Design v1',
      "order"     INTEGER NOT NULL DEFAULT 0,
      scene       TEXT,
      notes       TEXT,
      created_at  BIGINT NOT NULL,
      updated_at  BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS design_pages_problem
      ON design_pages(problem_id, "order");

    CREATE TABLE IF NOT EXISTS deep_dives (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id  TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      title       TEXT NOT NULL DEFAULT '',
      prompt      TEXT NOT NULL DEFAULT '',
      response    TEXT NOT NULL DEFAULT '',
      notes       TEXT NOT NULL DEFAULT '',
      "order"     INTEGER NOT NULL DEFAULT 0,
      created_at  BIGINT NOT NULL,
      updated_at  BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS deep_dives_problem
      ON deep_dives(problem_id, "order");

    CREATE TABLE IF NOT EXISTS data_model_entities (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id  TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      name        TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      fields      JSONB NOT NULL DEFAULT '[]',
      "order"     INTEGER NOT NULL DEFAULT 0,
      created_at  BIGINT NOT NULL,
      updated_at  BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS data_model_entities_problem
      ON data_model_entities(problem_id, "order");
  `);
}
