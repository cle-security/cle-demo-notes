# Codebase Context

## Stack and frameworks

- **Monorepo**: pnpm workspace with three packages: `@cle/api`, `@cle/web`, `@cle/types` (see `pnpm-workspace.yaml`).
- **Backend**: Node.js (≥20) with **Fastify 4**, TypeScript ESM, running via `tsx` in dev / `node dist/index.js` in prod (see `apps/api/package.json`, `apps/api/src/index.ts`).
- **Database**: **SQLite** via **Prisma** ORM (see `apps/api/prisma/schema.prisma` — `provider = "sqlite"`).
- **Frontend**: **Vue 3** (SFC + Composition API) with **Vite 5**, **Vue Router 4**, **Pinia**, TypeScript (see `apps/web/package.json`).
- **Shared types**: `@cle/types` — plain TypeScript interfaces shared between frontend and backend (see `packages/types/src/index.ts`).
- **Key libraries**: `zod` (input validation), `argon2` (password hashing), `dompurify` + `marked` (Markdown rendering + HTML sanitization), `@fastify/cookie`, `@fastify/multipart`, `@fastify/static`, `dotenv`.

## Entry points and external interfaces

- **API server** listens on `0.0.0.0:3000` (see `apps/api/src/index.ts:49`). All routes are prefixed with `/api`.
- **HTTP routes** (all return JSON unless otherwise noted):
  - `GET /api/health` — unauthenticated health check.
  - `POST /api/auth/signup` — user registration (email, username, displayName, password).
  - `POST /api/auth/login` — email + password login; sets signed session cookie.
  - `POST /api/auth/logout` — destroys server-side session, clears cookie.
  - `GET /api/auth/me` — returns current user or null.
  - `GET /api/notes` — list notes owned by or shared with the authenticated user; optional `?q=` search.
  - `POST /api/notes` — create a note.
  - `GET /api/notes/:id` — read a note (owner or shared user).
  - `PUT /api/notes/:id` — update a note (owner only).
  - `DELETE /api/notes/:id` — delete a note and its attachment file (owner only).
  - `POST /api/notes/:id/shares` — share a note read-only with another user (owner only).
  - `DELETE /api/notes/:id/shares/:userId` — revoke a share.
  - `POST /api/notes/:id/attachment` — multipart file upload for a note (owner only). Accepts PNG, JPEG, GIF, WEBP, PDF. Max 5 MB.
  - `GET /api/attachments/:id` — stream an uploaded file; sets Content-Disposition header (owner or shared user).
  - `GET /api/profile/:username` — public profile page data (no auth required).
  - `PUT /api/me/profile` — update own display name and bio.
  - `GET /api/admin/users` — admin-only user list.
  - `POST /api/admin/users/:id/disable` — admin-only enable/disable user (also kills sessions on disable).
- **Frontend** served by Vite dev server (port 5173) in development, proxied to API; likely static build in production (see `apps/web/vite.config.ts`).

## Authentication and authorization

- **Authentication mechanism**: Email + password login. No OAuth, OIDC, SAML, or MFA.
  - Passwords hashed with **argon2id** via the `argon2` library (see `apps/api/src/lib/crypto.ts`).
  - Password validation uses Zod schema: minimum 8 characters, max 200 (see `apps/api/src/routes/auth.ts:8-17`).
  - Login uses constant-time comparison (always calls `verifyPassword` even for unknown emails) — see `apps/api/src/routes/auth.ts:70-74`.
