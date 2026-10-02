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
| `pnpm content:pull` | Database → `/content` YAML files |
| `pnpm content:push` | `/content` → database (shows what differs first; `--dry-run` to only look) |
| `pnpm content:lint` | Report every problem in the content files |

## Content

Courses, exercises and IQ questions live in the **database** and are edited in the admin panel (`/admin/content`).
`/content` is a mirror of it in git — for review, history and bulk edits:

```bash
pnpm content:pull            # database → files (drafts included, archived content left out)
# … edit the YAML …
pnpm content:push --dry-run  # what would change
pnpm content:push            # files → database
```

- Add `--prod` to work against production (`content:push --prod` is a dry run until you add `--yes`).
- Push never deletes. Content that is only in the database is reported and left alone; `--prune` archives it.
- Always pull before editing files, so changes made in the admin panel are not overwritten by older files.

## Project layout

```
src/app/[locale]/   routes: (marketing) landing, (auth) login/register, (app) dashboard & settings
src/features/       feature modules (auth, gamification, …)
src/lib/            db (tenant-scoped Prisma), auth/sessions, tenant, leaderboard, rate-limit, cache, sms
src/config/features.ts   feature flags (SMS OTP, Redis, locales)
messages/uz.json    all UI text (Uzbek)
prisma/             schema, migrations, seed
```

## Deploying (VPS)

Production runs on the VPS next to the hotel sites: `zukkolar.service` (systemd, user `zukkolar`, port 3010) behind nginx
(`zukkolar.uz` + `*.zukkolar.uz` for study centers), traffic via Cloudflare. Config lives in [deploy/](deploy/).

```bash
pnpm deploy:prod                # build locally → upload → switch release → health check (auto-rollback)
pnpm deploy:prod --migrate      # + apply new Prisma migrations to the production DB
pnpm deploy:prod --setup        # first time only: user, folders, certificate, systemd unit, nginx site, shared/.env
pnpm deploy:prod --dry-run      # build + assemble only, to test the bundle locally
```

Needs `.env.vps` (SSH credentials) and `PRODUCTION_DATABASE_URL` in `.env` — both git-ignored.
The server's `/srv/zukkolar/shared/.env` must keep `HOSTNAME=localhost` (see `src/proxy.ts`).
