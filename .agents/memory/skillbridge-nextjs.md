---
name: SkillBridge Next.js setup
description: Key architectural decisions, supabase-js type quirks, and DB safety patterns for the SkillBridge marketplace app.
---

## Supabase client typing — use `createClient<any>`

**Rule:** Do NOT use `createClient<Database>()` with a hand-written Database type.

**Why:** supabase-js v2.110+ changed internal `GenericTable` constraints so that
hand-written `Database` types cause `insert()`/`update()`/`upsert()` parameter types
to resolve to `never[]`/`never`, breaking all write calls.

**How to apply:** Use `createClient<any>()` and cast query results to our own types
(`as unknown as ProjectRow`). Keep the full type library in `src/types/database.ts`
for UI-level type safety — it just doesn't plug into the Supabase client generic.

## Database type — `Relationships: []` not `Relationships: never[]`

`never[]` causes inference failures in supabase-js. Use the empty tuple `[]`.

## RLS — three-layer defence

1. **Row-level SELECT/INSERT policies** — in `supabase/rls.sql`
2. **Immutable column trigger** (`protect_proposal_immutable_columns`) — prevents
   owners from tampering with `project_id`, `freelancer_id`, `cover_letter` via UPDATE
3. **Unique partial index** (`idx_proposals_one_accepted_per_project`) — prevents
   race-condition double-accept at the DB level

## Project status lifecycle

Enforced by `trg_project_status_lifecycle` trigger:
- `open → in_progress` only when an accepted proposal exists
- `in_progress → completed` freely
- All other transitions raise an exception

## Middleware auth check

The middleware does a **lightweight JWT expiry check** (decode payload, check `exp`)
without a network call. This is intentionally not a full signature verification —
full auth happens inside each page via `useAuth()` / Supabase SDK.

Cookie name pattern: `/-auth-token/` (regex match handles all supabase-js versions).

## Hydration warning

Use `suppressHydrationWarning` on any element that renders `new Date()` output or
other values that differ between server (SSR) and client render time.
Root `<body>` also has it to catch global mismatches.

## Chat system

Not implemented. Chat is scoped to accepted proposals only (per spec), but has
not been built yet. No random user-to-user chat.
