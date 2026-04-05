# Create Detailed Project Tasks (Notion)

Epics: Project Initialization (../Dwh%20Project/Project%20Initialization%20aca379c3555d8375819a018e10757b04.md)
Status: Yes

# Backend — Implementation Guide

This note describes the exact order and method for building the working backend from the schemas, flow diagrams, and API mocks produced in this planning phase. No frontend work is covered here.

---

## Phase 0 — Environment setup

Install these tools before writing any code: Node.js 20 LTS, pnpm, Docker Desktop, and the Doppler CLI or any secrets manager of your choice.

Create the project directory and initialise:

```bash
mkdir studley-backend && cd studley-backend
pnpm init
pnpm add -D typescript tsx @types/node vitest @vitest/coverage-v8
npx tsc --init
```

Copy the `tsconfig.json` and `tsconfig.build.json` targets from the project structure. Set `moduleResolution` to `bundler`, `module` to `ESNext`, `target` to `ES2022`, and `outDir` to `dist`. Enable `strict`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`.

Start Docker and bring up the infrastructure:

```bash
docker compose up postgres redis -d
```

Verify pgvector is available by connecting to Postgres and running `SELECT * FROM pg_available_extensions WHERE name = 'vector'`.

---

## Phase 1 — Database schema and migrations

Install Drizzle:

```bash
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
```

Create `drizzle.config.ts` pointing to your `DATABASE_URL` and your `src/db/schema` directory.

Implement the schema files in this exact order because of foreign key dependencies:

1. `auth.schema.ts` — no dependencies
2. `billing.schema.ts` — references users
3. `ledger.schema.ts` — references users and subscriptions
4. `resources.schema.ts` — references users. The `document_chunks` table requires a `VECTOR(1536)` column. Drizzle does not have a native vector type. Define it as a custom column: `customType<{ data: number[]; driverData: string }>` with `dataType: () => 'vector(1536)'`, `toDriver: (v) => JSON.stringify(v)`, `fromDriver: (v) => JSON.parse(v)`.
5. `ai.schema.ts` — references documents and bullmq_jobs
6. `admin.schema.ts` — references users and documents
7. `workers.schema.ts` — references users and study_set_batches

After all schema files are written, run:

```bash
pnpm db:generate
pnpm db:migrate
```

Check the generated SQL in `drizzle/` to verify the `vector(1536)` column and the `pgvector` extension migration are correct.

Seed model configs immediately after migration. The system cannot generate study sets without rows in `model_config`. Seed at least one active config per task type pointing to a real provider. Seed one active prompt template per task type.

---

## Phase 2 — Core infrastructure files

Implement in this order:

`src/config/env.schema.ts` — Zod schema that validates all environment variables. Call this at the very top of `src/config/index.ts` so a bad `.env` crashes the process immediately with a clear error before any server code runs.

`src/config/redis.ts` — Create the Redis client using `ioredis`. Export a single singleton. Set `lazyConnect: false` and `maxRetriesPerRequest: null` — the second option is required by BullMQ.

`src/config/firebase.ts` — Initialise Firebase Admin SDK using `initializeApp` with service account credentials from env vars. Export the `auth()` instance used by the JWT middleware.

`src/config/r2.ts` — Initialise an S3-compatible client using `@aws-sdk/client-s3`. Point the endpoint to `https://{account_id}.r2.cloudflarestorage.com`. Export the client and bucket name.

`src/utils/logger.ts` — Create a pino instance with `level: process.env.LOG_LEVEL`. In development set `transport: { target: 'pino-pretty' }`.

`src/lib/errors.ts` — Define `AppError extends Error` with `code: string`, `statusCode: number`, `details?: unknown`. Define typed error factories: `notFound()`, `unauthorized()`, `forbidden()`, `insufficientCredits()`, `documentNotReady()`, and so on.

---

## Phase 3 — Middleware

Implement each middleware as a Fastify `preHandler` hook function.

