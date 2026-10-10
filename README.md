# Imran Hossain — Portfolio (T3)

Dark cinematic personal portfolio for **MD Imran (Imran Hossain)** — Full Stack Developer (React / Nest.js).

Built with the **T3 stack**: Next.js · TypeScript · tRPC · Tailwind · NextAuth · Prisma · PostgreSQL. The public site has an immersive React Three Fiber hero; showcase projects are CRUD’d in a password-gated admin and stored in Postgres.

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js App Router (create-t3-app) |
| API | tRPC (`project.list` / `create` / `update` / `delete`) |
| Auth | NextAuth Credentials (admin password) |
| DB | PostgreSQL + Prisma |
| UI | Tailwind + Framer Motion + R3F / Three.js |

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (Docker **or** local install)

### Database options

**A. Docker Compose (recommended when Docker is available)**

```bash
docker compose up -d
```

Uses `postgresql://postgres:password@127.0.0.1:5432/imran_portfolio`.

**B. Local Postgres**

Create a DB/user matching `DATABASE_URL` in `.env.example`, e.g.:

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
sudo -u postgres createdb imran_portfolio
```

## Setup

```bash
cp .env.example .env
# edit AUTH_SECRET, ADMIN_PASSWORD, DATABASE_URL if needed

npm install
npm run db:setup   # prisma db push + seed sample projects
npm run dev        # http://127.0.0.1:4321
```

Production-style:

```bash
npm run build
npm start
```

## Admin dashboard

1. Open [http://127.0.0.1:4321/admin](http://127.0.0.1:4321/admin)
2. Sign in with the admin password
3. List / create / edit / delete showcase projects
4. Public **Projects** section reads the same Postgres rows via tRPC

### Password

| Mode | Behavior |
|------|----------|
| **Local fallback** | If `ADMIN_PASSWORD` is unset, password is `imran-admin` |
| **Configured** | Set `ADMIN_PASSWORD` (and `AUTH_SECRET`) in `.env` |

Sessions use NextAuth JWT cookies (7 days).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server on **port 4321** |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:seed` | Seed sample projects (skips if any exist) |
| `npm run db:setup` | `db:push` + `db:seed` |
| `npm run db:studio` | Prisma Studio |

## Content

Resume-backed copy lives in `src/lib/site.ts`. Seed projects are in `prisma/seed.ts`.
