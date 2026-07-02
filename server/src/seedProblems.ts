import { randomUUID } from 'crypto';
import { sql, jv } from './db.js';

function uid(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function req(text: string) {
  return { id: uid('req'), text };
}

interface ProblemTemplate {
  title: string;
  description: string;
  difficulty: string;
  constraints: string;
  functionalReqs: { id: string; text: string }[];
  nonFunctionalReqs: { id: string; text: string }[];
}

function templates(): ProblemTemplate[] {
  return [
    // ── Junior ───────────────────────────────────────────────────────────────
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

    // ── Mid-Level ─────────────────────────────────────────────────────────────
    {
      title: 'Design a URL Shortener',
      description:
        'Design a service like bit.ly that converts any long URL into a compact short link. When a user visits the short link they are immediately redirected to the original URL. The service should also track basic analytics on each link.',
      difficulty: 'Mid-Level',
      constraints:
        '100 M new URLs created per month\n10 B redirects per month (reads >> writes, ~100:1)\nShort codes are 7 characters, globally unique\nLinks expire after 1 year by default; custom TTLs allowed\nCustom aliases up to 16 characters\nAnalytics: click count + top-5 countries per link',
      functionalReqs: [
        req('Given a long URL, return a unique 7-character short code'),
        req('Redirect a short code to its original URL with HTTP 301/302'),
        req('Allow users to specify a custom alias instead of a generated code'),
        req('Allow users to set an optional expiry date/time for a link'),
        req('Return 404 for expired or non-existent short codes'),
        req('Provide per-link click analytics (total clicks, top countries)'),
      ],
      nonFunctionalReqs: [
        req('Redirect latency < 10 ms at P99 (reads must be extremely fast)'),
        req('Write latency < 200 ms at P99 for link creation'),
        req('99.99% availability — a broken short link is a hard failure for the customer'),
        req('Short codes must be collision-free and unguessable (no sequential IDs)'),
        req('Scale reads horizontally without downtime'),
        req('Analytics writes can be eventually consistent (up to 1 min lag is fine)'),
      ],
    },

    {
      title: 'Design Twitter / X Home Timeline',
      description:
        'Design the core feed system for a Twitter-like social platform. Users post short messages ("tweets"), follow other users, and see a chronological-ish "home timeline" of tweets from people they follow. Focus on timeline generation, fan-out, and delivery at scale.',
      difficulty: 'Senior',
      constraints:
        '300 M monthly active users; 100 M DAU\n400 M tweets posted per day\nAverage user follows 300 accounts\n"Celebrity" accounts can have 50 M+ followers (fan-out hotspot)\nTimeline shows most-recent 800 tweets from followed accounts\nSystem must handle peak traffic around live events (sports finals, elections)',
      functionalReqs: [
        req('Users can post a tweet (text ≤ 280 chars, optional media)'),
        req('Users can follow and unfollow other users'),
        req('Home timeline returns a merged, reverse-chronological feed of followed users\' tweets'),
        req('Timeline supports cursor-based pagination (load-more)'),
        req('Users can like and retweet; counts are visible on each tweet'),
        req('Timeline is eventually consistent — slight delay after posting is acceptable'),
      ],
      nonFunctionalReqs: [
        req('Timeline read latency < 200 ms at P99'),
        req('New tweets should appear in most followers\' timelines within 5 seconds'),
        req('99.99% read availability; writes can degrade gracefully under extreme load'),
        req('Fan-out strategy must handle celebrity accounts (50 M+ followers) without hotspots'),
        req('System must sustain a 10× traffic spike for at least 30 minutes'),
        req('Store tweets and media durably; no data loss once a write is acknowledged'),
      ],
    },

    {
      title: 'Design a Code Submission & Judging Platform',
      description:
        'Design the backend for a competitive programming platform like LeetCode. Users write solutions in their browser, submit them, and receive a verdict (Accepted, Wrong Answer, Time Limit Exceeded, etc.) within seconds. The system runs untrusted code in isolation.',
      difficulty: 'Senior',
      constraints:
        '5 M registered users; 1 M submissions per day\nPeak burst: 20 000 submissions/min during live contests\nSupport at least 10 programming languages (Python, Java, C++, Go, …)\nTime limit: 1–5 s per test case; Memory limit: 256 MB\nEach problem has up to 200 hidden test cases\nCode execution environment must be fully sandboxed (no network, no filesystem writes)',
      functionalReqs: [
        req('Users can submit code for a problem and receive a verdict within 10 s'),
        req('Each submission is run against all hidden test cases; first failure short-circuits'),
        req('Support Python, Java, C++, JavaScript, Go, and at least 5 other languages'),
        req('Show per-submission stats: runtime (ms), memory used (MB), test case passed/total'),
        req('Users can view their own past submissions and diff any two'),
        req('Live contest leaderboard updates in real time as verdicts are issued'),
      ],
      nonFunctionalReqs: [
        req('End-to-end verdict latency < 10 s at P95 under normal load'),
        req('Sandbox must prevent any form of host system access or inter-user data leakage'),
        req('Judge workers are stateless and horizontally scalable; spin up within 60 s'),
        req('99.9% availability for submission intake; judge queue may back up but never loses submissions'),
        req('System must handle 20× normal submission rate for 15 min (contest burst)'),
        req('All submitted code and verdicts stored durably for auditing'),
      ],
    },

    {
      title: 'Design a Webhook Delivery Service',
      description:
        'Design a reliable webhook delivery system (like Svix or Stripe\'s webhook engine) that allows SaaS platforms to notify customer servers when events occur. The service receives an event internally, fans it out to all registered endpoints for that event type, and retries on failure.',
      difficulty: 'Mid-Level',
      constraints:
        '50 000 tenant organisations, each registering up to 20 webhook endpoints\n500 M webhook attempts per day at peak\nMessage payload up to 64 KB\nAt-least-once delivery guarantee\nRetry schedule: immediate, 30 s, 5 min, 30 min, 2 h, 8 h, 24 h (7 attempts total)\nEndpoints must respond within 30 s or the attempt is marked as failed',
      functionalReqs: [
        req('Tenants can register, update, and delete webhook endpoints (URL + secret)'),
        req('Tenants can subscribe an endpoint to one or more event types'),
        req('When an event fires, deliver the signed payload to all matching endpoints'),
        req('Retry failed deliveries on an exponential back-off schedule (up to 7 attempts)'),
        req('Provide a delivery log per endpoint: status, attempts, response codes, latency'),
        req('Tenants can manually replay any delivery from the last 72 hours'),
      ],
      nonFunctionalReqs: [
        req('First delivery attempt within 1 second of event ingestion at P95'),
        req('At-least-once delivery: no event is silently dropped even if a worker crashes mid-flight'),
        req('Throughput: sustain 500 M attempts/day (≈ 6 000/s) without manual intervention'),
        req('Tenant isolation: one noisy tenant (millions of events/min) must not delay others'),
        req('Delivery log retention: 30 days'),
        req('Signing HMAC must be verified server-side; expose verification SDK for customers'),
      ],
    },

    {
      title: 'Design a Distributed Rate Limiter',
      description:
        'Design a rate-limiting service that API gateways and microservices can call synchronously to decide whether to allow or reject an incoming request. The limiter must enforce per-user, per-endpoint quotas accurately across a horizontally scaled fleet.',
      difficulty: 'Mid-Level',
      constraints:
        'Clients check the limiter on every API call (hundreds of thousands of decisions/s)\nSupport multiple algorithms: fixed window, sliding window log, token bucket\nQuotas defined per (user, endpoint) pair; some users have custom quota overrides\nDecision latency budget: < 2 ms added to request path\nClusters of 50–200 limiter nodes; no single master\nRedis cluster available as shared state store',
      functionalReqs: [
        req('Given (user_id, endpoint, quota_config), return ALLOW or DENY with remaining quota'),
        req('Support fixed-window, sliding-window, and token-bucket algorithms'),
        req('Quota rules can be updated at runtime without restarting nodes'),
        req('Return standard rate-limit headers (X-RateLimit-Limit, Remaining, Reset)'),
        req('Admin API to view current quota usage per user and temporarily unblock a user'),
        req('Support burst allowance: a user may briefly exceed rate by N% for up to T seconds'),
      ],
      nonFunctionalReqs: [
        req('Decision latency < 2 ms at P99 (must not meaningfully slow the request path)'),
        req('Accuracy: allow/deny counts correct to within 0.1% even under concurrent traffic'),
        req('Nodes are stateless except for Redis; any node handles any request'),
        req('Graceful degradation: if Redis is unreachable, fail open (allow requests) with alerting'),
        req('No single point of failure; lose up to 1/3 of nodes without correctness impact'),
        req('Support 500 K quota check calls per second across the fleet'),
      ],
    },

    {
      title: 'Design a Real-Time Chat System',
      description:
        'Design the messaging backbone for a workplace chat tool like Slack. Users send messages in channels and DMs, see who is online, and receive messages instantly on all their connected devices. Focus on message delivery, presence, and message history.',
      difficulty: 'Senior',
      constraints:
        '10 M organisations; average org has 200 members and 50 channels\n50 M DAU; 5 B messages sent per day\nMessages up to 4 000 characters + attachments up to 1 GB (file links, not inline)\nA user may be connected from up to 5 devices simultaneously\nMessage history must be searchable full-text; retain for the life of the workspace\nPresence state updates (online/away/offline) must propagate within 3 s',
      functionalReqs: [
        req('Users can send and receive messages in channels and 1:1 / group DMs'),
        req('Messages are delivered to all online recipients in real time (< 300 ms)'),
        req('Offline recipients receive missed messages on next connection (persistent delivery)'),
        req('Users see online/away/offline presence for workspace members'),
        req('Full-text search over message history within a workspace'),
        req('Users can edit and delete their own messages; edits are visible to all participants'),
      ],
      nonFunctionalReqs: [
        req('Message delivery latency < 300 ms at P99 for online recipients'),
        req('Presence updates propagate to relevant users within 3 s'),
        req('System maintains correct message ordering within a channel (no reordering on retry)'),
        req('99.99% availability for message sending; search can have slightly lower SLA'),
        req('All messages stored durably with at-least-once delivery to persistent storage'),
        req('Horizontal scaling: adding nodes must increase throughput linearly'),
      ],
    },

    {
      title: 'Design a Multi-Channel Notification Service',
      description:
        'Design a centralised notification service that product teams can call to deliver user-facing alerts via push (iOS/Android), email, in-app, and SMS. The service handles routing, templating, user preferences, deduplication, and delivery tracking.',
      difficulty: 'Mid-Level',
      constraints:
        '1 B notifications sent per day across all channels\nChannels: push notification (FCM/APNs), email (SMTP/SES), in-app (WebSocket), SMS (Twilio)\nUsers can set per-channel, per-category preferences ("mute marketing emails but keep security alerts")\nSome notifications are transactional (password reset) and must not be suppressed\nDuplicate suppression: same (user, event_type, idempotency_key) within 1 hour should not re-send\nGlobal user base: must respect timezone for digest/batch notifications',
      functionalReqs: [
        req('Producers call a single API with (user_id, event_type, payload) to trigger a notification'),
        req('Route to the correct channel(s) based on user preference and event priority'),
        req('Render message from a template + payload variables (title, body, CTA)'),
        req('Suppress duplicate notifications using an idempotency key within a configurable window'),
        req('Users can update their notification preferences; changes take effect on next send'),
        req('Track delivery status per notification: queued, sent, delivered, failed, bounced'),
      ],
      nonFunctionalReqs: [
        req('Transactional notifications (OTP, password reset) delivered within 3 s at P95'),
        req('Marketing/batch notifications can be delayed up to 1 hour to respect quiet hours'),
        req('System must handle 50× burst (product-wide announcements) without dropping messages'),
        req('At-least-once delivery; idempotency prevents duplicates on retry'),
        req('Preference changes must be honoured within 5 s of update'),
        req('99.9% uptime; partial channel failure (SMS provider down) must not block email delivery'),
      ],
    },

    {
      title: 'Design an AI Inference API Gateway',
      description:
        'Design the API layer for a large-language-model inference service, similar to the Anthropic or OpenAI API. The gateway sits between external developers and a fleet of GPU inference workers. It handles authentication, routing, streaming, rate limiting, billing, and observability.',
      difficulty: 'Senior',
      constraints:
        '500 K developer accounts; top customers send 10 M tokens/min\nModels range from 8B to 400B parameters; inference can take 1–120 s per request\nResponse streaming via Server-Sent Events (first token must appear < 500 ms)\nBilling is per-token; per-account and per-organisation quota enforcement\nFleet of 1 000+ GPU workers across multiple regions; workers go in/out of rotation\nRequests can be up to 200 K input tokens; responses up to 8 K output tokens',
      functionalReqs: [
        req('Authenticate API keys; associate each key with an account, model access list, and quota'),
        req('Route each request to an available worker that supports the requested model'),
        req('Stream response tokens back to the client as they are generated (SSE)'),
        req('Enforce per-account rate limits (requests/min, tokens/min) and return 429 on breach'),
        req('Record token usage per request and expose a billing/usage dashboard API'),
        req('Support graceful model version upgrades with zero-downtime routing cutover'),
      ],
      nonFunctionalReqs: [
        req('Time-to-first-token < 500 ms at P95 for small prompts on available models'),
        req('Gateway overhead (excluding inference) < 20 ms per request'),
        req('Billing records must be durable; no token usage can be silently dropped'),
        req('Fault tolerance: lose up to 20% of workers without increasing user-visible error rate above 0.1%'),
        req('Rate-limit decisions are globally consistent across all gateway nodes within 100 ms'),
        req('Full request/response logging for safety, compliance, and debugging (with retention policy)'),
      ],
    },
  ];
}

export async function seedProblemsForUser(userId: string): Promise<void> {
  const now = Date.now();
  const items = templates();

  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    const id = uid('prob');
    await sql`
      INSERT INTO problems (
        id, user_id, title, description, constraints, notes, difficulty, completed,
        functional_reqs, non_functional_reqs, api_endpoints, er_diagram_scene,
        created_at, updated_at
      ) VALUES (
        ${id}, ${userId},
        ${p.title}, ${p.description}, ${p.constraints}, ${''},
        ${p.difficulty}, ${false},
        ${sql.json(jv(p.functionalReqs))},
        ${sql.json(jv(p.nonFunctionalReqs))},
        ${sql.json(jv([]))},
        ${null},
        ${now - (items.length - i) * 1000},
        ${now - (items.length - i) * 1000}
      )
    `;
  }
}
