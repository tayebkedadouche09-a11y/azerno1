# AZRNOU — Gestion Fromagerie & Élevage

Production-oriented business management application for dairy, cheese production and livestock.

## Architecture

- **Frontend**: React + TypeScript + Tailwind + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with multi-tenant schema, RLS, constraints, idempotency keys, audit log
- **Auth**: JWT + bcrypt, company memberships (owner / manager / worker)
- **Offline**: IndexedDB queue + sync engine; localStorage for UI prefs only during migration

## Quick start

```bash
npm install
# PostgreSQL required
export DATABASE_URL=postgresql://azrnou:azrnou_dev_pass@localhost:5432/azrnou
npm run migrate
npm run seed
npm run dev:server   # :4000
npm run dev          # :3000
```

Seed: `karim@azrnou.dz` / `azrnou123`

## Migrations

1. `001_init.sql` — companies, users, memberships, sessions, audit, idempotency, sync_ops
2. `002_business_entities.sql` — customers, products, orders, payments, inventory, production, livestock, feed, etc.
3. `003_rls_policies.sql` — FORCE RLS + app.company_id session helpers
4. `004_app_role.sql` — non-superuser `azrnou_app` runtime role

## Local sync note

Full local git history may live only on the development machine until `git push` with credentials.
Branch `sync-local-backend` is used to publish file contents via GitHub API when git push is unavailable.
