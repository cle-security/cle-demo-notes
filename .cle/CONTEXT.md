# Codebase Context

# Codebase Profile: cle-demo-notes

## Stack and Frameworks

- **Backend**: Node.js 20+ · TypeScript · Fastify 4 (HTTP framework) · Prisma ORM · SQLite (file-based)
- **Frontend**: Vue 3 · Vite (dev server + bundler) · Pinia (state management) · Vue Router 4
- **Shared**: pnpm monorepo with a `@cle/types` workspace package
- **Markdown**: `marked` (parser) rendered through `DOMPurify` (sanitizer) on the client
- **Password hashing**: `argon2` (argon2id variant)
- **Validation**: Zod schemas on API routes
- **File uploads**: `@fastify/multipart` with MIME allowlist + size limits
- **Cookie handling**: `@fastify/cookie` with HMAC signing

Key files:
- `apps/api/src/index.ts` — Fastify app setup, plugin registration
- `apps/api/src/routes/auth.ts` — Signup, login, logout, /me
- `apps/api/src/routes/notes.ts` — Note CRUD, sharing
- `apps/api/src/routes/uploads.ts` — File attachment upload/download
- `apps/api/src/routes/users.ts` — Public profile, /me/profile, admin users
- `apps/api/src/middleware/auth.ts` — Session deserialization, requireAuth, requireAdmin
- `apps/api/src/lib/sessions.ts` — Database-backed session store
- `apps/api/src/lib/crypto.ts` — argon2id password hashing
- `apps/api/src/lib/storage.ts` — File upload storage with path-traversal guard
- `apps/api/src/lib/env.ts` — Environment variable configuration
- `apps/web/src/components/MarkdownView.vue` — marked + DOMPurify renderer

## Authentication and Authorization

**Authentication** (`apps/api/src/routes/auth.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/lib/sessions.ts`):
- Password-based authentication only (email + password)
- No MFA, no OAuth/OIDC, no social login
- Passwords hashed with argon2id (`apps/api/src/lib/crypto.ts`)
- Session management: database-backed sessions in SQLite; session ID stored in a signed cookie named `cle_sid`
- Cookie flags: `httpOnly: true`, `sameSite: "lax"`, `secure: true` in production, path `/`
- No CSRF tokens — relies on sameSite=lax cookie attribute only
- No rate limiting on login/signup endpoints (no rate-limiting middleware or infrastructure)
- Password validation: minimum 8 characters via Zod, max 200 chars; no password complexity rules, no breached-password checking
- Default admin account seeded via `apps/api/prisma/seed.ts`

**Authorization** (`apps/api/src/middleware/auth.ts`, routes):
- Two roles: `user` and `admin` (stored as string in User table)
- `requireAuth` middleware checks session validity
- `requireAdmin` middleware additionally checks `role === "admin"`
- Note ownership enforcement: only note owner can edit/delete/share
- Shared notes are read-only for the share target
- Public profile endpoint (`GET /api/profile/:username`) is unauthenticated but hides disabled users
- Admin can disable/enable users and view all users

## Entry Points and External Interfaces

**API routes** (all under `/api`):
- `GET /api/health` — unauthenticated health check
- `POST /api/auth/signup` — create account
- `POST /api/auth/login` — authenticate
- `POST /api/auth/logout` — end session
- `GET /api/auth/me` — current user
- `GET /api/notes` — list own + shared notes (auth required)
- `POST /api/notes` — create note (auth required)
- `GET /api/notes/:id` — read note (auth + ownership/share check)
- `PUT /api/notes/:id` — update note (auth + ownership check)
- `DELETE /api/notes/:id` — delete note (auth + ownership check)
- `POST /api/notes/:id/shares` — share note read-only (auth + ownership)
- `DELETE /api/notes/:id/shares/:userId` — remove share (auth + ownership)
- `POST /api/notes/:id/attachment` — upload attachment (auth + ownership)
- `GET /api/attachments/:id` — download attachment (auth + ownership/share check)
- `GET /api/profile/:username` — public profile (unauthenticated)
- `PUT /api/me/profile` — update own profile (auth required)
- `GET /api/admin/users` — list users (admin required)
- `POST /api/admin/users/:id/disable` — toggle user disabled (admin required)

