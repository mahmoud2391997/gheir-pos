# GHEIR POS — Production Audit (Web + Electron Desktop)

This audit is written **before implementing new production code**, per the task instructions. It summarizes what exists today, what’s missing/stubbed, and the biggest architectural ambiguity: **desktop data/auth mode** (remote server vs fully offline).

## 1) Authentication — what exists vs what’s missing

### What exists (today)

- **Cookie-based session**:
  - Cookie name: `app_session_id` (`shared/const.ts`).
  - Cookie signing/verification uses `jose` HS256 with `JWT_SECRET` (`server/_core/sdk.ts`, `server/_core/env.ts`).
  - Cookie options: `httpOnly: true`, `path: "/"`, `sameSite: "none"`, `secure: <derived>` (`server/_core/cookies.ts`).

- **Manus OAuth login (external identity provider)**:
  - Client starts OAuth flow via `startLogin()` and sets a one-time CSRF nonce cookie `__Host-oauth_state` (`client/src/const.ts`, `shared/const.ts`).
  - Server handles callback at `GET /api/oauth/callback` and sets the session cookie (`server/_core/oauth.ts`).

- **tRPC auth surface**:
  - `auth.me` returns `ctx.user` (or `null`) (`server/routers.ts`).
  - `auth.logout` clears the session cookie (`server/routers.ts`).
  - Auth context is created per request by `sdk.authenticateRequest(req)`; failures are swallowed for public procedures (`server/_core/context.ts`).
  - Authorization helpers exist:
    - `protectedProcedure` requires a user (throws tRPC `UNAUTHORIZED`) (`server/_core/trpc.ts`).
    - `adminProcedure` requires `role === "admin"` (throws tRPC `FORBIDDEN`) (`server/_core/trpc.ts`).

- **User model + roles (DB-backed)**:
  - `users` table exists in Drizzle schema: `openId`, `name`, `email`, `loginMethod`, `role` (`drizzle/schema.ts`).
  - Roles in schema: **`cashier`** and **`admin`** (no `manager` today).
  - `server/db.ts` auto-assigns admin role when `openId === OWNER_OPEN_ID` (env) during `upsertUser`.

### What’s missing for production “POS auth”

- **No local credential login**:
  - There is **no** username/password (or PIN) field in `users`.
  - There is **no** `auth.login` procedure/route that verifies credentials against the DB.
  - Consequently, the app currently depends on **Manus OAuth** to create/refresh sessions.

- **Session secret validation**:
  - `JWT_SECRET` is read from env, but there is no hard failure if it’s missing/empty. That’s unsafe for production.

- **Role schema/test mismatch**:
  - `server/auth.logout.test.ts` uses `role: "user"` which no longer matches Drizzle schema (`cashier|admin`). This indicates drift between schema and tests.

- **Cookie settings likely problematic in local/dev**:
  - `sameSite: "none"` is always set. Modern Chromium rejects `SameSite=None` cookies unless `Secure` is also true. In plain `http://localhost` dev, `secure` becomes `false`, so browsers may drop the cookie.
  - This matters both for web dev and for any Electron flow that relies on cookies.

## 2) Other incomplete / mocked / template-only behavior

### Client

- The app renders `Home` directly (no router) (`client/src/App.tsx`).
- `Home` is a **very large “demo-first” POS screen** that:
  - Includes “preview role” toggles in the UI (client-side role simulation, not based on server session).
  - Uses `@/_core/remoteInventory` for inventory and sales sync, which is **API-key based** (not user auth).
  - Uses `window.print()` for receipt printing (browser print adapter), not a thermal printer integration.

### Server

- tRPC routers exist for:
  - dashboard/products/sales/sku print jobs (`server/routers.ts`, `server/db.ts`).
- **No `/api/pos/*` endpoints exist in `server/`** even though the desktop/web “remote inventory” modules call:
  - `GET /api/pos/status`
  - `GET /api/pos/products` (+ optional `?since=...`)
  - `POST /api/pos/sales`
    These endpoints are referenced by:
  - `electron/inventory/sync.ts` (main-process sync worker)
  - `client/src/_core/remoteInventory.ts` (web fallback)

