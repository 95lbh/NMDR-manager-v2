# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

N.M.D.R 배드민턴 매니저 — a badminton club attendance + game-matching/court-management PWA. Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind v4, backed by Supabase (Postgres + realtime). Deployed on Vercel (`95lbh/NMDR-manager-v2`, auto-deploy on `main`). UI text and code comments are in Korean.

**`AGENTS.md` is a deep reference** (Korean): Supabase table schemas, `supabase-db.ts` function signatures, matching algorithms, component detail. Useful for schema/DB work, but note it predates the 2026-07 refactor below — where they disagree, this file and the code win.

## Commands

```bash
npm run dev              # dev server (localhost:3000)
npm run build            # production build (also runs lint + typecheck)
npm run start            # serve production build
npm run lint             # ESLint (next/core-web-vitals + next/typescript)
npm run analyze          # build with bundle analyzer (ANALYZE=true)
```

- **No test framework is configured** — there are no tests and no `test` script. Don't assume `npm test` exists. Verify changes with `npm run build`.
- `npm run build-production` (and `generate-icons`) require the **`sharp` package, which is NOT in `package.json`** — run `npm install sharp` first or it fails. `sharp` is only needed to regenerate PWA icons from `public/icons/icon.png`; plain `npm run build` does not need it.
- Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `src/lib/supabase.ts`).

## Architecture

Three pages under `src/app/` (`attendance/`, `game/`, `settings/`), all `"use client"`. `game/page.tsx` (~1,400 lines) is the core and the hardest to reason about.

**Data flow:** `src/lib/supabase-db.ts` is the single DB access layer — every table read/write and the realtime subscription live there as plain async functions. All dates key on `todayKey()` (`YYYY-MM-DD`, **local** time), so the app is inherently "today-scoped."

**Game state is a single Supabase-backed path** (the app previously had three overlapping client state layers — two were stubs and were removed in the 2026-07 refactor). In `game/page.tsx`:
- Local `useState` (`courts`, `teams`, `availablePlayers`) drives the UI.
- **Save:** a single debounced `useEffect` — when `courts`/`teams` change, after 500ms it calls `saveCurrentGameState()` → `saveGameState()` upsert into `game_states` (jsonb `teams`/`courts`, PK = date). Per-action handlers only `setState`; they do **not** save directly.
- **Load/sync:** `subscribeToGameState()` realtime channel + `loadGameStateFromDB()` on mount.
- **⚠️ Infinite-loop guard (critical):** Supabase `postgres_changes` echoes your own writes back. `serializeGameState()` builds a signature of the meaningful state; `lastSyncedSignatureRef` holds the last saved/received one. The subscription callback ignores an incoming state whose signature matches (it's your echo), and the save effect skips saving when the current signature already matches. **Preserve both guards** or you resurrect the "save↔subscribe" loop that crashed tablets after ~2 hours.

**Player stats are batch-loaded — never N+1.** `loadPlayersWithStats()` gathers today's attendees, then calls `getTodayPlayerStatsBatch()` (one `.in()` query + one batched `upsert` for missing rows). Initial load / refresh button / all reuse it. Game end uses `updatePlayerGameStatsBatch()` (single upsert for the 4 players) plus optimistic `+1`. **Do not** reintroduce per-player `getTodayPlayerStats`/`updatePlayerGameStats` in a loop — that was the ~65-query, ~9s tablet load.

**Elapsed-time timers are isolated:** each playing court renders `<CourtTimer>` (its own 1s interval), so the whole game board does not re-render every second.

## Type definitions

`Player`, `Team`, `Court` are defined **locally in `game/page.tsx`** (with `skill: Skill`). There is no shared `types/game.ts` (removed). Genuinely shared types live in:
- `src/types/db.ts` — `Skill`, `Gender`, `Member`, `AttendanceParticipant`, `PlayerGameStats`, and the Supabase-shaped `GameState`/`GameTeam`/`GameCourt` (note: `GameCourt.startedAt` is an ISO **string**, while the local `Court.startedAt` is a **Date** — convert at the boundary).
- `src/types/settings.ts` — `AppSettings`, `DEFAULT_SETTINGS`.

`usePreventDuplicate` (dedupes concurrent async by key) lives in `src/hooks/usePreventDuplicate.ts` and is used by the attendance page.

## Other notes

- **Production logs are stripped:** `next.config.js` `compiler.removeConsole` drops `console.*` (except `console.error`) in production builds. Leaving debug `console.log` in source is harmless for prod, but they still show in dev.
- **Timezone:** every date key uses `todayKey()` (local). Don't use `new Date().toISOString().split('T')[0]` (UTC) for keys — that desyncs game state from attendance around midnight.
- **Guest attendance removal** (`removeAttendance`, `supabase-db.ts`): guests have no unique id, so removal deletes only the **first matching row by name** (not all same-named guests). Members delete by `member_id`.
- **Reset order matters** (FK constraints): `resetStatisticsData` deletes `game_stats → attendance_participants → attendances → game_states`; `resetMembersData` deletes `attendance_participants → game_stats → members`.
- **Service worker** (`public/sw.js`): navigations are Network-first (avoids stale deploys); runtime cache is capped (`trimCache`). Bump `CACHE_NAME` on deploy to purge old caches.
- **Native `alert()`/`confirm()` don't work in fullscreen mode** — use the `useAlert()` hook (`CustomAlert`/`AlertProvider`) and `ConfirmModal`. The app runs fullscreen on a venue display.
- **Two Next configs:** `next.config.js` holds the real config; `next.config.ts` is an empty stub. Edit `next.config.js`.
- **Gender color convention:** M = blue, F = pink throughout the UI. Theme color is emerald `#10b981`.
