# Webser

A web-design sales business platform: find local businesses, sell them websites, and manage the whole lifecycle from one dashboard.

This is **Phase 1** of a 5-phase build: project foundation, authentication, dashboard, and a complete Prospect/CRM system. See the "Roadmap" section below for what's next.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth.js · Zod

## 1. Get a free Postgres database (2 minutes)

Pick one:

- **Neon** (recommended): [neon.tech](https://neon.tech) → New Project → copy the connection string.
- **Supabase**: [supabase.com](https://supabase.com) → New Project → Settings → Database → connection string (use the "Transaction" pooler URI for `DATABASE_URL`).

## 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — paste your Postgres connection string.
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32` (or any random 32+ character string).
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the login you'll use to access the dashboard.

Leave the Stripe/Resend/Cloudflare/R2 keys blank for now — they're used starting in Phase 3/4.

## 3. Install & set up the database

```bash
npm install
npm run db:migrate   # creates all tables from prisma/schema.prisma
npm run db:seed      # creates your admin login + sample pricing/prospects
```

## 4. Run it locally

```bash
npm run dev
```

Visit `http://localhost:3000` → you'll be redirected to `/login`. Sign in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in `.env`.

## What's in Phase 1

- Secure admin login (bcrypt-hashed password, JWT session, `/admin/*` routes gated server-side)
- Dashboard with real stats pulled from the database (prospects by stage, activity feed, revenue placeholder)
- Full Prospect CRM: create, edit, delete, search, filter by status, sort by any column
- Activity timeline per prospect (calls, emails, notes, automatic status-change log)
- Every field from your spec: business info, contact info, address, current website, GMB URL, socials, notes, status, estimated price, follow-up date, source

The sidebar shows the rest of the workflow (Previews, Templates, Pricing, Clients, Analytics, Settings) grayed out with a "Phase N" tag, so the full intended product is visible even before it's built.

## Roadmap

| Phase | Scope |
|---|---|
| 1 ✅ | Foundation, auth, dashboard, Prospect CRM |
| 2 | Template library + structured Preview editor + public `/p/[slug]` landing page |
| 3 | Stripe (invoices/deposits), Client Portal, onboarding, revisions, approval flow |
| 4 | Domain workflow + Cloudflare Pages deployment automation |
| 5 | Analytics, email automation (Resend), branding/settings, maintenance subscriptions |

## Deploying to production

1. Push this repo to GitHub.
2. Import it into **Vercel** (Pro plan — the Hobby/free plan's terms prohibit commercial client-facing use, and this is a commercial tool).
3. Add all `.env` variables in Vercel's Project Settings → Environment Variables.
4. Point `DATABASE_URL` at your production Postgres (same Neon/Supabase project, or a separate prod project).
5. Run `npx prisma migrate deploy` against production (Vercel can run this automatically via a build step, or run it manually once from your machine with the prod `DATABASE_URL`).
6. Set `NEXTAUTH_URL` to your real domain.

Client websites themselves (once Phase 4 is built) deploy separately to **Cloudflare Pages**, not Vercel — see the architecture notes in this conversation for why.

## Project structure

```
prisma/
  schema.prisma     — full data model (prospects, previews, projects, invoices, etc.)
  seed.ts           — creates admin user + sample data
src/
  app/
    login/           — admin login
    admin/
      layout.tsx     — auth-gated shell (sidebar + topbar)
      dashboard/     — stats + activity
      prospects/     — CRM: list, new, detail/edit, server actions
    api/auth/        — NextAuth route handler
  components/
    ui/              — Button, Input, Card, Badge, etc.
    admin/           — Sidebar, Topbar, StatCard, ActivityItem
    prospects/       — ProspectForm, StatusBadge, LogActivityForm, DeleteProspectButton
  lib/
    prisma.ts        — Prisma client singleton
    auth.ts           — NextAuth config
    prospect.ts        — status labels/colors, category list
    validations/       — Zod schemas
```
