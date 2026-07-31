# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PIPSNOTE** — Forex/Crypto affiliate blog targeting EU/US traders. Next.js 16 (App Router) + TypeScript + MySQL + Redis + Meilisearch stack.

**Current Status (2026-07-31):** Follow the roadmap in `task.md` (sections 0–9). Done: project init, DB schema (`db/changelog/001`–`004`), design tokens (`app/globals.css`, `tailwind.config.ts`), logging infra (`lib/logger.ts`/`logSink.ts`/`withApiHandler.ts`), security (rate-limit + login-guard wired in `middleware.ts`), admin auth (`app/api/admin/auth/*`) and admin settings API/page. **Not yet built:** homepage/content UI (`app/page.tsx` is still a placeholder), `components/` (empty), `/admin/logs` UI, affiliate `go/[slug]` redirect, any business features (posts, brokers, reviews) from `task.md` §7, and Meilisearch integration (documented in `docs/`/`spec (1).md`/deploy scripts, but no `lib/meilisearch.ts` or app code references it yet).

**Port:** `docker-compose.prod.yml` maps host `5601` → container `3000` (changed from 5600 in the latest commit to avoid a conflict with `ava-agent`). Note: `DEPLOY.md`, `scripts/deploy.sh`, `scripts/quick-deploy.sh`, and `scripts/vps-deploy.sh` still hard-code `5600` for health checks/nginx upstream — this is a known inconsistency post-port-change, not yet reconciled. Check `docker-compose.prod.yml` for the source of truth before assuming either number.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, React Server Components
- **Backend:** Next.js Route Handlers, Pino logger, Zod validation
- **Database:** MySQL 8 (shared `shared-mysql` container, dedicated `pipsnote` database), `mysql2` driver (no ORM)
- **Cache/Session:** Redis (`ioredis`, dedicated `pipsnote-redis` container, internal-only)
- **Search:** Meilisearch (dedicated `pipsnote-meilisearch` container, internal-only) — **planned, not yet wired into app code**
- **Deploy:** Docker Compose, GitHub Actions CI/CD, Ubuntu VPS (shared infrastructure)
- **Backup:** Cloudflare R2 + openssl AES-256-CBC encryption

## Critical Rules (NEVER violate)

### 1. Error Handling & Logging (`docs/LOGGING_STANDARD.md`)
- **ALL** Route Handlers (`app/api/**/route.ts`) MUST wrap via `withApiHandler()` — no manual try-catch.
- Log full stacktrace+message server-side (Pino structured JSON), return generic messages to client (never leak stacktrace/SQL/internal paths).
- `warn`/`error`/`fatal` logs persist to `system_logs` table (fire-and-forget, non-blocking).
- NO `console.log` in business code — use `lib/logger.ts`.

### 2. Security (`docs/SECURITY_DETECTION.md` + spec §16)
- Input validation via Zod at ALL boundaries (admin forms, public API, webhook).
- `/admin/**` routes MUST use rate-limit + login-guard (`checkRateLimit`, `recordLoginFailure`, `isIpBlocked`) wired in `middleware.ts`.
- NO hardcoded secrets/tokens — all from `.env` (see `.env.example` template).
- NEVER log password/token plaintext (even in `system_logs`).
- `admin_audit_log` (business/security audit) and `system_logs` (tech errors) are SEPARATE tables.

### 3. Design Tokens (`docs/DESIGN_SYSTEM.md`)
- `--ink` is for TEXT COLOR ONLY. Any always-dark background block (ticker, badge, hover fill) uses `--surface-dark`, NOT `--ink`.
- NO hardcoded hex colors in components — use Tailwind tokens (`bg-brand`, `text-up`, `bg-surface-dark`) mapped to CSS variables.
- `--up`/`--down` MUST include ▲▼ icons next to numbers (accessibility, not color-only).

### 4. Admin Settings (`docs/ADMIN_SETTINGS.md`)
- All theme/layout values displayed on site MUST read from `site_settings` table (via `getSiteSettings()`, Redis cache-aside 300s).
- Editing `site_settings` ONLY via `/api/admin/settings` (role `superadmin`), must call `invalidateSiteSettingsCache()` + log to `admin_audit_log`.

### 5. Database Migrations
- **NO ORM auto-migrate.** All schema changes MUST be new `.sql` files in `db/changelog/<NNN_batch>/`, run via `scripts/db-changelog.sh` (Flyway-style).
- Naming: `003_xxx/`, `004_xxx/`... (ascending order). NEVER edit already-applied files — add new files to fix.
- Run `bash scripts/db-changelog.sh` locally after adding migrations to test before commit.

## Directory Structure

