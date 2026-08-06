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
- S9 — migrate photos from base64 to PowerSync attachments / local file URIs.
- S10 (not started) — move the write to capture time so each photo becomes a DB row instantly and review reads from PowerSync (survives app kill mid-session).
  *(Note: The S8 story ID was allocated to PDF report pagination — S8a/S8b/S8c, all complete below — and is NOT the capture-time-write task, which is now S10).*

## Conventions
- Run as ONE chain so a failure blocks the commit:
  `npx tsc --noEmit && npx jest && git add -A && git commit -m "..."`
- Baseline: 12 suites / 124 tests green.
- Test pure functions, not the store. Importing `store/projectsStore.ts` in a
  test pulls in `@/lib/powersync/system`, AsyncStorage and uuid, and the suite
  fails to resolve. Extract logic into pure `lib/**` modules and inject
  dependencies (see `lib/projects/buildings.ts` — `generateId` is injected).
  Use `import type` for types so the store never loads at runtime.
- Never use `__DEV__` outside `app/` — it is undefined under Jest.
- Any SQL run in the Supabase web editor MUST be mirrored into a file in
  `supabase/migrations/` or the repo and database drift apart.
- Branch per unit of work; conventional commits prefixed with the story id.

## Update (Aug 2026) — S7b complete
- Photo capture is now non-blocking. Snags are written locally with
  `aiStatus: 'pending'` and `description: 'Pending analysis'` BEFORE any network
  call. AI enrichment is fire-and-forget, patched by stable id.
  Verified on device in airplane mode: snags survive, nothing is lost.
- Voice is fully removed from the snagging flow (the 'snag-context' step is gone).
  Snagging now opens directly on the manual location screen. Voice remains only
  for daily-report dictation.
- `selectedProject` in `app/ai-wizard.tsx` is derived live via `useMemo` over the
  store, NOT held in state. Holding a Project object in `useState` caused the
  building chip row to render a stale snapshot. Do not reintroduce that pattern.
- Buildings may be `{ id, code }` (from `app/project/create.tsx`) or
  `{ id, code, name }` (from `addBuilding`). Always label via
  `formatBuildingLabel` in `lib/projects/buildings.ts`.
- STILL OUTSTANDING: nothing retries a 'pending' snag. Reconnecting does not
  clear it. That is S7c, the next task.

## Update (Aug 2026) — S7c complete
- `lib/ai/enrichmentQueue.ts` (pure) + `lib/ai/useEnrichmentWorker.ts` (mounted
  once in `app/_layout.tsx`) drain snags stuck at 'pending'/'failed'.
  Oldest-first, single-flight, 15s poll, exponential backoff (5s/15s/45s/135s,
  capped 300s), hard cap at 5 attempts.
- Verified on device: 8 snags drained; 3 transient edge-function failures
  auto-recovered on the next attempt; queue then went quiet (no retry loop).
- Legacy snags with NULL `ai_status` are only candidates if their description
  is exactly 'Pending analysis'. Without this the worker re-analysed 34 already
  complete snags. Do not widen that filter.
- The worker never overwrites a description the user edited — it re-reads the
  stored value and only writes when it is still 'Pending analysis'.
- The polling interval is created ONCE with a `[]` dependency array; `isOffline`
  is read from a ref. Depending on `isOffline` caused duplicate bursts on
  network flap.
- Remaining: S7d (pending/failed badges in the UI), report photo signed URLs (`lib/supabaseSync.ts`), S8 (write at capture time), S9 (photos off base64).

