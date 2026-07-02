import { sql } from './src/db.js';

const rows = await sql<{ title: string; functionalReqs: unknown; freqsType: string }[]>`
  SELECT title, functional_reqs, jsonb_typeof(functional_reqs) AS freqs_type
  FROM problems LIMIT 2
`;

for (const r of rows) {
  console.log('--- title:', r.title);
  console.log('  freqs_type (in DB):', r.freqsType);
  console.log('  JS typeof:', typeof r.functionalReqs);
  console.log('  isArray:', Array.isArray(r.functionalReqs));
  const s = JSON.stringify(r.functionalReqs);
  console.log('  value:', s.substring(0, 150));
}

await sql.end();
process.exit(0);