```
E:\DEVELOP\PDHOAN\
├── .github/workflows/    # CI/CD: deploy.yml, backup.yml
├── db/changelog/         # SQL migrations (versioned, Flyway-style)
│   ├── _init/           # (skip in scan) — manual one-time schema init
│   ├── 001_*/           # Batch 1, 002_*/ Batch 2, etc.
│   └── README.md        # Migration conventions
├── docs/                # Standards documentation
│   ├── ADMIN_SETTINGS.md    # Runtime theme/layout config via DB
│   ├── DESIGN_SYSTEM.md     # CSS tokens, 3 color presets
│   ├── LOGGING_STANDARD.md  # Pino structured logging + UI
│   └── SECURITY_DETECTION.md # 3-layer defense (Cloudflare+Fail2ban+app)
├── scripts/             # DevOps scripts
│   ├── setup-server.sh      # VPS first-time setup
│   ├── deploy.sh            # Zero-downtime deploy (via CI or manual)
│   ├── db-changelog.sh      # Run pending SQL migrations (fatal on error)
│   ├── backup-mysql.sh      # Encrypted backup → R2 (daily cron)
│   ├── restore-mysql.sh     # Restore from backup (interactive confirm)
│   └── ...
├── security/fail2ban/   # Fail2ban filters+jails (copy to /etc/fail2ban/)
├── index.html           # Design prototype (NOT production app)
├── spec (1).md          # Full feature spec (134KB — reference, not scaffold)
├── task.md              # Implementation roadmap checklist
├── DEPLOY.md            # Infra architecture + deploy guide
├── .env.example         # Template (copy → .env.local for dev)
└── docker-compose.prod.yml  # Production containers
```

**Current app code** (`components/` exists but is still empty — no shared UI extracted from `index.html` yet):
```
app/
├── layout.tsx                          # Root layout
├── page.tsx                            # Homepage — still placeholder, not built out
├── globals.css                         # Design tokens (CSS vars, copied from index.html)
├── admin/
│   ├── login/page.tsx
│   └── settings/page.tsx               # Edit site_settings (superadmin only)
└── api/
    ├── health/route.ts                 # Used by deploy.sh health check
    └── admin/
        ├── auth/login/route.ts
        ├── auth/logout/route.ts
        ├── settings/route.ts           # GET/PATCH site_settings
        └── settings/preset/route.ts    # Switch color preset

lib/
├── logger.ts            # Pino instance
├── logSink.ts            # persistLog() → system_logs table
├── withApiHandler.ts     # HOF wrapper — every app/api/**/route.ts must use this
├── auth.ts               # verifyToken(), AdminUser type, session token logic
├── getAdminUser.ts       # getAdminUser() / requireAdmin(allowedRoles) — read admin_token cookie
├── settings.ts           # getSiteSettings() + invalidateSiteSettingsCache() (Redis cache-aside 300s)
├── settingsPresets.ts    # 3 built-in color presets
├── redis.ts              # ioredis client
└── security/
    ├── rateLimiter.ts    # checkRateLimit(ip, pathname) — Redis sliding window
    └── loginGuard.ts     # recordLoginFailure() + isIpBlocked()

middleware.ts             # Edge checks on /api/:path* and /admin/:path*: isIpBlocked() first, then checkRateLimit() for /api/admin/*
tailwind.config.ts        # Maps design tokens to Tailwind (theme.extend.colors)
```