**Frontend** (`apps/web`): Vue 3 SPA served by Vite dev server (proxying `/api` to backend). Production build produces static assets.

No GraphQL, WebSocket, gRPC, CLI, or message-queue interfaces.

## Baseline-Relevant Technologies and Data Classes

**Present**:
- HTML output rendering (marked + DOMPurify) → V1.3.1, V3.2.2, V1.2.1–V1.2.3
- Session-based auth with signed cookies → V3.3.x, V7.x
- Password authentication (argon2id) → V6.2.x, V11.4.2
- File uploads (images + PDF, size-limited, MIME allowlist) → V5.x
- SQLite via Prisma ORM (parameterized queries) → V1.2.4
- Markdown rendering (client-side) → V1.3.5
- Input validation with Zod schemas → V2.2.x
- Server-side redirects: none (all navigation is client-side)
- Cookie-based session management → V7.x
- User-generated content (notes with markdown + file attachments)
- Database-backed sessions with 14-day TTL
- Admin role with user management
- CSRNG for session IDs (`crypto.randomBytes`)
- HMAC-signed cookies via `@fastify/cookie`

**Absent**:
- No JWT/OAuth/OIDC/SAML — custom password auth only
- No MFA/TOTP/OTP
- No GraphQL
- No WebSocket
- No LDAP
- No XPath
- No LaTeX
- No XML parsing
- No memcache
- No JNDI
- No Java/Spring/SpEL
- No SSR/server-rendered HTML templates
- No SMTP/IMAP (no email sending)
- No SMS/telephony
- No gRPC
- No SVG upload/rendering pipeline
- No postMessage usage
- No eval() or dynamic code execution
- No shell/command execution
- No encryption (symmetric or asymmetric) at the application level
- No WAF, rate limiter, or anti-automation tooling
- No CORS headers set
- No security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, etc.) set by the application
- No external service calls (no outbound HTTP)
- No secrets management tooling referenced in code
- No SIEM or centralized logging
- No antivirus scanning

## Tenancy and Trust Boundaries

- **Single-tenant** application (per operator confirmation)
- Public-facing API endpoint at `/api/health`, `/api/auth/signup`, `/api/auth/login`, `/api/profile/:username` — these are the unauthenticated boundary
- All other endpoints require authentication; admin endpoints additionally require admin role
- No tenant isolation model

## Transport, Secrets, and Configuration

**Transport** (per operator confirmation):
- The application listens on plain HTTP (Fastify on port 3000)
- TLS terminates at an upstream reverse proxy
- No TLS configuration exists in application code

**Secrets**:
- `SESSION_SECRET` — required env var, minimum 32 chars, used for HMAC cookie signing
- `DATABASE_URL` — SQLite file path
- `UPLOAD_DIR` — path for uploaded files
- No secrets management solution was confirmed by the operator (answer was deferred)
- `.env.example` is checked into the repo with placeholder values
- `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` are seed-time env vars with weak defaults

**Configuration** (`apps/api/src/lib/env.ts`):
- `NODE_ENV` — development/production toggle
- `PORT` — default 3000
- `SESSION_SECRET` — required
- `UPLOAD_DIR` — default `../../uploads`
- `MAX_UPLOAD_BYTES` — default 5 MB
- Cookie `secure` flag is conditional: `env.isProd` (only true when `NODE_ENV=production`)

## Notable Security Observations

- No CORS headers configured — API returns no `Access-Control-Allow-*` headers
- No `Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`, `X-Frame-Options`, or `Referrer-Policy` headers set by the application
- No rate limiting on any endpoint (including login/signup)
- No CSRF protection beyond `sameSite=lax` cookie attribute
- No antivirus scanning of uploaded files (per operator)
- No centralized logging / SIEM (per operator)
- No WAF or anti-automation controls (per operator)
- Markdown is parsed with `marked` and sanitized with `DOMPurify` on the client
- File upload storage uses random filenames, validates MIME type against an allowlist, restricts file size, and guards against path traversal
- Prisma ORM ensures parameterized SQL queries
- Admin account seeded with a weak default password (`adminpass123`)
- Session TTL is 14 days with no inactivity timeout or absolute max lifetime enforcement beyond the expiry date
