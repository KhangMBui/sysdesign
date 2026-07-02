/**
 * One-time migration: add the 3 Junior-level seed problems to all existing users
 * who don't already have them.
 *
 * Run with:  tsx server/src/add-junior-problems.ts
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { sql, jv } from './db.js';

function uid(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function req(text: string) {
  return { id: uid('req'), text };
}

const JUNIOR_PROBLEMS = [
  {
    title: 'Design a Pastebin',
    description:
      'Design a service like Pastebin.com that lets anyone paste a block of text, receive a short link, and share it. No accounts required. Pastes are public by default and expire automatically after a configurable TTL.',
    difficulty: 'Junior',
    constraints:
      '10 M pastes created per month\n1 B paste views per month (read-heavy, ~100:1)\nPaste size up to 512 KB of plain text\nDefault TTL 30 days; user can choose 1 h / 1 day / 1 week / 1 month / never\nShort key: 8 random alphanumeric characters\nNo user accounts required (anonymous use)',
    functionalReqs: [
      req('Users can submit text and receive a unique short URL'),
      req('Anyone with the short URL can view the paste content'),
      req('Pastes expire after the chosen TTL and return 404 after expiry'),
      req('Users can optionally set a title and syntax-highlight language for the paste'),
      req('Users can delete their own paste via a private delete token returned at creation'),
      req('View count is tracked and displayed on each paste'),
    ],
    nonFunctionalReqs: [
      req('Paste read latency < 50 ms at P99 (serve from cache when possible)'),
      req('Paste creation latency < 300 ms at P99'),
      req('99.9% availability — a broken link is a user-visible failure'),
      req('Short keys must be collision-free and hard to enumerate sequentially'),
      req('Expired pastes are cleaned up within 1 hour of their TTL'),
      req('Scale reads horizontally; storage cost stays proportional to active pastes'),
    ],
  },
  {
    title: 'Design a Leaderboard Service',
    description:
      'Design a real-time leaderboard for a mobile or web game that tracks player scores, shows a global top-100 ranking, and lets any player query their own rank at any time. Scores are updated frequently as players complete game rounds.',
    difficulty: 'Junior',
    constraints:
      '5 M registered players\nUp to 10 000 score submissions per second at peak (end-of-level events)\nLeaderboard displays top 100 players with rank, username, and score\n"My rank" query: return the calling player\'s rank among all players\nLeaderboard must reflect new scores within 5 seconds\nRankings are global (single leaderboard, not per-region)',
    functionalReqs: [
      req('Submit a new score for a player; keep only their personal best'),
      req('Return the global top-100 leaderboard with rank, username, and score'),
      req('Return a specific player\'s current rank and score'),
      req('Return the players ranked immediately above and below a given player ("neighbours")'),
      req('Support paginated leaderboard pages beyond the top 100'),
      req('Admin endpoint to reset the leaderboard for a new season'),
    ],
    nonFunctionalReqs: [
      req('Top-100 read latency < 20 ms at P99 (served from in-memory data structure)'),
      req('Score write latency < 100 ms at P99'),
      req('Rankings reflect score updates within 5 seconds'),
      req('Handle burst of 10 000 writes/sec without losing any submission'),
      req('99.9% availability for reads; brief write degradation acceptable under extreme burst'),
      req('Rank calculation is consistent — two players with identical scores receive the same rank'),
    ],
  },
  {
    title: 'Design a Simple Key-Value Store',
    description:
      'Design a distributed in-memory key-value store similar to Redis. Clients can set, get, and delete string keys with optional TTLs. The store is accessed over TCP by multiple application servers and must survive single-node failures without data loss.',
    difficulty: 'Junior',
    constraints:
      'Dataset fits in memory of a small cluster (< 100 GB total)\nOperations: GET, SET (with optional EX seconds), DEL, EXISTS, TTL\nString keys up to 256 bytes; values up to 1 MB\nUp to 100 000 operations per second across the cluster\nAt least 2 replicas per key for durability\nClients use a simple text protocol (one command per line)',
    functionalReqs: [
      req('GET key — return the value or a null marker if missing or expired'),
      req('SET key value [EX seconds] — store the value; overwrite if key exists'),
      req('DEL key — remove the key; no-op if missing'),
      req('EXISTS key — return 1 if key exists and is not expired, 0 otherwise'),
      req('TTL key — return remaining seconds to live, -1 if no TTL, -2 if missing'),
      req('Keys expire automatically after their TTL without client involvement'),
    ],
    nonFunctionalReqs: [
      req('Operation latency < 1 ms at P99 for cache-hit reads'),
      req('Durability: a SET acknowledged to the client must survive a single node failure'),
      req('Expired keys are evicted within 1 second of their TTL (lazy + background sweep)'),
      req('Memory usage stays proportional to live keys; expired keys do not leak memory'),
      req('Cluster can be expanded by adding nodes with no downtime'),
      req('99.99% availability for GET/SET; brief unavailability during leader election is acceptable'),
    ],
  },
];

async function main() {
  const users = await sql<{ id: string }[]>`SELECT id FROM users`;
  console.log(`Found ${users.length} user(s).`);

  for (const user of users) {
    const existing = await sql<{ title: string }[]>`
      SELECT title FROM problems WHERE user_id = ${user.id} AND difficulty = 'Junior'
    `;
    const existingTitles = new Set(existing.map((r) => r.title));

    const toAdd = JUNIOR_PROBLEMS.filter((p) => !existingTitles.has(p.title));
    if (toAdd.length === 0) {
      console.log(`  ${user.id}: already has all Junior problems, skipping.`);
      continue;
    }

    const now = Date.now();
    for (let i = 0; i < toAdd.length; i++) {
      const p = toAdd[i];
      const id = uid('prob');
      await sql`
        INSERT INTO problems (
          id, user_id, title, description, constraints, notes, difficulty, completed,
          functional_reqs, non_functional_reqs, api_endpoints, er_diagram_scene,
          created_at, updated_at
        ) VALUES (
          ${id}, ${user.id},
          ${p.title}, ${p.description}, ${p.constraints}, ${''},
          ${p.difficulty}, ${false},
          ${sql.json(jv(p.functionalReqs))},
          ${sql.json(jv(p.nonFunctionalReqs))},
          ${sql.json(jv([]))},
          ${null},
          ${now - (toAdd.length - i) * 1000},
          ${now - (toAdd.length - i) * 1000}
        )
      `;
      console.log(`  ${user.id}: added "${p.title}"`);
    }
  }

  console.log('Done.');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
