# AZRNOU — PC production deployment

## Requirements
- Node.js 20+
- PostgreSQL 16+
- Git

## 1. Clone and install
```bash
git clone https://github.com/tayebkedadouche09-a11y/azerno1.git
cd azerno1
git checkout azrnou-p1-verify5
npm install
```

## 2. Environment
```bash
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/azrnou
JWT_SECRET=change-me-to-a-long-random-string
API_PORT=4000
CORS_ORIGIN=http://localhost:4173,http://localhost:5173
```

## 3. Database
```bash
createdb azrnou
npm run db:migrate
```

## 4. API
```bash
npm run server
```
Health: `GET http://localhost:4000/api`

## 5. Frontend (production)
```bash
npm run build
npx serve dist -l 4173
```

## 6. Android (Capacitor)
```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
App ID: `dz.azrnou.app`

## 7. PWA
Build then open over HTTPS/localhost. Manifest + service worker in `public/`.

## 8. Quality checks
```bash
npm run lint
npx tsx --test server/__tests__/integration.test.ts server/__tests__/idempotency.test.ts
psql "$DATABASE_URL" -f server/__tests__/rls_proof.sql
npm run build
```