`auth.middleware.ts` — Extract the Bearer token, call `firebaseAdmin.auth().verifyIdToken(token)`. On failure throw `AppError` with 401. Attach `{ uid, email }` to `request.user`.

`hydrate.middleware.ts` — Use the `uid` from the previous middleware. Check Redis for `session_cache:{uid}`. If present, parse and attach to `request.user`. If not, query Postgres for the user with their subscription and compute token balance with `SELECT SUM(amount) FROM token_ledger WHERE user_id = ?`. Write the result to Redis with a 300 second TTL. If the user row does not exist in Postgres, throw 403 — this means Firebase auth succeeded but the user never completed registration.

`quota.middleware.ts` — This middleware does not run globally. It is attached only to routes that trigger AI calls. Read `request.user.tokenBalance`. If below the minimum threshold for the requested task types (looked up from `model_config.estimatedCreditCost`), throw `insufficientCredits()`.

`rate-limit.middleware.ts` — Use a Redis sliding window. Key: `rate:{userId}:{window_minute}`. Increment on each request. If count exceeds `RATE_LIMIT_MAX_REQUESTS`, throw 429.

`error-handler.ts` — Register with `app.setErrorHandler`. If the error is an `AppError`, return `{ error: { code, message, details } }` with the correct status. If it is an unhandled error, log it with pino, return 500 with a generic message and do not expose the stack trace.

---

## Phase 4 — Route modules

Implement route modules in this order. Each module contains routes, controller, service, and schema files.

**auth** — Register first. The register route does not use hydrate middleware since the user may not exist in Postgres yet. Session route uses auth + hydrate.

**upload** — Requires `@fastify/multipart`. The PDF route streams the file into memory (or a temp file), passes it to the virus scanner, then to the text extractor. Never store the raw file buffer in a Postgres column — always go through R2 first.

**documents** — Simple CRUD. Delete must clean up R2 objects, document chunks, output cache entries, and any associated study set outputs.

**study-sets** — The generate route is the most complex. The transaction that inserts `debit_pending` ledger rows and `bullmq_jobs` rows must be wrapped in a Postgres transaction block. If the BullMQ enqueue step fails after the Postgres insert, roll back the entire transaction. This prevents ghost ledger entries.

**outputs** — The streaming route (`/notes/stream`) must set `reply.raw` headers and bypass Fastify's serialiser. Use `reply.hijack()` to take control of the raw Node.js response. Do not use `reply.send()` on a hijacked response.

**grader, solve, credits, payments** — Implement after study sets since they share the same patterns.

**admin** — Implement last. Apply the admin middleware to all routes in this module using `app.addHook('preHandler', adminMiddleware)` scoped to the admin prefix.

---

## Phase 5 — Services

Implement services independently of routes so they can be used by both route handlers and workers.

**LedgerService** — All methods must be idempotent. Every insert into `token_ledger` must use the `idempotency_key` unique constraint. Wrap the insert in a try-catch and silently ignore `unique_violation` errors (Postgres error code `23505`). This means retried workers never double-debit.

**ModelRouter** — Implement non-streaming `generate` first, then add `stream`. The stream method must work with both OpenAI's streaming SDK and Anthropic's streaming SDK since they have different event shapes. Test the stream method against both providers in isolation before integrating with the route.

**RAGService** — The pgvector query uses `<=>` (cosine distance). The Drizzle ORM does not have a built-in operator for this. Use `sql` template tag: `sql`${documentChunks.embedding} <=> ${embeddingVector}::vector``. Test the vector search against real embedded documents before wiring up workers.

**PromptBuilder** — First queries `prompt_templates` for the active template for the task type. If no row exists in the DB, falls back to the hardcoded template file in `services/prompt-builder/templates/`. This fallback prevents production failures if the DB seed was not run.