- **Session management**: Server-side reference sessions stored in SQLite via Prisma.
  - Session IDs are 32-byte `crypto.randomBytes` → base64url (256 bits of entropy) — see `apps/api/src/lib/sessions.ts:8`.
  - Session TTL: 14 days absolute (`SESSION_TTL_MS`) — see `apps/api/src/lib/sessions.ts:5`. No inactivity timeout.
  - Session cookie named `cle_sid`, signed via `@fastify/cookie` with `SESSION_SECRET`.
  - Cookie options: `httpOnly: true`, `sameSite: "lax"`, `secure: env.isProd` (i.e., only in production) — see `apps/api/src/routes/auth.ts:24-31`.
  - No `__Host-` or `__Secure-` prefix on the cookie name.
  - No session regeneration on login — the session cookie is set at signup/login but there is no explicit invalidation of pre-existing sessions when re-authenticating.
  - Logout destroys the server-side session and clears the cookie (see `apps/api/src/routes/auth.ts:92-96`).
  - Admin disabling a user deletes all sessions for that user (see `apps/api/src/routes/users.ts:76-78`).
- **Authorization**: Role-based (`user` | `admin`) with ownership checks.
  - `requireAuth` middleware checks for authenticated user (see `apps/api/src/middleware/auth.ts:36-39`).
  - `requireAdmin` middleware checks `role === "admin"` (see `apps/api/src/middleware/auth.ts:42-49`).
  - Data-level access control: Notes are restricted by `ownerId` or membership in `shares`; attachments inherit note access. Public profile endpoint is unauthenticated.
  - No field-level access control; API responses include all fields of each type.
  - Client-side route guards exist in Vue Router (`meta.requiresAuth`, `meta.requiresAdmin`) but are not a server-side security boundary.

## Input validation

- **Zod schemas** validate request bodies on auth routes and note routes (e.g., `signupSchema`, `loginSchema`, `noteInput`, `shareInput`, `profileUpdate` in `apps/api/src/routes/auth.ts` and `apps/api/src/routes/notes.ts` and `apps/api/src/routes/users.ts`).
- Upload MIME type is validated against an allowlist of 5 types (`ALLOWED_MIME` in `apps/api/src/lib/storage.ts:6-12`). File size enforced both by `@fastify/multipart` config (`limits.fileSize`) and a belt-and-braces buffer length check.
- Client-side HTML5 validation exists in Vue templates (`required`, `minlength`, `maxlength`, `pattern`, `type="email"`, `type="password"`, `accept` attribute on file inputs) but is not relied upon as the sole security control.

## Data classes present

- **Passwords**: Hashed with argon2id, stored in `User.passwordHash` (see `apps/api/prisma/schema.prisma:16`).
- **Email addresses**: Stored in `User.email`, returned in `/api/auth/me` and admin endpoints; not shown on public profiles.
- **Session tokens**: Server-side reference IDs (not JWTs); transmitted via signed `httpOnly` cookie.
- **User-generated content**: Note `title` and `body` (Markdown, rendered with `marked` + DOMPurify sanitization on the frontend). User `bio` (also Markdown + DOMPurify). User `displayName`.
- **Uploaded files**: Images (PNG, JPEG, GIF, WEBP) and PDFs, stored on disk with random filenames (see `apps/api/src/lib/storage.ts:29-33`).

## Data classes absent

- No financial data (credit cards, payment details).
- No health or regulated data visible in the schema or code.
- No JWTs or self-contained tokens used anywhere (sessions are reference tokens).
- No OAuth/OIDC/SAML (no identity provider integration).
- No MFA/TOTP/OTP mechanisms.
- No WebSockets, GraphQL, gRPC, or SOAP interfaces.
- No LDAP, XPath, LaTeX, JNDI, or memcache usage.

## Output encoding / rendering

- **Markdown rendering** on the frontend uses `marked` to generate HTML then `DOMPurify.sanitize()` before inserting via `v-html` (see `apps/web/src/components/MarkdownView.vue:9-12`). This is the sole use of `v-html` in the codebase.
- All other Vue template bindings use `{{ }}` (text interpolation), which Vue auto-escapes.
- The API returns JSON; no HTML/XML responses are generated server-side.
- File download responses set `Content-Type` from the stored `mimeType` and `Content-Disposition` with a sanitized filename (newline/quote/backslash characters replaced) — see `apps/api/src/routes/uploads.ts:74-79`.

