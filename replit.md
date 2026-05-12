# Good Deal

Good Deal is a telecom internet bundle marketplace for Cameroon. Users can browse and buy MTN and Orange data bundles via Mobile Money (MTN MoMo / Orange Money).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 / 8080 in dev)
- `pnpm --filter @workspace/good-deal run dev` — run the frontend (auto-assigned port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — for auth token hashing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter (routing) + TanStack Query + shadcn/ui + Tailwind CSS v4
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/good-deal/src/` — React frontend
  - `pages/` — Home, OperatorBundles, Checkout, PaymentSuccess, Dashboard, Login, Register, Admin, AdminBundles, AdminOrders, AdminUsers
  - `components/` — Navbar, BottomNav, shadcn/ui components
  - `contexts/auth-context.tsx` — Auth state (token stored in localStorage as `gd_token`)
  - `lib/api.ts` — Utilities (formatFCFA, formatDate, status helpers)
- `artifacts/api-server/src/routes/` — Express routes (auth, operators, bundles, orders, payments, users, stats)
- `lib/db/src/schema.ts` — Drizzle ORM schema (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks

## Architecture decisions

- **Token auth via localStorage**: Auth token is `SHA256(userId + SECRET)` stored as `gd_token`. The `setAuthTokenGetter` from custom-fetch is configured in `main.tsx` to inject it into all API calls.
- **Demo payment mode**: All payments are simulated — no real Mobile Money integration. The `/api/orders/:id/pay` endpoint always succeeds in demo mode.
- **Contract-first API**: OpenAPI spec drives codegen for hooks and Zod schemas. Always update `openapi.yaml` first, then run codegen.
- **Operator ID convention**: MTN = id 1, Orange = id 2. Operator colors: MTN=#FFD700, Orange=#FF6B00.

## Product

- **Home** `/` — Hero + operator picker cards + how it works + features
- **Operator Bundles** `/operator/:id` — Grid of bundles for MTN or Orange
- **Checkout** `/checkout?bundleId=N` — Phone entry + payment method selector + pay button
- **Payment Success** `/payment/success` — Receipt with transaction ID
- **User Dashboard** `/dashboard` — Order history + stats + account info
- **Admin** `/admin` — Revenue charts + order stats + popular bundles
- **Admin Bundles** `/admin/bundles` — Full CRUD for bundle management
- **Admin Orders** `/admin/orders` — All orders table
- **Admin Users** `/admin/users` — All users table

## User preferences

- French language for all UI text (Cameroonian market)
- Prices displayed in FCFA format

## Seeded test accounts

- Admin: `admin@gooddeal.cm` / `admin123`
- Demo user: `demo@gooddeal.cm` / `user123`

## Gotchas

- The seed script uses `SESSION_SECRET` env var for hashing admin password. If the env var differs from `good-deal-secret`, re-run seed: `pnpm --filter @workspace/db run seed`
- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- Do not run `pnpm dev` at workspace root — use individual workflow restarts

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
