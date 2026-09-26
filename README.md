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
- **Auto-update**: not configured yet (add `electron-updater` / release hosting if needed).