**Implication**: either:

- These `/api/pos/*` routes exist on a different backend (e.g. the “website” at `gheir.vercel.app`), **not in this repo**, or
- They are a missing feature that must be implemented here before desktop inventory/sales sync can work end-to-end on a self-hosted deployment.

### Shared

- `shared/sku.ts` contains lots of “demo POS” helpers (CSV import/export, demo sales, role copy, etc.). This is fine as scaffolding but suggests the app isn’t fully wired to the server DB yet.

### Electron

- Electron preload exposes **only** a narrow inventory bridge via `contextBridge` (`electron/preload.ts`).
- The desktop sync worker:
  - Maintains **local SQLite** (`better-sqlite3`) for cached products + pending sales queue + backoff/retry (`electron/inventory/db.ts`).
  - Syncs to a remote server using `x-pos-key` (device API key), not user auth (`electron/inventory/sync.ts`).
  - Stores the POS API key encrypted at rest using `safeStorage` when available (`electron/secrets.ts`).

## 3) Desktop DB mode: remote MySQL vs fully offline SQLite

### What the code strongly suggests today

- The “business DB” behind tRPC is **MySQL** via `drizzle-orm/mysql2` and `DATABASE_URL` (`server/db.ts`, `drizzle.config.ts`).
- Electron uses **SQLite** only for:
  - offline queueing of sales
  - caching inventory snapshots/ETags
  - sync logs / sync metadata

So the current architecture appears to be:

- **Remote / central backend** (MySQL + Express + tRPC) for canonical data
- **Desktop local SQLite** for offline tolerance + device queue/caching

### The ambiguity (needs an explicit decision)

The task request asks for a full auth system and also calls out better-sqlite3 “maybe for offline desktop mode”.

Today, there is **no** Drizzle SQLite dialect setup, no shared schema for a local SQLite “full DB mode”, and no Electron main-process embedded server. Implementing “fully offline single-tenant desktop DB” would require significant architectural work (new DB dialect/config + migration strategy + sync model).

**Audit assumption (explicit)**: unless proven otherwise during implementation, I will treat the intended production desktop mode as **remote backend + local SQLite queue/cache**, not “fully offline canonical DB”.

## 4) Electron wiring: what’s correct vs what’s placeholder

### Correctly wired

- Security basics:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `preload` is used and exposes a minimal surface (`electron/main.ts`, `electron/preload.ts`).
- External link handling uses `setWindowOpenHandler` + `shell.openExternal` (good baseline).
- `electron-builder.yml` already accounts for `better-sqlite3` native module unpacking (`asarUnpack`).

### Placeholder / incomplete

- `electron-builder.yml` sets `buildResources: electron/assets`, but **`electron/assets/` does not exist** in the repo.
  - No icons (`.ico`/`.icns`) are configured for Windows/macOS.
- No auto-update strategy configured (`electron-updater` not present).
- Code signing / notarization not configured (expected; requires certificates).
- `sandbox: false` is set in `BrowserWindow` webPreferences. That’s not automatically “wrong”, but needs a conscious decision + justification for production.

## Implementation plan (high-level; details will follow after audit commit)

1. Replace/extend Manus-only auth with **local credential login** backed by the `users` table (add password hash columns via Drizzle migration).
2. Implement `auth.login`, `auth.logout`, `auth.me/getSession`, session expiry handling, and role-gated procedures with proper tRPC error codes.
3. Add a **real login screen** (shadcn/Radix styling) and wouter route-guarding instead of Manus `startLogin()`.
4. Validate Electron cookie/session persistence behavior in dev, and ensure logout clears cookies in Electron session storage.
5. Production hardening: fill `electron-builder.yml` resources (icons), document runtime config expectations, run `check`, `format`, `test`, and add auth test coverage.
