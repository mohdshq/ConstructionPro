# ConstructionPro — Project Handoff

Read this first before making any changes.

## Stack
Expo / React Native (SDK 54), TypeScript, expo-router.
Zustand (`store/projectsStore.ts`) for app state.
PowerSync (offline-first SQLite) syncing to Supabase Postgres.
Supabase project ref: nalbazjndjozdksulbwx.
AI via Supabase Edge Functions calling Gemini (`supabase/functions/_shared/gemini.ts`).

## Non-negotiable context
- Offline-first is a product requirement. Users are on construction sites with
  unreliable Wi-Fi. Any flow that REQUIRES a network round-trip to record data
  is a bug, not a limitation.
- Voice input was removed from the snag flow (Aug 2026) after repeated 45s
  `invokeAIWithTimeout` failures. Manual context entry (building / floor / flat /
  area type) is now the only path. Voice remains ONLY for daily-report
  dictation. Do not reintroduce voice into snag capture.
- AI is used for photo analysis only.

## Architecture notes
- PowerSync sync rules use `SELECT * FROM snags` in both buckets (`user_owned`,
  `project_shared`), so new Postgres columns propagate automatically — BUT they
  must also be declared in `lib/powersync/AppSchema.ts` or the client will not
  see them.
- `projects.buildings` is a JSON-encoded `Building[]` ({ id, code, name }).
  IDs are uuidv4. `snags.building_id` is a Postgres `uuid` — never generate
  building ids from `Date.now()`.
- Snag photos are base64 strings in `ProjectSnag.photos: string[]`. Known
  scaling problem, see KNOWN_ISSUES.md.
- The `snags` table has NO `title` column, only `description`.

## Completed
- S5 — fixed stale-closure data loss on Finish (`capturedSnagsRef` +
  `addCapturedSnag` in `app/ai-wizard.tsx`). Removed the `snag-context` voice
  step. Manual location context with validation (floor/flat required when
  areaType === 'unit'). Verified seq increments correctly, no counter race.
- S6 — inline building/tower creation in the wizard capture form. Pure logic in
  `lib/projects/buildings.ts` (`addBuildingToList`); store action `addBuilding`
  is a thin wrapper. Auto-selects the newly created building.
- S7a — `ai_status` / `ai_error` / `ai_attempts` / `ai_updated_at` plumbed
  through Postgres (migration 20260801120000), AppSchema, `ProjectSnag`,
  `addSnag`, `updateSnag`, `useSnags.mapSnagRow`. Defaults to 'done' so
  existing snags are not swept into the queue.

## Roadmap
- S7b (next) — invert capture so it is never gated on AI. In `app/ai-wizard.tsx`
  the `ai-snag-from-photo` call (~line 285) must not be awaited; append the snag
  immediately with `aiStatus: 'pending'` and `description: 'Pending analysis'`,
  patching in place if/when the response arrives. Decision taken: staged
  approach — persistence stays at Finish via `persistCapturedSnags`.
- S7c — single-flight background drain worker keyed off `lib/useNetworkStatus.ts`.
  Oldest-first; patches description/severity/trade/room on success; increments
  `ai_attempts` with backoff, caps at 5 then marks 'failed'. Failed snags remain
  fully hand-editable.
- S7d — pending/failed badges in the snag list, "N snags still analysing" notice
  on review, warn (do not block) on report generation.
- S8 — move the write to capture time so each photo becomes a DB row instantly
  and review reads from PowerSync (survives app kill mid-session).
- S9 — migrate photos from base64 to PowerSync attachments / local file URIs.

## Conventions
- Run as ONE chain so a failure blocks the commit:
  `npx tsc --noEmit && npx jest && git add -A && git commit -m "..."`
- Baseline: 8 suites / 47 tests green.
- Test pure functions, not the store. Importing `store/projectsStore.ts` in a
  test pulls in `@/lib/powersync/system`, AsyncStorage and uuid, and the suite
  fails to resolve. Extract logic into pure `lib/**` modules and inject
  dependencies (see `lib/projects/buildings.ts` — `generateId` is injected).
  Use `import type` for types so the store never loads at runtime.
- Never use `__DEV__` outside `app/` — it is undefined under Jest.
- Any SQL run in the Supabase web editor MUST be mirrored into a file in
  `supabase/migrations/` or the repo and database drift apart.
- Branch per unit of work; conventional commits prefixed with the story id.
