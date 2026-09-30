# Gamify — Implementation Plan

> A gamified platform for practicing web development (HTML, CSS, JS, TS, React, …)
> **one skill at a time**, e.g. "I want to drill `useState` until I really get it."
> B2C at `gamify.uz`; B2B white-label for study centers at `<center>.gamify.uz`.

---

## 1. Core idea (what makes it different)

Most platforms teach **courses**. Gamify trains **skills**.

- Content is a **skill graph**: `Track → Module → Skill → Exercises`
  e.g. `React → State → useState → 40+ exercises`.
- A learner can open **any single skill** and enter **Drill Mode**: an endless stream of
  exercises on that skill only, with difficulty adapting to their answers, until the
  **mastery bar** fills up.
- Mastery decays over time (spaced repetition), so the dashboard says:
  *"useState is getting rusty — 5-minute review?"*
- Everything feeds the game loop: XP, streaks, levels, ranks, leaderboards, friends.

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router)** + TypeScript | Server Components + Server Actions |
| DB | **PostgreSQL** + **Prisma** | Every tenant-owned table has `tenantId` |
| Styling | **Tailwind CSS** + shadcn/ui | Theme via CSS variables → per-tenant branding |
| Client state | **Zustand** | Only UI/session state (editor, quiz run, UI prefs). Server data comes from RSC / fetch, not Zustand |
| Auth | **Custom sessions** (`src/lib/auth`) | DB-backed sessions + argon2id. better-auth was dropped: it requires email, we sign up with phone + username only |
| Password hashing | argon2id | |
| Validation | Zod | Shared between forms and server actions |
| Code editor | **CodeMirror 6** | Much lighter than Monaco, works on mobile |
| Code running (in browser) | Sandboxed `iframe` / **Sandpack** | HTML/CSS/JS/TS/React run client-side |
| Code running (server, anti-cheat) | Worker with Docker / `isolated-vm` (or Judge0) | Re-verify ranked submissions |
| Cache / leaderboards | **PostgreSQL only** (for now) | Indexed queries + cached aggregates. Redis comes later behind the same interfaces (see §3.5) |
| Background jobs | **pg-boss** (queue on Postgres) | Weekly resets, streak checks, reports. No Redis needed |
| Realtime | SSE for notifications; separate **WebSocket server** for duels, live scoreboards, chat | Postgres `LISTEN/NOTIFY` between app and WS server; Redis adapter later |
| Avatars | **DiceBear** (seeded) | Reddit-style generated avatar, customizable parts |
| i18n | next-intl | **Only `uz` enabled for now**; ru/en added later by config (see §3.5) |
| SMS / OTP | **Disabled for now** | Provider interface ready; Eskiz.uz / Play Mobile / Telegram Gateway later |
| Payments (later) | Click, Payme, Uzum | |
| Hosting | Docker on VPS **inside Uzbekistan** | ⚠️ UZ personal data law requires citizens' personal data to be stored on servers in Uzbekistan — check with a lawyer before launch |
| Reverse proxy | Caddy or Nginx | Wildcard TLS `*.gamify.uz` via DNS challenge |
| Monitoring | Sentry + Uptime Kuma / Grafana | |
| Tests | Vitest + Playwright | |

---

## 3. Architecture decisions to make on day 1

### 3.1 Multi-tenancy (even before the B2B admin panel exists)

- Single database, **shared schema, `tenantId` on every tenant-owned row**.
- The public platform itself is just tenant `gamify` (the default).
- `middleware.ts` reads the host:
  - `gamify.uz` → default tenant
  - `najot.gamify.uz` → tenant with `slug = "najot"`
  - later: custom domains (`learn.najot.uz`) via a `TenantDomain` table
- Tenant is resolved once per request and injected into a Prisma client extension that
  **automatically adds `where: { tenantId }`** — so one forgotten filter can't leak data.
