import { sql } from "./src/db.js";
import { seedProblemsForUser } from "./src/seedProblems.js";

const rows = await sql<
  { id: string; email: string }[]
>`SELECT id, email FROM users`;
console.log("Users in DB:", rows.map((r) => r.email).join(", ") || "(none)");

for (const user of rows) {
  const [{ cnt }] = await sql<{ cnt: number }[]>`
    SELECT count(*)::int AS cnt FROM problems WHERE user_id = ${user.id}
  `;
  if (cnt === 0) {
    await seedProblemsForUser(user.id);
    console.log(`Seeded 8 problems for ${user.email}`);
  } else {
    console.log(`${user.email} already has ${cnt} problems — skipped`);
  }
}

await sql.end();
process.exit(0);