## Update (Aug 2026) — S7e complete
- Fixed intermittent non-2xx failures (~25% failure rate) from `ai-snag-from-photo`.
- Root causes:
  1. Gemini wrapping JSON in ` ```json ` markdown code fences, which `JSON.parse` threw on as invalid format.
  2. Request missing `generationConfig`, causing replies to hit `MAX_TOKENS` truncation or empty output on thinking models.
- Fix (commit 4979c86):
  - `parseGeminiJson` helper placed in `supabase/functions/_shared/gemini.ts` (strips code fences, falls back to first-brace/last-brace substring extraction).
  - Explicit `generationConfig` added (`responseMimeType: 'application/json'`, `maxOutputTokens: 1000`, `temperature: 0.2`, `thinkingConfig: { thinkingBudget: 0 }`).
  - Added bounded server-side retry, non-`STOP` finishReason / empty candidate checks, and raw response error logging.
  - Verified on Supabase `nalbazjndjozdksulbwx` with 10 unit test assertions in `lib/ai/__tests__/geminiParser.test.ts`.
- **Rule**: Any new Gemini call MUST go through `parseGeminiJson` and MUST set an explicit `generationConfig` with `thinkingBudget: 0` — NEVER `JSON.parse` a raw Gemini reply.

## Update (Aug 2026) — S7d complete
- `lib/units/snagAiStatus.ts` holds the pure descriptor logic (`getSnagAiStatusDescriptor` returns `null` for `done` and for `undefined`/legacy status so there is zero layout shift on existing snags).
- `components/SnagAiStatusBadge.tsx` is the presentation layer.
- Badges are rendered in the snag list, snag detail, and `app/ai-wizard.tsx`.
- The report screen warns but does not block when unanalysed snags are present via `countUnanalysedSnags`.

## Update (Aug 2026) — S8a/S8b/S8c complete
- **Report Template Rules (do not break)**:
  - Detailed reports are strictly one snag per page (`snagsPerPage: 1`) with generous photos at `320px` side-by-side (`object-fit: contain`), block padding at `16px`, and description font size at `13px`.
  - Compact mode remains four snags per page at `100px` thumbnails.
  - `page-break-inside: avoid` must NEVER be added back to base `.snag-block` (kept only on `.snag-header` and `.snag-photo`).
  - The `max-height: 900px; overflow: hidden` guard on `.snag-block` in detailed mode is deliberate: a pathological block clips visibly rather than being silently dropped by print engines.
  - Any change to photo height, block padding, or snag card fields MUST be verified by opening a generated PDF because the in-app WebView preview cannot reveal print-engine pagination bugs.
- See `KNOWN_ISSUES.md` for the full rationale and history.

## Update (Aug 2026) — S11 / S11a complete
- `getSignedUrl` in `lib/supabaseSync.ts` now returns a discriminated `SignedUrlResult` (`{ ok: true; url: string } | { ok: false; reason: 'missing' | 'offline' | 'unauthorized' | 'unknown'; message?: string }`) rather than a bare `null`, allowing consumers to distinguish between genuinely missing storage objects and transient offline/network or auth failures.
- Empty or whitespace-only paths short-circuit immediately with `{ ok: false, reason: 'missing' }` without making network calls.
- An 8000ms timeout wraps both `getSignedUrl` (`createSignedUrl`) and the downstream byte-fetch in `app/project/[id]/report/[reportId].tsx` via `Promise.race` to prevent hung PDF exports when offline.
- In `lib/report/templates/SnagReportHTML.ts`, `validateLogo` was decoupled into `isEmbeddableImage` (header logos, base64-only) and `isRenderablePhoto` (snag photos, accepts `data:image`, `http(s)://`, and `file://` URIs). This ensures that when Story S9 moves photos off base64 to local file URIs or Supabase storage paths, snag photos are not silently dropped. `isRenderablePhoto` must NOT be narrowed back to a base64-only check.
- Header logo fallback: when project logos fail to resolve, the report header renders the client name (`project.client`), falling back to `project.name`, and only to `MAIN CONTRACTOR` if both are empty (HTML-escaped).
- Verification gap: Offline error branches are covered by mocked unit tests in `lib/__tests__/signedUrl.test.ts` (124 tests passing). On-device / simulator airplane mode verification is pending developer mode enablement on the host Mac.