- Optionally add Postgres **Row-Level Security** later as a second safety layer.
- Content: **global content** (`tenantId = null`, made by us) + **tenant content** (center's own problems).
- Tenant settings: name, logo, colors, enabled tracks, locale, whether students may see the global leaderboard.

### 3.2 Sessions & devices

DB-backed sessions (not stateless JWT) so we can list and revoke devices:

```
Session { id, userId, tokenHash, deviceName, browser, os, ip, city,
          createdAt, lastActiveAt, expiresAt, revokedAt }
```

- "Active devices" page: list sessions, mark "this device", **Sign out** / **Sign out all others**.
- `lastActiveAt` updated at most once per ~5 min (avoid a write per request).
- Password change → revoke all other sessions.
- Login rate limiting + new-device notification (Telegram/SMS).

### 3.3 Anti-cheat for XP & rankings

- Client-side test runs = instant feedback, **not trusted**.
- For XP-granting and ranked submissions, the server re-runs the tests (or checks answers for quizzes/IQ).
- IQ questions are served one at a time, timed server-side, correct answers never sent to the client.
- XP caps per day, diminishing XP for re-solving the same exercise.

### 3.4 Time & resets

- Day boundaries in **Asia/Tashkent** (or user timezone stored in profile).
- Weekly leaderboards reset **Monday 00:00 Tashkent**; past weeks are archived (show "last week's winners").

### 3.5 Deferred features — base is built now, switched off

Three things are **not used at launch** but the code is shaped so turning them on is a
config change + one new implementation file, not a refactor.

All switches live in one place, `src/config/features.ts`, read from env:

```ts
export const features = {
  smsOtp:  process.env.FEATURE_SMS_OTP === "true",   // false for now
  redis:   process.env.FEATURE_REDIS === "true",     // false for now
  locales: ["uz"] as const,                          // later: ["uz", "ru", "en"]
};
```

**1. Redis → Postgres implementations behind interfaces**

```
src/lib/leaderboard/  LeaderboardStore  → PostgresLeaderboardStore  (now)  | RedisLeaderboardStore (later)
src/lib/rate-limit/   RateLimiter       → PostgresRateLimiter       (now)  | RedisRateLimiter      (later)
src/lib/cache/        Cache             → MemoryCache / Next cache  (now)  | RedisCache            (later)
```

- Leaderboards from Postgres: `User.xp` / `User.iqRating` with indexes for global boards;
  weekly boards from a `WeeklyScore { userId, tenantId, week, board, value }` table that is
  incremented in the same transaction as each `XpEvent` → ranking is one indexed `ORDER BY`.
  Fine for tens of thousands of users; switch to Redis when it gets slow.
- Rate limiting: small `RateLimitHit` table (key, windowStart, count), cleaned by a pg-boss job.
- Jobs use **pg-boss** now; it can stay even after Redis arrives.
- The rest of the app only imports the interface (`getLeaderboardStore()`), never Postgres/Redis directly.

**2. Only Uzbek language, i18n-ready**

- next-intl is set up from day 1 with `locales: ["uz"]`, `defaultLocale: "uz"`,
  `localePrefix: "as-needed"` → URLs stay clean now (`/dashboard`), and `/ru/dashboard`
  appears automatically when `ru` is added.
- **No hardcoded text in components** — every string goes into `messages/uz.json`.
  Adding Russian later = add `messages/ru.json` + add `"ru"` to the locales list.
- Translatable DB content (track titles, exercise text) stored as JSON: `{ "uz": "..." }`,
  read through a `t(field, locale)` helper that falls back to `uz`.
- `User.locale` column exists (default `"uz"`), language switcher component exists but is hidden while only one locale is enabled.

**3. SMS codes disabled**

- Registration still asks for **phone + username + password**; the phone is normalized to
  `+998XXXXXXXXX`, stored, and marked `phoneVerified = false`.
- `SmsProvider` interface with `DisabledSmsProvider` (logs to console in dev, does nothing in prod).
  Later: `EskizSmsProvider`, `TelegramGatewayProvider`.
- `OtpCode` table and verification screens are created but routes are gated by `features.smsOtp`.
- **Password reset without SMS (for now):** tenant admin / super-admin resets the password
  from the admin panel (user gets a temporary password and must change it on next login).
  Optionally: show **recovery codes** once after registration.
- Risk to accept: someone can register with another person's number. Mitigation: support can
  release a number; when SMS is turned on, existing users are asked to verify on next login
  and unverified duplicates are resolved then.

---

## 4. Features breakdown

### 4.1 Landing page (`gamify.uz`)
- Hero: "Practice exactly the skill you're stuck on" + live mini-demo (interactive useState exercise right on the landing)
- How it works (pick a skill → drill → earn XP → climb the leaderboard)
- Tracks overview (HTML, CSS, JS, TS, React, Next.js, Git, SQL…)
- Gamification showcase (streaks, leaderboards, avatars)
- "For study centers" section → B2B contact form / demo request
- Pricing (later), FAQ, footer
- SEO: SSG, OpenGraph images, public skill pages indexed by Google

### 4.2 Auth
- Register: **phone + username + password** (no SMS verification for now — see §3.5)
- Login: phone **or** username + password
- Forgot password: reset by admin for now; via SMS OTP later
- Later: SMS phone verification, Telegram login, Google login

### 4.3 Dashboard
- Generated avatar (DiceBear, seeded by user id; parts customizable, some unlocked by level)
- **Daily login bonus** (claim button; bonus grows over a 7-day cycle)
- **Streak** counter + streak freeze
- **Daily quiz** (5 questions, same for everyone that day → comparable)
- **Daily problem** (1 coding challenge)
- **Daily IQ test** (short timed logic set)
- "Continue where you left off" + "Skills getting rusty" (spaced repetition)
- XP bar, level, weekly progress, friends' activity

### 4.4 Learning / practice engine (the heart of the product)

Exercise types:
1. Multiple choice
2. Fill-in-the-blank code
3. **Predict the output** ("what does this log?")
4. **Fix the bug**
5. **Write code that passes tests** (JS/TS functions, React components)
6. **Match the design** (HTML/CSS: compare against target visually/DOM checks)
7. Order the lines (drag & drop — great on mobile)

Modes:
- **Learn** — short explanation + guided exercises
- **Drill** — one skill, endless adaptive exercises, mastery bar
- **Review** — spaced repetition across all learned skills
- **Challenge** — harder problems, bigger XP

Mastery model per `(user, skill)`: score 0–100, updated by correctness + speed + hints used, decays over time.

### 4.5 IQ / logic tests
- Item bank: patterns, sequences, matrices, logic, spatial, verbal (uz/ru/en)
- Rating via **Elo / Glicko-2** (question difficulty and user ability rated against each other)
- Displayed as an "IQ score" mapped from rating. ⚠️ Label it honestly (e.g. "Gamify IQ" / "estimated") — it's not a clinical IQ test.
- Needs a large item bank so people can't memorize answers.

### 4.6 Profile
- Avatar, username, level, **XP**, **IQ**, **global rank**, streak, badges
- Skill mastery radar / heatmap (GitHub-style activity calendar)
- Friends list, "Add friend" / "Recommend a problem"
- Privacy settings (hide phone always; profile public/friends-only)

### 4.7 Social
- Friend requests (send / accept / decline / remove / block)
- **Recommend a problem** to a friend ("I think you'll like this one")
- Direct messages (1:1 chat) — start simple (polling/SSE), move to websockets
- Activity feed: "Aziz mastered useState", "Malika got a 30-day streak"
- Reporting & blocking (moderation is required once chat exists)

### 4.8 Leaderboards
- **Global XP**, **Global IQ**
- **Weekly XP**, **Weekly IQ**
- Filters: global / friends / my study center / my group
- Postgres now (`WeeklyScore` table + indexes), Redis sorted sets later via `LeaderboardStore`; weekly snapshot to `WeeklyLeaderboardSnapshot`
- Show your own position even if you're #4 812

### 4.9 Study center (tenant) admin panel — `center.gamify.uz/admin`
Roles: `OWNER`, `ADMIN`, `TEACHER`, `STUDENT` (+ platform-level `SUPER_ADMIN`)
- Branding: logo, colors, name
- Staff management (invite teachers/admins)
- Students: add one-by-one, **bulk import from Excel/CSV**, generate credentials
- **Groups / classes** (e.g. "Frontend Group 12, Mon-Wed-Fri")
- Assign homework: pick skills/exercises + deadline
- Stats: per student, per group, per skill (who's stuck on what)
- Reports: export Excel / PDF, weekly report to teachers
- Custom content: centers create their own exercises
- Internal leaderboards & competitions between groups

### 4.10 Platform super-admin (for us)
- Tenants CRUD, plans, limits (max students), suspend
- Content CMS: tracks, modules, skills, exercises, IQ items; draft → review → publish
- Users moderation, reports, analytics

### 4.11 Responsive
- Mobile-first Tailwind; bottom tab bar on mobile, sidebar on desktop
- Code exercises on mobile: prefer tap-based types (predict output, order lines, fill blank); full editor works but secondary
- PWA (installable, push notifications) — cheap win before native apps

### 4.12 Competitive modes ⚔️

Four features that share one foundation: **server-side judging**, **ratings**, and a
**realtime channel**. Build order: Leagues → Quick Duel → Code Duel → Tournaments → Clans.

#### A. Weekly leagues (Duolingo-style) — cheapest, biggest retention win
- Tiers: **Bronza → Kumush → Oltin → Sapfir → Yoqut → Zumrad → Olmos** (7 tiers)
- Each week users are put into a **cohort of ~30 people** in their tier; ranking = weekly XP
  (reuses the existing `WeeklyScore` table — almost no new infrastructure).
- End of week: **top 7 promote, bottom 5 demote**, middle stays. Top 3 get badges / coins.
- A user joins a cohort only when they earn their first XP of the week → no dead cohorts full of inactive users.
- Monday 00:00 (Tashkent) pg-boss job: finalize results, create next week's cohorts.
- Study centers can choose: students join global leagues, or internal center-only leagues.

#### B. 1v1 duels
Two modes:

| | **Quick Duel** (build first) | **Code Duel** |
|---|---|---|
| Content | 10 fast questions: predict output, find the bug, MCQ | 1–3 coding problems with tests |
| Length | ~3 min | 10–20 min |
| Device | Great on mobile | Desktop / tablet |
| Winner | More correct, then faster | More tests passed, then faster |

- **Matchmaking**: separate **duel rating** (Elo). Queue stored in Postgres (`MatchQueue`);
  match within ±100 rating, window widens every few seconds; after ~30s offer a bot/“ghost” opponent
  (replay of a real past player's run) so nobody waits forever at low traffic.
- **Challenge a friend** by link / from profile / from chat.
- During the duel you see the opponent's **progress** (questions answered, tests passed), never their code.
- After the duel: both solutions shown side by side — a great learning moment.
- **Anti-cheat / anti-farming**: judging only on server; answers never sent to client; leaving = loss;
  rated duels between the same two people limited to 3/day; tab-switch detection only *flags*, doesn't punish.
- **Realtime without Redis**: a separate WebSocket process (`realtime/` in docker-compose) +
  Postgres `LISTEN/NOTIFY` between app and realtime server. Works fine on one server; when we scale
  to several instances, the Redis adapter plugs in (fits the deferred Redis plan, §3.5).

#### C. Tournaments
- Scheduled events with start/end time, registration, a hidden problem set, and a **live scoreboard**.
- Formats:
  - **Sprint** (60–90 min, ICPC-style: points + time penalty per wrong attempt)
  - **Weekly Cup** (every Saturday, fixed time → builds habit)
  - **Knockout bracket** of Code Duels (later)
- Scoreboard freeze in the last 15 minutes → dramatic results reveal.
- Organizers: platform (public tournaments) **and study center admins** (internal exams / contests) — strong B2B feature.
- Load spike at start time: submissions go through a pg-boss judge queue; problems hidden until start.
- Rewards: XP, badges, certificates for top places, sponsor prizes later.

#### D. Clans & Study Center vs Study Center
Two kinds of clans:
- **User clans** (public platform): up to 30 members, leader + officers, name + tag + emblem, clan chat.
- **Center clans**: every study center that opts in automatically becomes a clan of its students.

Competitions:
- **Clan score** = average weekly XP of active members (min. 10 active) — fair between big and small centers,
  not just "who has more students".
- **Clan wars**: two clans, one weekend, members' duels and solved problems add points.
- **Gamify Center Cup** (monthly): public ranking of study centers on `gamify.uz/centers`.
  This is also a **sales tool** — centers will push their students to practice to rank higher,
  and their ranking page is a public advertisement for them (and for us).
- Privacy: cross-center competition is **opt-in** per tenant; other centers see only usernames and avatars.

> Note for multi-tenancy: `User` is global and linked to tenants through `Membership`, so a student
> from center A can duel a student from center B — only allowed if both tenants have opted in.

---

## 5. Data model (first draft, Prisma)

```prisma
model Tenant {
  id        String   @id @default(cuid())
  slug      String   @unique          // "najot" → najot.gamify.uz
  name      String
  logoUrl   String?
  theme     Json?                     // colors etc.
  plan      TenantPlan @default(FREE)
  isActive  Boolean  @default(true)
  domains   TenantDomain[]
  members   Membership[]
  createdAt DateTime @default(now())
}

model User {
  id           String   @id @default(cuid())
  phone        String   @unique
  phoneVerified Boolean @default(false)
  username     String   @unique
  passwordHash String
  avatarSeed   String
  avatarConfig Json?
  timezone     String   @default("Asia/Tashkent")
  locale       String   @default("uz")
  xp           Int      @default(0)
  level        Int      @default(1)
  iqRating     Float    @default(1000)
  iqDeviation  Float    @default(350) // Glicko RD
  currentStreak Int     @default(0)
  longestStreak Int     @default(0)
  lastActiveDay DateTime?
  streakFreezes Int     @default(0)
  sessions     Session[]
  memberships  Membership[]
  createdAt    DateTime @default(now())
}

model Membership {                    // user ↔ tenant with role
  id       String @id @default(cuid())
  userId   String
  tenantId String
  role     Role   // OWNER | ADMIN | TEACHER | STUDENT
  @@unique([userId, tenantId])
}

model Session { id String @id; userId String; tokenHash String @unique; deviceName String?;
  userAgent String?; ip String?; lastActiveAt DateTime; expiresAt DateTime; revokedAt DateTime? }

// Content
model Track    { id, tenantId?, slug, title(Json i18n), order }
model Module   { id, trackId, slug, title, order }
model Skill    { id, moduleId, slug, title, description, prerequisites Skill[] }
model Exercise { id, skillId, tenantId?, type, difficulty, content Json, tests Json?,
                 xpReward, status (DRAFT|PUBLISHED) }

// Progress
model Attempt      { id, userId, exerciseId, correct, timeMs, hintsUsed, code?, createdAt }
model SkillMastery { userId, skillId, score, lastPracticedAt, nextReviewAt  @@id([userId, skillId]) }

// Gamification
model XpEvent      { id, userId, tenantId, amount, reason (LOGIN_BONUS|STREAK|EXERCISE|DAILY_QUIZ|…), refId?, createdAt }
model DailyClaim   { userId, day Date, kind (LOGIN|QUIZ|PROBLEM|IQ)  @@id([userId, day, kind]) }
model IqItem       { id, type, content Json, answer Json, rating Float, locale }
model IqAttempt    { id, userId, itemId, correct, timeMs, ratingBefore, ratingAfter }
model Achievement  { id, key, title, icon, condition Json }
model UserAchievement { userId, achievementId, unlockedAt }
model WeeklyScore  { userId, tenantId, week Date, board (XP|IQ), value  @@id([userId, tenantId, week, board]) @@index([tenantId, week, board, value]) }
model WeeklyLeaderboardSnapshot { week, board (XP|IQ), tenantId?, userId, rank, value }

// Competitive
// User gets: duelRating Float @default(1000), leagueTier LeagueTier @default(BRONZA)
model LeagueCohort { id, week Date, tier, tenantId?  (null = global) }
model LeagueMember { cohortId, userId, result (PROMOTED|STAYED|DEMOTED)?, finalRank?  @@id([cohortId, userId]) }
model MatchQueue   { userId @id, mode (QUICK|CODE), rating, joinedAt }
model Duel         { id, mode, status (WAITING|LIVE|FINISHED|ABANDONED), problemIds, startedAt, endedAt, winnerId?, rated Boolean }
model DuelPlayer   { duelId, userId, score, finishedAt?, ratingBefore, ratingAfter  @@id([duelId, userId]) }
model Tournament   { id, tenantId?, title, format (SPRINT|WEEKLY_CUP|BRACKET), startsAt, endsAt, freezeAt?, visibility }
model TournamentProblem    { tournamentId, exerciseId, points, order }
model TournamentEntry      { tournamentId, userId, score, penalty, rank? }
model TournamentSubmission { id, tournamentId, userId, exerciseId, verdict, submittedAt }
model Clan         { id, type (USER|CENTER), tenantId?, name, tag @unique, emblem, leaderId }
model ClanMember   { clanId, userId, role (LEADER|OFFICER|MEMBER), joinedAt  @@id([clanId, userId]) }
model ClanWar      { id, clanAId, clanBId, startsAt, endsAt, scoreA, scoreB, winnerId? }

// Deferred infrastructure (tables exist, features off)
model OtpCode      { id, phone, codeHash, purpose (VERIFY|RESET), expiresAt, attempts, usedAt? }
model RateLimitHit { key, windowStart, count  @@id([key, windowStart]) }

// Social
model Friendship     { requesterId, addresseeId, status (PENDING|ACCEPTED|BLOCKED), createdAt }
model Recommendation { id, fromId, toId, exerciseId, message?, seenAt? }
model Conversation / Message  { ... }
model Notification   { id, userId, type, payload Json, readAt? }

// B2B
model Group      { id, tenantId, name, teacherId }
model GroupMember{ groupId, userId }
model Assignment { id, tenantId, groupId, title, dueAt, items (skill/exercise ids) }
```

> Rule: **XP is only ever changed by inserting an `XpEvent`** (and updating the cached `User.xp`
> in the same transaction). This gives an audit log, makes weekly XP a simple `SUM` over the
> week, and makes cheating investigations possible.

---

## 6. Project structure

```
gamify/
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (marketing)/            # landing, pricing, for-centers
│  │  │  ├─ (auth)/                 # login, register, forgot
│  │  │  ├─ (app)/                  # dashboard, learn, drill, leaderboard, profile, friends, settings
│  │  │  ├─ admin/                  # tenant admin panel
│  │  │  └─ super/                  # platform super-admin
│  │  └─ api/                       # auth handler, webhooks, SSE
│  ├─ features/                     # feature modules: auth, exercises, gamification, social, tenants…
│  │  └─ <feature>/{components,actions,queries,schemas,store}.ts
│  ├─ config/features.ts            # feature flags: smsOtp, redis, locales
│  ├─ lib/
│  │  ├─ db/                        # prisma (tenant-scoped extension)
│  │  ├─ auth/                      # better-auth setup, session helpers
│  │  ├─ leaderboard/               # LeaderboardStore interface + postgres impl (redis later)
│  │  ├─ rate-limit/                # RateLimiter interface + postgres impl (redis later)
│  │  ├─ cache/                     # Cache interface + memory impl (redis later)
│  │  ├─ sms/                       # SmsProvider interface + disabled impl (eskiz later)
│  │  └─ i18n/                      # next-intl config, t(field) helper for DB JSON
│  ├─ components/ui/                # shadcn primitives
│  └─ middleware.ts                 # tenant + locale + auth resolution
├─ messages/uz.json                 # all UI text (ru.json / en.json later)
├─ prisma/{schema.prisma, seed.ts}
├─ content/                         # exercises as MDX/JSON in git → seeded into DB
├─ workers/                         # pg-boss jobs, code-runner
└─ docker-compose.yml               # postgres, app, worker (redis added later)
```

Keeping **exercises as files in git** (`content/react/state/use-state/*.json`) makes it easy
to write, review and version content; a seed/sync script loads them into the DB.

---

## 7. Roadmap

Estimates assume 1–2 full-time developers. Multi-tenancy is in the schema from Phase 0 even though the admin UI comes in Phase 4.

### Phase 0 — Foundation (1–2 weeks)
- [x] Next.js 16 + TS + Tailwind 4 + ESLint (shadcn/Prettier later)
- [x] Postgres: `gamify` DB + `gamify_app` role on the VPS; local dev via `prisma dev`
- [x] Prisma 7 schema v1 + tenant-scoped Prisma extension (`forTenant`)
- [x] `features.ts` flags + interfaces with Postgres/disabled implementations (leaderboard, rate-limit, cache, sms)
- [x] `proxy.ts` (Next 16 name for middleware) for locale; tenant resolved from Host in `lib/tenant.ts`
- [x] Auth: phone/username + password, sessions, active devices (SMS OTP off)
- [x] Design tokens (per-tenant brand color), app shell (sidebar desktop / bottom bar mobile)
- [ ] CI (lint, typecheck, tests), Sentry

### Phase 1 — MVP: learn & practice (4–6 weeks)
- [ ] Landing page
- [ ] Content model + first content: **JS basics, React state (useState, useEffect)**, HTML/CSS basics
- [ ] Exercise player for all types; CodeMirror editor; in-browser runner (iframe/Sandpack)
- [ ] Drill mode + mastery per skill
- [ ] XP events, levels, daily login bonus, streaks
- [ ] Dashboard with avatar (DiceBear)
- [ ] Profile page (XP, level, streak)
- [ ] Active devices page (list / revoke)
- [ ] Responsive pass on mobile/tablet
- 🎯 **Goal: 20–50 beta users using Drill mode daily**

### Phase 2 — Daily loop & rankings (3–4 weeks)
- [ ] Daily quiz, daily problem
- [ ] IQ test module + Glicko rating + item bank v1 (≥300 items)
- [ ] Leaderboards: global XP / IQ, weekly XP / IQ (Postgres `WeeklyScore`) + weekly reset job (pg-boss) + archive
- [ ] Achievements / badges
- [ ] Server-side verification of submissions (anti-cheat) — foundation for duels & tournaments
- [ ] **Weekly leagues** (7 tiers, cohorts of 30, promotion/demotion job) — reuses `WeeklyScore`
- [ ] Notifications (in-app + Telegram bot reminders "your streak is at risk")

### Phase 3 — Social (3–4 weeks)
- [ ] Friends (requests, list, block)
- [ ] Recommend problems to friends
- [ ] Friends leaderboard, activity feed
- [ ] Direct messages (SSE → websockets)
- [ ] Moderation: report / block, rate limits

### Phase 4 — Competitive (4–6 weeks)
- [ ] WebSocket server process + Postgres `LISTEN/NOTIFY`
- [ ] **Quick Duel**: matchmaking queue, duel rating (Elo), ghost opponents, challenge-a-friend
- [ ] **Code Duel**: server-judged coding problems, opponent progress, side-by-side solutions after
- [ ] **Tournaments**: Sprint + Weekly Cup, registration, live scoreboard with freeze, judge queue
- [ ] **User clans**: create/join, roles, clan chat, clan weekly score, clan wars

### Phase 5 — B2B / study centers (4–6 weeks)
- [ ] Tenant onboarding (super-admin creates tenant, wildcard DNS + TLS)
- [ ] Branding (logo, colors, name)
- [ ] Admin panel: staff, students (bulk import), groups
- [ ] Homework assignments with deadlines
- [ ] Stats dashboards + Excel/PDF reports
- [ ] Tenant custom content
- [ ] Tenant leaderboards, group vs group
- [ ] Center-created tournaments (internal exams / contests), internal leagues option
- [ ] **Center clans + Gamify Center Cup** (opt-in, public `gamify.uz/centers` ranking)
- [ ] Plans & limits, billing (Click / Payme)

### Phase 6 — Turn on deferred features (when needed)
- [ ] SMS: implement `EskizSmsProvider`, set `FEATURE_SMS_OTP=true` → phone verification + self-service password reset; ask existing users to verify
- [ ] Russian / English: add `messages/ru.json`, `en.json`, add locales, show language switcher, translate content JSON
- [ ] Redis: add to docker-compose, implement `Redis*` stores, set `FEATURE_REDIS=true` (trigger: leaderboard queries getting slow or multiple app instances)

### Phase 7 — Scale & polish (ongoing)
- [ ] PWA + push notifications
- [ ] Performance: caching, DB indexes, load tests
- [ ] Analytics (PostHog): retention, funnel, which skills people struggle with
- [ ] Accessibility, SEO for public skill pages

---

## 8. Future ideas

**Learning**
- 🤖 **AI tutor**: explains *why* your code is wrong, gives graded hints (hint costs XP)
- 🤖 **AI-generated exercise variations** so Drill mode never runs out (reviewed by humans / verified by tests)
- "I'm stuck on X" → paste your error/code and get the right skill drill recommended
- Mini-projects (build a todo app step by step, each step = one skill)
- More tracks: Git, SQL, Node.js, Next.js, Python, algorithms, English for developers
- Code-reading exercises from real open-source code
- Certificates (verifiable link / QR) after finishing a track

**Game mechanics**
- ✅ Duels, leagues, tournaments, clans → now planned in §4.12
- Knockout brackets, 2v2 team duels, duel spectating & replays
- Seasons with themed rewards
- Avatar shop: spend coins (second currency) on avatar items, themes, streak freezes
- Boss battles: a big problem at the end of each module

**Social / community**
- Peer code review (review others' solutions for XP)
- Discussion under each problem (after solving), best solutions voting
- Mentors: top users help beginners, get "Mentor" badge

**B2B**
- **Parent accounts**: parents see child's progress, get weekly Telegram report
- Attendance + homework in one place (lightweight LMS)
- Plagiarism detection between students' solutions
- Entrance tests for study centers (placement exams)
- Custom domains (`learn.center.uz`)
- API / LMS integrations

**Career**
- Portfolio page generated from solved problems & projects
- Job board / internships: companies hire top-ranked learners (possible revenue stream)
- Mock interview mode (timed JS/React interview questions)

**Platform**
- Native mobile app (React Native / Expo) after PWA proves demand
- Offline mode for quizzes
- Telegram Mini App version (huge audience in Uzbekistan)

---

## 9. Monetization (to decide)

- **B2C freemium**: free daily loop; Premium = unlimited drills, AI tutor, streak freezes, no limits
- **B2B per-student/month** subscription for study centers (main revenue early on)
- Sponsored contests, hiring partners

---

## 10. Open questions

1. Team size & target launch date?
2. Hosting: local UZ provider (data law) — which one?
3. Who writes the content? (Content is the real bottleneck: target ~30–50 exercises per skill.)
4. Is "IQ" required as a name, or OK to call it "Logic rating"?
5. Should study-center students also appear on the global leaderboard?
6. Minimum age of users (affects chat moderation & privacy)?
7. Password reset while SMS is off: admin reset only, or also recovery codes at registration?
