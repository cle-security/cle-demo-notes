# cle-demo-notes

A small notes app: sign up, write markdown notes, attach a file, share read-only with another user, view public profiles. Used as a target for security tooling demos, so the code intentionally aims for "honest small-startup quality" rather than airtight perfection.

## Stack

- **Backend** — Node 20+ · TypeScript · Fastify · Prisma · SQLite (file-based)
- **Frontend** — Vue 3 · Vite · Pinia · Vue Router
- **Shared** — pnpm workspaces, a `@cle/types` package consumed by both apps
- **Markdown** — `marked` rendered into `DOMPurify` on the client

## Prerequisites

- Node.js **20.x** or newer
- `pnpm` 11+ (`corepack enable` then `corepack use pnpm@11` if you don't have it)

## Quick start

```bash
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm db:migrate     # applies Prisma migrations + generates client
pnpm db:seed        # creates admin + alice + bob with sample notes
pnpm dev            # api on :3000, web on :5173 (proxied to api)
```

Open <http://localhost:5173>. Seeded logins:

| Role  | Email               | Password       |
| ----- | ------------------- | -------------- |
| admin | `admin@example.com` | `adminpass123` |
| user  | `alice@example.com` | `alicepass123` |
| user  | `bob@example.com`   | `bobpass123`   |

## Useful commands

```bash
pnpm dev              # both servers, parallel
pnpm build            # type-check + production build for both apps
pnpm test             # api smoke test (one happy-path + one auth-required check)
pnpm db:reset         # drop + recreate sqlite db
pnpm db:seed          # re-run the seed script (idempotent for users)
```

## Layout

```
apps/api/           Fastify backend
  src/routes/       auth, notes, users (profile/admin), uploads
  src/middleware/   auth + error handler
  src/lib/          db, sessions, crypto, env, file storage
  prisma/           schema.prisma + migrations + seed.ts
apps/web/           Vue 3 frontend
  src/views/        page-level components
  src/components/   NavBar, MarkdownView
  src/stores/       Pinia stores (auth, notes)
  src/api/          fetch wrapper + ApiException
packages/types/     shared TS types between api and web
uploads/            (gitignored) attachment blobs
```

## Decisions

- **argon2id over bcrypt** — argon2 is OWASP's current recommendation; the `argon2` package builds prebuilt binaries on common platforms and lets us use library-default parameters that are tuned for memory-hardness instead of bcrypt's CPU-only cost.
- **Database-backed sessions, signed cookie carries the session ID** — keeps logout and "disable user" actually-revocable (vs. JWTs that stay valid until expiry). The cookie is `httpOnly`, `sameSite=lax`, `secure` in production, and signed with `SESSION_SECRET`. We rolled our own session table rather than pulling in `@fastify/session` because it's ~30 lines and avoids an extra store dependency.
- **SQLite + `LIKE` for "search"** — the spec said full-text-ish is fine, and FTS5 setup with Prisma is awkward enough that it's not worth the complexity for a demo. `contains` queries on title and body, capped at 200 results, are good enough.
- **`marked` + `DOMPurify` instead of a "safe" markdown renderer** — `marked` is fast and small but does emit raw HTML; sanitising the output with DOMPurify is the standard pattern and lets us render markdown the user (or a sharer) wrote without worrying about XSS via `<script>` or weird `javascript:` links.
- **One attachment per note, content-type allowlist, randomised on-disk filenames** — keeps the disk layout boring (no path traversal surface) and the API simple. Files are streamed back through the API with the same access check as the note, never served directly off disk.
- **Shared `@cle/types` package consumed by source, not built artefacts** — both apps import `@cle/types` directly from its `src/index.ts` via the workspace `exports` field. Avoids a build step in the inner dev loop and means there's exactly one place to change a shape.

## Security posture (what this demo is and isn't)

This is meant to be reviewed and probed. It does the obvious things (parameterised queries via Prisma, hashed passwords, cookie flags, access checks on notes/attachments, sanitised markdown, MIME allowlist for uploads) but it's deliberately small. Things you would add in a real product and won't find here: rate limiting, CSRF tokens for state-changing endpoints (we rely on `sameSite=lax` only), audit logging, password-strength checks beyond a length minimum, MFA, account-recovery flows, and any kind of abuse monitoring on the attachment endpoint.

If you spot something genuinely broken (vs. intentionally minimal), open an issue.