**Still to build** (see `task.md` §7 for order): homepage/article/category pages, `components/` (Header, TickerStrip, etc. — port from `index.html`, keep Tailwind token classes, don't hardcode new colors), `/admin/logs` UI, `app/go/[slug]/route.ts` affiliate redirect + click tracking, Meilisearch client + indexing.

## Common Commands

### Development (when app exists)
```bash
npm install                    # Install dependencies
npm run dev                    # Start dev server (default port 3000)
npm run build                  # Production build (check before deploy)
npm run lint                   # ESLint check
npm run type-check             # TypeScript validation (if script exists)
```

### Database
```bash
# Run pending migrations (local dev or production — always safe to re-run)
bash scripts/db-changelog.sh

# Create new migration
mkdir -p db/changelog/00X_feature_name
# Then add SQL file: db/changelog/00X_feature_name/001_description.sql
```

### Deploy (VPS)
```bash
# First-time VPS setup (run once on fresh server)
bash scripts/setup-server.sh

# Manual deploy (SSH to VPS first)
bash scripts/deploy.sh        # Full: db-changelog → build → zero-downtime up

# Quick deploy (skip db-changelog — only if schema unchanged)
bash scripts/quick-deploy.sh

# CI/CD auto-deploy on push to main (configured in .github/workflows/deploy.yml)
```

### Backup & Restore
```bash
# Manual backup (also runs daily via cron 1:30 AM VN time)
bash scripts/backup-mysql.sh

# Restore from latest backup (interactive confirm)
bash scripts/restore-mysql.sh latest

# Restore specific date (auto-fetches from R2)
bash scripts/restore-mysql.sh --from-r2 --force 2026-07-15
```

### Docker
```bash
# Production compose (on VPS)
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f pipsnote-app --tail=200
docker compose -f docker-compose.prod.yml ps

# Health check
curl http://localhost:5600/api/health
```

## Architecture Notes

### Multi-Tenant VPS Infrastructure
- Shares `shared-nginx` (reverse proxy) + `shared-mysql` (MySQL server) with other projects (NoiThat2026, VietNet2026).
- Dedicated containers: `pipsnote-app` (Next.js), `pipsnote-redis`, `pipsnote-meilisearch`.
- Networks:
  - `webphoto_backend` (external, shared) — connects to `shared-mysql`
  - `pipsnote_internal` (bridge, `internal: true`) — app ↔ redis ↔ meili, never internet

### Design System — Runtime Theming
Three color presets (Editorial Red / Fintech Blue / Crypto Neon) swappable via admin UI without code changes. All colors use CSS variables (`--bg`, `--ink`, `--surface-dark`, `--red`, `--up`, `--down`) injected dynamically from `site_settings` table → root `<style>` tag. See `docs/DESIGN_SYSTEM.md` for token mapping.

### Logging — Dual-Track
- **`system_logs`** (tech): request errors, exceptions, stacktraces → admin UI `/admin/logs` (superadmin only)
- **`admin_audit_log`** (business): user actions (login, publish, edit affiliate_url) → compliance/security

### Security — 3-Layer Defense
1. **Cloudflare edge:** DDoS, bot, WAF (configured outside repo)
2. **Nginx + Fail2ban:** Brute-force/scan detection via access log patterns → auto-ban IP (filters in `security/fail2ban/`)
3. **App-level (Redis):** Login lockout (≥10 fails/10min → block 1h), rate-limit per route → `middleware.ts` blocks BEFORE route handler runs

### Migration System
Versioned SQL files (`db/changelog/<batch>/<file>.sql`) run exactly once. Tracking table `schema_changelog` records applied migrations. Script `db-changelog.sh` (called by `deploy.sh`) fails deploy if migration errors — zero-downtime safety. No ORM migration tooling — SQL is single source of truth.

## Key Files Reference

| Path | Purpose |
|------|---------|
| `task.md` | Implementation roadmap (0→9: init project → build features → deploy) |
| `DEPLOY.md` | VPS setup, CI/CD, backup/restore procedures |
| `spec (1).md` | Full feature specification (134KB) — detailed requirements |
| `.env.example` | Environment variables template (copy to `.env.local` for dev) |
| `db/changelog/README.md` | Migration naming conventions |
| `docs/LOGGING_STANDARD.md` | Pino setup, `withApiHandler()` pattern, admin UI spec |
| `docs/SECURITY_DETECTION.md` | Rate-limit, login-guard, Fail2ban configs |
| `docs/DESIGN_SYSTEM.md` | CSS token system, 3 color presets |
| `docs/ADMIN_SETTINGS.md` | Runtime theme editor (`/admin/settings`) |
| `scripts/db-changelog.sh` | Run pending migrations (Flyway-style) |
| `scripts/deploy.sh` | Zero-downtime deploy (db-changelog → build → up) |
| `scripts/backup-mysql.sh` | Encrypted backup pipeline (mysqldump → gzip → openssl → R2) |

## Testing

### Before Deploy Checklist (from `task.md`)
```bash
npm run build              # Must pass
npm run lint               # Must pass
bash scripts/db-changelog.sh  # Test migrations on fresh DB
```

### Manual Testing (when app exists)
- Rate-limit test: 11 consecutive failed logins → 12th request should 403
- Dark mode toggle: switch theme, verify `--surface-dark` stays consistent
- Preset change: `/admin/settings` → select different preset → site updates without redeploy
- Playwright: Mobile viewport (375px) for homepage + admin login

### Restore Testing (REQUIRED monthly)
Run `bash scripts/restore-mysql.sh latest` on non-prod environment. Log results in `docs/dar/` if issues found. **Untested backups = no backups.**

## Notes for Claude Code

### Continuing `/build` (Sections 0–6 Done, 3/7 Partial)
1. Review `task.md` roadmap (sections 0–9) — implementation order already decided; §3 (component extraction) and §7 (business features) are next
2. Follow scaffolding standards in `docs/` — don't reinvent patterns already implemented in `lib/`
3. `withApiHandler()`, `getSiteSettings()`, `recordLoginFailure()` — code samples in docs are canonical patterns, already implemented; reuse them, don't re-derive
4. Test logging/security locally BEFORE first deploy (easy to miss wrapper on new routes)

### When Adding Features (Post-Init)
- New route handler? → wrap via `withApiHandler(moduleName, handler)`
- New admin action? → log to `admin_audit_log`
- New error case? → throw Error (caught by wrapper) + verify shows in `/admin/logs`
- Schema change? → new SQL file in next `db/changelog/<batch>/`, test via `db-changelog.sh` locally

### Deployment Safety
- `deploy.sh` runs `db-changelog.sh` with `set -e` → migration failure STOPS deploy (protects production)
- Never `--skip-migrations` flag in deploy unless you added it yourself AND schema unchanged (use `quick-deploy.sh` instead)
- Secrets sync: CI pulls from GitHub Secrets → `.env` on VPS automatically (see `.github/workflows/deploy.yml`)

### Don't Repeat Yourself
If it's in `docs/`, `task.md`, or `spec (1).md`, treat it as decided spec — don't ask "should we use X?" if the doc already mandates it. Ask only when genuinely ambiguous (e.g., user-facing copy, edge-case UX).
