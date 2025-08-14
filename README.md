# CV-Validator (Next.js + Prisma + PDF AI Check)

A minimal guide to run locally (dev & prod) and deploy on **Railway**. Repository: https://github.com/1stdeddy2nd/decode

---

## Requirements

- **Node**: Prefer LTS **v20.x** or **v22.x** (recommended for Prisma + Next).  
  Your current: `node v23.11.0`, `npm 11.5.1` — may work, but LTS is safer.
- **npm** ≥ 9 (or yarn/pnpm)
- **PostgreSQL** (local via Docker or Railway Postgres)

> The Dockerfile in this repo uses `node:20-alpine` and a **Debian distroless** runner. Keep local Node close to 20/22 to avoid surprises.

---

## Environment Variables

Copy `.env.example` → `.env` and fill values:

```
# Auth
AUTH_SECRET=
AUTH_TRUST_HOST=
AUTH_URL=

# Providers (optional)
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Database
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=postgresql://user:pass@localhost:5432/appdb?schema=public

# OpenAI (if used by your validator)
OPENAI_API_KEY=

# External validator (n8n/CrewAI)
VALIDATION_AGENT_URL=
VALIDATION_AGENT_TOKEN=
```

Also set (in prod):
```
NEXTAUTH_URL=https://<your-domain-or-railway-url>
```

---

## Local Development

```bash
# install deps
npm install

# generate prisma client
npx prisma generate

# (optional) start local Postgres via docker
docker compose up -d db

# create/update schema
npx prisma migrate dev

# run dev server
npm run dev
# → http://localhost:3000
```

### Common scripts
- `npm run dev` – Next.js dev
- `npm run build` – Production build
- `npm run start` – Start built app (needs `npm run build` first)
- `npx prisma studio` – DB UI
- `npx prisma migrate dev` – create/apply migrations (dev)
- `npx prisma migrate deploy` – apply migrations (prod)

---

## Local Production Test

Simulate prod on your machine (good before deploy):

```bash
# ensure env is set (DATABASE_URL, NEXTAUTH_URL, etc.)
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start
# → http://localhost:3000 (prod mode)
```

Or use Docker:

```bash
# builds all images and starts db + app
docker compose --env-file .env up -d --build

# watch logs
docker compose logs -f app
```

> Uploaded PDFs are stored under `/app/public/uploads/cvs` (Docker volume `uploads`).

---

## Deploy to Railway (recommended path)

### 1) Create a new Railway project
- **New → Deploy from GitHub** → select `1stdeddy2nd/decode`

### 2) Choose how to build
**A. Use Dockerfile (simplest, matches prod):**  
Railway will detect the `Dockerfile`. No buildpacks needed.

**B. Nixpacks/Node:**  
If you don’t use the Dockerfile, ensure build/start commands:  
- Build command: `npm run build`  
- Start command: `node server.js` (standalone output)

> The repo builds a **standalone** Next.js server in `.next/standalone` and runs `server.js` (from the Dockerfile’s runner stage).

### 3) Add a PostgreSQL database
- In Railway: **Add → Database → PostgreSQL** (or connect an existing one).
- Copy the connection string to **`DATABASE_URL`**.

### 4) Set environment variables
In your service → **Variables**:
- `DATABASE_URL` (from Railway Postgres)
- `NEXTAUTH_URL` = `https://<your-railway-domain>`
- `AUTH_SECRET` (required for prod; `npx auth secret` to generate)
- Any OAuth provider IDs/secrets you use
- `OPENAI_API_KEY` (if used)
- `VALIDATION_AGENT_URL`, `VALIDATION_AGENT_TOKEN` (if using external validator)

### 5) Run migrations before first start
Add a **Deploy Hook** or **Start Command** to run migrations once:
- Option 1 (Deploy Command / Prestart): `npx prisma migrate deploy`
- Option 2: open a **Shell** on the service and run: `npx prisma migrate deploy`

> If using the provided **Dockerfile**, migrations can also be run via a separate “migrator” step. On Railway, the simplest is to run `npx prisma migrate deploy` as part of deploy.

### 6) Persistent uploads
- Add a **Volume** in Railway and mount it to `/app/public/uploads/cvs` to persist user PDFs between deploys.
  - e.g., Volume name: `uploads`, mount path: `/app/public/uploads/cvs`

### 7) Custom domain (optional)
- **Settings → Domains → Add Domain** and follow Railway’s DNS instructions.
- Set `NEXTAUTH_URL=https://your.domain` and redeploy.

---

## Commands Cheat Sheet

```bash
# dev
npm install
npm run dev

# prod (local)
npm ci
npx prisma migrate deploy
npm run build
npm run start

# prisma
npx prisma studio
npx prisma migrate dev
npx prisma migrate deploy

# docker
docker compose up -d db
docker compose --env-file .env up -d --build
docker compose logs -f app
```

---

## Notes & Gotchas

- **Node version**: Use LTS (20/22). If you stay on Node 23, keep an eye on Prisma/Next native deps. The Docker image uses Node 20.
- **NEXTAUTH_URL** must be the exact deployed origin in prod (HTTPS).
- **Uploads** require a persistent volume in prod (Railway Volume or object storage).
- **PDF parsing** & external AI validation are server-side; ensure the agent endpoint is reachable from Railway.
- On first boot with an empty DB, ensure migrations are applied (`migrate deploy`).

---

## Troubleshooting

- **Auth callback errors** → wrong `NEXTAUTH_URL` or provider redirect URIs.
- **Prisma engine missing** → rebuild and ensure schema `generator` includes correct binary targets if you changed runtimes.
- **Uploads lost after deploy** → add a Railway Volume at `/app/public/uploads/cvs`.
- **Build fails on Railway** → switch to Dockerfile build to match local Docker behavior.

---

### License
MIT (or your preferred license)
