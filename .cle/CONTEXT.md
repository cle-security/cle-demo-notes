# Codebase Context

## Stack and Frameworks

The project is a **pnpm monorepo** (`pnpm-workspace.yaml`) with three packages:

- **`apps/api`** — Fastify 4 HTTP API (Node.js / TypeScript). Uses Prisma 5 ORM with SQLite, argon2 for password hashing, Zod for input validation, `@fastify/cookie` for signed session cookies, and `@fastify/multipart` for file uploads.
- **`apps/web`** — Vue 3 SPA (Vite, Pinia, vue-router). Renders Markdown using `marked` + DOMPurify. No SSR — the app is a pure client-side SPA served from `index.html`.
- **`packages/types`** — Shared TypeScript type definitions (`SessionUser`, `Note`, `NoteListItem`, `ApiError`, etc.).

Runtime: Node.js ≥ 20. Package manager: pnpm 11.

## Entry Points and External Interfaces

**API routes** (all under `/api` prefix):

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/health` | GET | none | Health check |
| `/api/auth/signup` | POST | none | User registration |
| `/api/auth/login` | POST | none | Password login |
| `/api/auth/logout` | POST | session | End session |
| `/api/auth/me` | GET | optional | Current user info |
| `/api/notes` | GET/POST | required | List / create notes |
| `/api/notes/:id` | GET/PUT/DELETE | required (owner for write) | Note CRUD |
| `/api/notes/:id/shares` | POST/DELETE | required (owner) | Share/unshare note |
| `/api/notes/:id/attachment` | POST | required (owner) | Upload attachment |
| `/api/attachments/:id` | GET | required (owner or share recipient) | Download attachment |
| `/api/profile/:username` | GET | none | Public profile |
| `/api/me/profile` | PUT | required | Update own profile |
| `/api/admin/users` | GET | admin | List users |
| `/api/admin/users/:id/disable` | POST | admin | Disable/enable user |

**Web app**: Standard Vue SPA with client-side routing. Vite proxies `/api` → `localhost:3000` in development.

**No other interfaces**: no WebSocket, no GraphQL, no CLI surface, no gRPC, no message queues, no mobile app.

## Authentication and Authorization

- **Authentication**: Email/password credential login stored as argon2id hashes (`apps/api/src/lib/crypto.ts`). Sessions are reference-based (random 256-bit base64url IDs stored in SQLite `Session` table, see `apps/api/src/lib/sessions.ts`). Sessions are signed via `@fastify/cookie` with a `SESSION_SECRET` env var (minimum 32 characters).
- **Session lifetime**: 14-day absolute expiry (`SESSION_TTL_MS` in `sessions.ts`); no inactivity timeout observed.
- **Authorization**: Two roles — `"user"` and `"admin"`. `requireAuth` middleware (at `apps/api/src/middleware/auth.ts`) checks session; `requireAdmin` additionally checks `role === "admin"`. Notes are owned by a user; read-sharing is supported via `NoteShare`. Owners can write/delete; shared users can only read.
- **Admin actions**: List all users, disable/enable user accounts (which also kills all sessions for the disabled user).
- **No MFA**, **no OAuth/OIDC**, **no external identity provider**.

## Data Classes and Baseline-Relevant Features

**Present:**

- **Password authentication** — argon2id hashes, 8–200 char passwords, server-side Zod validation.
- **Session cookies** — `httpOnly: true`, `sameSite: "lax"`, `secure: env.isProd` (false in development), `signed: true`.
- **File uploads** — images (PNG/JPEG/GIF/WEBP) and PDF; max 5 MB default. Stored on local disk with server-generated filenames (`crypto.randomBytes(16).hex + extension`). Path traversal guard in `readUpload`/`deleteUpload`. Content-Disposition header set on download. MIME type allowlist enforced.
- **Markdown rendering** — user-authored note bodies (up to 50 KB) rendered client-side via `marked` → `DOMPurify.sanitize()` → `v-html`.
- **Input validation** — Zod schemas on all API inputs.
- **ORM/parameterized queries** — all database queries via Prisma (parameterized).

**Absent:**

- No GraphQL, WebSocket, SSE, or real-time transport.
- No LDAP, XPath, XML parsing, or LaTeX processing.
- No OS command execution (`child_process`, `exec`, `spawn`).
- No outbound HTTP/fetch calls from the backend (no SSRF surface).
- No server-side template engine (EJS, Handlebars, etc.); Vue is compiled at build time.
- No JWT, OAuth, or OIDC implementation.
- No email/SMS sending functionality.
- No payment, credit card, or financial data processing.
- No multi-tenancy — single-application, single-database.
- No memcache or caching layer.
- No CORS configuration (SPA is same-origin, proxied; no cross-origin API sharing observed).
- No rate limiting, WAF, or anti-automation middleware (per user confirmation: no external rate limiting).

## Cookie Security Details

Session cookie name: `cle_sid`. Options at `apps/api/src/routes/auth.ts` line 24–31:
- `path: "/"`
- `httpOnly: true`
- `sameSite: "lax"`
- `secure: env.isProd` (enabled only when `NODE_ENV=production`)
- `signed: true`

No `__Host-` or `__Secure-` prefix on cookie name.

## Transport and Secrets

- **Per the user**: TLS terminates at a reverse proxy in front of the app; the Node.js server itself listens on plain HTTP (`0.0.0.0:3000`).
- No TLS configuration exists in the application code.
- Secrets are provided via environment variables: `SESSION_SECRET`, `DATABASE_URL`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`, `PORT`, `NODE_ENV`. No secrets management solution (vault, KMS) is configured in code.
- The `.env.example` file contains default/placeholder values including `SESSION_SECRET=change-me-to-a-long-random-string-at-least-32-chars`.

## Error Handling

A global error handler (`apps/api/src/middleware/error.ts`) catches Zod validation errors (returns 400 with details), propagates non-5xx Fastify errors, and returns a generic `"internal_error"` message with 500 status for unhandled errors. Stack traces are logged server-side via `req.log.error` but not sent to clients.

## Deployment Notes

- SQLite is the database (single-file, local). `DATABASE_URL=file:./dev.db` by default.
- Uploaded files are stored on the local filesystem (`UPLOAD_DIR`, default `../../uploads` relative to `apps/api`).
- No Docker configuration, CI/CD pipeline, or infrastructure-as-code files were found in the repository (only a `.devcontainer/` for development).
- A GitHub Actions workflow exists at `.github/workflows/cle.yml`.
