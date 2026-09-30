# Zukkolar

Gamified platform for practicing web development (HTML, CSS, JS, TS, React…) one skill at a time.
B2C at `zukkolar.uz`, white-label for study centers at `<center>.zukkolar.uz`. See [PLAN.md](PLAN.md).

**Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma 7 · Tailwind 4 · Zustand · next-intl

## Getting started

```bash
pnpm install
cp .env.example .env          # set DATABASE_URL
pnpm prisma dev --name gamify --detach   # optional: local Postgres, put its URL in .env
pnpm db:migrate               # apply migrations (dev)
pnpm db:seed                  # default tenant "gamify" + example tenant "demo"
pnpm dev
```

- Main site: http://localhost:3000
- Study center example: http://demo.localhost:3000

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm typecheck` / `pnpm lint` | Checks |
| `pnpm db:migrate` | Create/apply migrations (**dev databases only**) |
| `pnpm db:deploy` | Apply existing migrations (production) |
| `pnpm db:seed` | Seed tenants |

## Project layout

```
src/app/[locale]/   routes: (marketing) landing, (auth) login/register, (app) dashboard & settings
src/features/       feature modules (auth, gamification, …)
src/lib/            db (tenant-scoped Prisma), auth/sessions, tenant, leaderboard, rate-limit, cache, sms
src/config/features.ts   feature flags (SMS OTP, Redis, locales)
messages/uz.json    all UI text (Uzbek)
prisma/             schema, migrations, seed
```
