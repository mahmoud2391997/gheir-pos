# GHEIR POS (Web + Electron Desktop)

## Local development

### 1) Install

```bash
pnpm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and set at least:

- `DATABASE_URL`
- `JWT_SECRET`

### 3) Run DB migrations

```bash
pnpm db:push
```

`db:push` runs **migrations only**. When you change the schema, generate a migration with:

```bash
pnpm db:generate
```

### 4) Create your first user

Create an admin account (no default passwords are shipped in the repo):

```bash
pnpm user:create --username=admin --password='change-me-now' --role=admin --update
```

### 5) Start the app

```bash
pnpm dev
```

Then open `http://localhost:3000` and sign in at `/login`.

## Electron desktop

### Dev

Run the server in one terminal:

```bash
pnpm dev
```

Then run Electron:

```bash
pnpm electron:dev
```

### Build / package

```bash
pnpm electron:build
```

Artifacts are written to `release/`.

## Production notes

- **JWT secret**: `JWT_SECRET` must be set (sessions won’t sign/verify without it).
- **Cookies**: defaults to `COOKIE_SAMESITE=lax`. If you embed the app in an iframe or need cross-site cookies, set `COOKIE_SAMESITE=none` and serve over HTTPS.
- **Code signing / notarization**: required for smooth Windows/macOS distribution; this repo does not include certificates.

## Auto-update (Electron)

This app uses `electron-updater` in **packaged** builds to check GitHub Releases for updates.

- **Enabled by default** in packaged builds
- **Disable** by setting `DISABLE_AUTO_UPDATE=1`

### Publish requirements

- Builds must be published as **GitHub Releases** for the repo.
- The update feed is configured for the GitHub provider (see `electron-builder.yml`).

## Code signing / notarization (Electron)

This repo includes notarization scaffolding for macOS builds via `scripts/notarize.cjs` (it only runs when required env vars exist).

### macOS (Apple notarization)

Required (outside this repo):
- Apple Developer Program membership
- Signing certificate installed on the build machine

Environment variables for CI:
- `CSC_LINK` / `CSC_KEY_PASSWORD` (certificate)
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

### Windows (Authenticode)

Required (outside this repo):
- Authenticode code signing certificate

Environment variables (commonly used by electron-builder):
- `CSC_LINK` / `CSC_KEY_PASSWORD`

