// One-time migration: fix JSONB columns that were stored as JSONB strings
// (caused by passing JSON.stringify'd strings; now fixed to use sql.json())
import { sql } from './src/db.js';

// For each JSONB column, if the stored value is a JSONB string type
// (i.e. the JSON text was double-encoded), extract the raw text and re-parse.
const tables = [
  { table: 'problems', cols: ['functional_reqs', 'non_functional_reqs', 'api_endpoints'] },
  { table: 'data_model_entities', cols: ['fields'] },
] as const;

for (const { table, cols } of tables) {
  for (const col of cols) {
    const result = await sql.unsafe(`
      UPDATE ${table}
      SET ${col} = (${col} #>> '{}')::jsonb
      WHERE jsonb_typeof(${col}) = 'string'
    `);
    console.log(`Fixed ${table}.${col}: ${result.count} rows updated`);
  }
}

await sql.end();
process.exit(0);