**StorageService** — Implement `upload`, `delete`, and `getSignedUrl`. For signed URLs use `@aws-sdk/s3-request-presigner` with `GetObjectCommand`. The TTL on podcast signed URLs should be 1 hour. Always use the R2 path (key) as the canonical reference — never construct URLs manually.

---

## Phase 6 — WebSocket server

Install `@fastify/websocket`. Register the plugin in `app.ts`.

The WebSocket architecture uses Redis pub/sub to decouple workers from the API server. Workers publish to `ws:batch:{batch_id}`. The WS server subscribes on connection open and unsubscribes on connection close.

Use `ioredis` in subscriber mode — a separate Redis connection from the main connection pool since subscriber connections cannot issue commands. Create this in `ws.server.ts` and do not reuse the main Redis singleton for subscriptions.

The ephemeral WS token returned in the `202` response is a short-lived JWT signed with a separate secret (`WS_TOKEN_SECRET` in env). It encodes `{ batchId, userId, exp: now + 3600 }`. Verify it on WebSocket connection open before subscribing the connection to the batch channel.

---

## Phase 7 — Workers

Workers run as separate processes. Implement `base.worker.ts` first and test it in isolation with a mock `process` implementation before building any concrete workers.

The key architectural rule: workers write to Postgres for permanent state and publish to Redis for real-time events. They never hold HTTP connections and never call Fastify route handlers.

Start workers locally using:

```bash
WORKER_TYPE=notes pnpm dev:worker
WORKER_TYPE=embedding pnpm dev:worker
```

Run both the API server and at least the embedding and notes workers simultaneously during development.

The embedding worker must complete successfully before any study set generation jobs will work, because `processingStatus` must be `ready` before the generate route accepts the document.

---

## Phase 8 — Scheduled jobs

The scheduler worker uses BullMQ's repeat functionality. In `scheduler.worker.ts`, on startup, add recurring jobs using `queue.upsertJobScheduler`:

- Monthly credit grant: cron `0 0 1 * *` (midnight on the 1st of each month)
- Nightly balance snapshot: cron `0 2 * * *`
- Session cleanup: cron `0 3 * * *`
- Cache eviction: cron `0 4 * * *`
- Worker stale check: every 2 minutes

Use `upsertJobScheduler` rather than `add` with repeat so that restarting the scheduler worker does not create duplicate scheduled jobs.

---

## Phase 9 — Testing

Run the test suite with:

```bash
pnpm test
pnpm test:coverage
```

The test database must be separate from the development database. Set `DATABASE_URL` in the test environment to a separate database name: `studley_test`. The `tests/setup.ts` runs migrations against this test database before the suite starts.

Unit tests must not hit Postgres or Redis. Mock `src/db/index.js` and `src/config/redis.js` using `vi.mock`. Integration tests hit a real test Postgres instance.

Mock Firebase in all tests using the helper in `tests/helpers/auth.helper.ts`. Never make real Firebase calls in tests.

Mock BullMQ queue `add` calls in integration tests. You do not want workers actually processing during API route tests — instead verify that `bullmq_jobs` rows were inserted in Postgres with the correct payload.

Target 80% line coverage minimum before considering the backend production-ready.

---

## Phase 10 — Production readiness checklist

Before deploying:

- All env vars validated by Zod schema at startup
- Firebase JWT verification using real project credentials
- Stripe webhook signature verification enabled
- `LOG_PRETTY=false` and `LOG_LEVEL=warn` in production
- Each worker type has its own Docker container with resource limits
- Postgres connection pool sized correctly: `min: 2, max: 10` per API instance
- Redis `maxmemory-policy` set to `noeviction` — BullMQ requires this
- R2 CORS policy configured if the mobile or web client will access signed URLs directly
- Stripe webhook endpoint registered in Stripe dashboard pointing to `/api/v1/payments/webhook`
- `pgvector` extension verified present in production Postgres
- Dead letter job monitoring connected to an alert channel (email or Slack via `admin_notifications` table)
- Worker health monitoring: stale worker alert fires if heartbeat is older than 90 seconds