## File handling

- Uploads are stored in a configurable `UPLOAD_DIR` with cryptographically random filenames (16 bytes hex + extension based on MIME type) — see `apps/api/src/lib/storage.ts:29-33`.
- Path traversal defense: `readUpload` and `deleteUpload` reject filenames containing `/`, `\\`, or `..` — see `apps/api/src/lib/storage.ts:38-39,44-45`.
- No file content validation beyond MIME type checking (no magic byte validation).
- No virus/malware scanning of uploaded files.

## Transport and TLS

- The application itself listens on **plain HTTP** (no TLS configuration in code).
- Per the user: TLS is handled by the **managed platform** (PaaS-provided TLS termination).
- The cookie `secure` flag is only set when `NODE_ENV === "production"` (see `apps/api/src/routes/auth.ts:28`).

## Security headers

- Per the user: **No security headers** (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) are set anywhere — neither in the application code nor at the infrastructure layer.
- No CORS headers are explicitly configured in the Fastify application.
- No `@fastify/helmet` or similar middleware is registered.

## Anti-automation and rate limiting

- Per the user: The deployment uses **IP allowlisting** but no WAF, API gateway rate limiting, or dedicated anti-automation controls.
- The application has **no rate limiting, account lockout, or anti-automation measures** in code.
- The Fastify `bodyLimit` is set to 1 MB for JSON bodies (see `apps/api/src/index.ts:18`);
 multipart file size is capped at 5 MB (configurable via `MAX_UPLOAD_BYTES`).

## Secrets and configuration

- Configuration via environment variables: `SESSION_SECRET` (required, min 32 chars), `DATABASE_URL`, `PORT`, `NODE_ENV`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES` (see `apps/api/src/lib/env.ts`).
- No secrets management solution (key vault) is mentioned or configured in code; secrets are stored in environment variables.
- `dotenv` is used to load `.env` files in development.
- Seed script creates default admin user with credentials from env vars or hardcoded defaults (`admin@example.com` / `admin / adminpass123`) — see `apps/api/prisma/seed.ts:36-38`.

## Tenancy and trust boundaries

- Per the user: **Single-tenant** deployment; one deployment serves one organization.
- No tenant isolation in the schema; all users share the same database.
- The public boundary: The `/api/health` and `/api/profile/:username` endpoints are unauthenticated; all other `/api/*` endpoints require authentication. IP allowlisting operates at the infrastructure level.

## Error handling

- Global error handler in `apps/api/src/middleware/error.ts`: ZodErrors return 400 with validation details; client errors (4xx) return the error message; server errors (5xx) return a generic "Something went wrong" message and log the full error. Stack traces are not exposed to clients for 5xx errors.
- The ZodError handler exposes field-level validation messages (path + message) — see line 8.

## Database queries

- All database access is through **Prisma ORM** (parameterized queries by default). No raw SQL queries are used in the application code.
- Search uses Prisma `contains` filter (case-insensitive on SQLite) — see `apps/api/src/routes/notes.ts:49-53`.

## Logging

- Fastify's built-in logger is used: production mode logs normally, development mode uses `undefined` transport (standard pino output) — see `apps/api/src/index.ts:17`.
- Prisma logging: development mode logs `warn` + `error`; production logs `error` only — see `apps/api/src/lib/db.ts:4`.
- No dedicated security event logging (no explicit logging of authentication failures, authorization failures, input validation rejections, etc.).

## Other observations

- No `eval()`, `new Function()`, or dynamic code execution found in the codebase.
- No `postMessage` usage in the frontend.
- No SVG upload support (not in `ALLOWED_MIME`).
- No use of `@fastify/static` in the configured routes (the import is present in `package.json` but not used in `index.ts`).
- The `import.meta.url === file://${process.argv[1]}` check for direct execution (see `apps/api/src/index.ts:45`) could be fragile but is not user-controllable.
