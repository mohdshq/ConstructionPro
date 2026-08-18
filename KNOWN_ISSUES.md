# Known Issues — Triage Index

> **How to use this file**: Anything in RELEASE BLOCKERS must be closed before
> any build reaches a real user. Do not start new features while blockers are open.
> Sections below this index are the detailed historical log — keep them. They
> contain hard-won debugging context (see especially S7 and S8).

**Last triage**: 2026-08-07

## RELEASE BLOCKERS — security & data loss

| # | Issue | Area | Why it blocks |
|:--|:------|:-----|:--------------|
| B1 | PowerSync **development tokens still ON** | Infra | Token verification effectively bypassed; entire multi-tenant DB exposed. Disable in PowerSync dashboard. |
| B2 | Supabase **email confirmation disabled** | Auth | Anyone can register as anyone. Re-enable before first real signup. |
| ~~B3~~ | **[CLOSED / NOT-A-BUG]** `initialSync` overwriting entities | Sync | Audit revealed UI reads from PowerSync SQLite (`useQuery`), ignoring Zustand store. `initialSync` only mutated orphaned Zustand arrays without touching SQLite. Removed from startup; see `docs/powersync_investigation_report.md`. |
| B4 | **Binary file uploads bypass PowerSync queue** | Sync | Binary file uploads (photos, avatars, drawing files) bypass the PowerSync queue and are silently lost when created offline. (Database row creates flush correctly via PowerSync CRUD queue). |
| B5 | `setupPowerSync()` **not wired into app startup** | Sync | Sync layer may not initialise deterministically. |
| B6 | Photos stored as **base64 in `ProjectSnag.photos: string[]`** | Data/Perf | +33% size on every image, flowing through SQLite rows, sync payloads and report HTML. Will OOM the PDF WebView on large inspections. Migrate to PowerSync attachments + file URIs. |
| B7 | `xlsx@0.18.5` — prototype pollution + ReDoS, **no npm fix exists** | Security | Abandoned on npm (fixed only in SheetJS-hosted 0.19.3+). Migrate or remove. |
| ~~B8~~ | **[FIXED]** Sign-out teardown wiping offline DB | Sync | `teardownPowerSync()` previously wiped SQLite DB on sign-out destroying pending offline queue. Fixed: teardown only disconnects, warns if queue non-empty; database cleared only when a different user signs in. |
| ~~B9~~ | **[FIXED]** Cold launch with no network signs user out | Auth | Cold launch >1h offline treated expired access token as signed out. Fixed: 3-state authMode, 30-day offline-grace window backed by AsyncStorage mirror, 4s getSession race, reconnect refresh. |

## HIGH — correctness

| # | Issue | Area |
|:--|:------|:-----|
| H1 | `app/project/[id]/report/create.tsx:434` — undefined `project` in snag photo upload payload. **Re-verify against current main** (predates S5–S7 rework). | AI snag |
| H2 | `app/project/[id]/team.tsx:51-52` — untyped Supabase RPC response; `data.success` unsafe | Team |
| H3 | **`fetchUserProjects` filters by `user_id` only** — a user added via `project_members` never sees the shared project, yet `fetchUserActivities` / `fetchUserCalculations` *do* resolve through `project_members`. Sharing is half-wired. Resolved by Phase 7. | Sync/Team |
| H4 | `insertCalculation(calculation: any)` — untyped parameter | Sync |
| H5 | No Arabic / RTL despite `expo-localization` being installed | i18n |
| H6 | Web target configured (`output: "static"`) but untested; RevenueCat throws in browser | Web |

## Structural debt (not bugs — planned migrations)

- **Tenancy is user-scoped throughout.** Every function in `supabaseSync.ts`
  filters `.eq('user_id', userId)`. Phase 7 rewrites all of them.
- **Storage paths are `{userId}/{projectId}/{filename}`**, hardcoded in
  `uploadPhoto`, `uploadDrawingFile`, `uploadAvatar`, and mirrored in storage RLS.
  Must become `{orgId}/...` in Phase 7, with a migration for existing objects.
  If deferred, a departing user's files become orphaned under their prefix.

## Invariants — DO NOT REGRESS

These were fixed at real cost. Re-breaking them is the most likely source of
future bugs. Detailed write-ups are further down this file.

1. **`isRenderablePhoto` must accept `data:`, `https://` AND `file://` URIs.**
   Never narrow back to a base64-only check — doing so silently renders
   "No Context Photo" for every snag once photos move off base64. (S9 prep)
2. **Never apply `page-break-inside: avoid` to tall blocks in report HTML.**
   WebKit's print engine silently *drops* content that cannot fit while summary
   counts still include it → reports that under-report snags. (S8)
3. **PDF changes MUST be verified by opening the generated PDF**, never by
   inspecting the WebView preview. The preview cannot reproduce print-engine
   pagination or clipping. (S8)
4. **Snag capture must stay non-blocking.** Enrichment is a deferred queue with
   exponential backoff; capture never waits on network. (S7/S7b)
5. **RLS stays enabled on every table.** No exceptions, no "temporarily".
6. **`syncStatus` guard applies to ALL synced entities**, not just projects and reports.
7. **`getSignedUrl` returns the discriminated `SignedUrlResult` union.** Never
   collapse it back to a bare `null` — callers rely on distinguishing
   `missing` / `offline` / `unauthorized`.
8. **Supabase access goes through `lib/supabaseSync.ts` only.** Never call
   `supabase` directly from a screen.
9. **Sign-in requires network by design. Resuming an existing session must never require network, must never be blocked on a pending network request, and must never be terminated by a network failure — only by explicit sign-out or an auth-server rejection.**
10. **Network failure and authorization failure are distinct states and must never be collapsed. Any code path that signs a user out must be able to prove the server actively rejected the credential.**


# Known Issues

Tracked pre-existing issues discovered during Phase 5a hardening.
These will be addressed in Milestone 1.6 (TypeScript bug fixes) before
we proceed to Milestone 2 (Sentry/PostHog observability).

## Critical (will crash for real users)

- [x] ~~`app/(auth)/register.tsx:50` — Missing `Alert` import from 'react-native'.
      Crashes when registration fails.~~ **FIXED in M1.6b (commit a282f9c)**
- [x] ~~`app/ai-wizard.tsx:3` — Wrong import: uses `react-router-native`
      instead of `expo-router`. Screen does not function.~~ **FIXED in M1.6b
      at compile level (commit a282f9c). See runtime issue below.**
- [ ] `app/project/[id]/report/create.tsx:434` — Undefined variable `project`
      in snag photo upload payload. Crashes the AI snag-from-photo feature.
      *(Needs re-verification: predates the entire S5–S7 rework and may already
      be fixed incidentally. Verify against current main before spending time on it).*
- [x] ~~`app/ai-wizard.tsx` — RUNTIME ISSUE: screen hangs while loading and
      silently navigates back to dashboard when user records a snag.~~
      **RESOLVED / SUPERSEDED in S5 & S7b.** The entire flow was rebuilt across
      S5 (stale-closure fix, voice step removed) and S7b (non-blocking capture,
      live `useMemo` derivation of `selectedProject`). Symptom no longer occurs.


## High (incorrect behavior or type unsafety)

- [ ] `app/project/[id]/team.tsx:51-52` — Untyped Supabase RPC response
      causes `data.success` / `data.error` to fail at runtime.
- [ ] `components/SaveCalculationModal.tsx:72` — References
      `proj.referenceNumber` which does not exist on the Project type.
## M2b — PostHog runtime verification ✅ VERIFIED
- Verified live on iOS Simulator dev build: 'M2b Test Event' captured via usePostHog().capture() + flush() appeared in PostHog Events dashboard (US region). Autocapture (Application Opened) also confirmed firing.
## M3.3 ✅ RESOLVED — Offline data-loss: resolved via PowerSync
- M3.3b made initialSync NON-DESTRUCTIVE for projects and reports: local records
  with syncStatus === 'pending' that are absent from the server are now PRESERVED
  (not wiped), fixing the catastrophic "offline-created report disappears on sync" bug.
- ~~STILL DESTRUCTIVE (folders, drawings, activities, calculations)~~: **CLOSED (NOT A BUG)**.
  Investigation (see `docs/powersync_investigation_report.md`) showed the UI reads all four entities
  from PowerSync local SQLite (`usePowerSync*` hooks) and writes to SQLite. `initialSync` only mutated
  orphaned Zustand arrays. `initialSync` has been deprecated and removed from startup.
- Legacy records (syncStatus === undefined) absent from server are DROPPED by design
  (treated as remote-deleted, not resurrected) to avoid zombie data.
- Offline EDITS to existing records: server wins on sync (edit-conflict resolution
  handled via PowerSync). Only offline CREATES are preserved.

## M3.3c ✅ RESOLVED — — Network detection + offline banner (NOT STARTED)  
- Plan reviewed and approved: use @react-native-community/netinfo, add
  lib/useNetworkStatus.ts hook + components/OfflineBanner.tsx, mount banner in
  app/_layout.tsx (inside appContent's SafeAreaProvider).
- BLOCKED ON: requires a new dev build (netinfo is a native module). Defer until next
  dev build / stable network.
- BEFORE APPLYING: re-verify the _layout.tsx diff against the current appContent/
  PostHogProvider structure (the originally-proposed diff was against the pre-M2b layout).
- Scope: detection + display only. No sync/queue/retry (that's M4).

## M3.3b ✅ RESOLVED — Offline reconcile ✅ VERIFIED (with known gap)
- Verified live: a report created OFFLINE survived reconnection / initialSync (no longer wiped). Data-loss-on-overwrite bug confirmed fixed.
- KNOWN GAP: offline-created records are PRESERVED locally (syncStatus 'pending') but are NEVER auto-pushed to Supabase after reconnect. Needs flush-on-reconnect / mutation queue. Deferred to M4 (PowerSync).

## Dev environment — network connectivity blocker
- Current dev Wi-Fi ("Azizi_Phase4") is a managed/isolated network (client isolation on,
  router admin unreachable) — direct LAN Metro connection fails.
- ngrok tunnel works intermittently but drops frequently / sometimes fails to start.
- iPhone Personal Hotspot + Mac: loopback routing issue (dev client can't reach Metro on
  same phone's hotspot).
- WORKAROUND: retry tunnel until a connection holds; long-term consider a personal
  travel router or a network you control for reliable on-device testing.
- NOTE: On-device verification is now possible via the iOS Simulator dev build (`development-simulator` EAS profile), safely bypassing the physical network/tunnel blockers.

## Low (config / hygiene)

- [ ] `tsconfig.json` does not exclude `supabase/functions/**` — 24 false-positive
      Deno errors pollute `npx tsc --noEmit` output.
- [ ] Web platform: RevenueCat singleton errors in browser console when
      paywall actions are triggered. Should gracefully no-op on web.

- [x] ~~`app/ai-wizard.tsx` — RUNTIME ISSUE (screen hangs while loading and silently
      navigates back to dashboard when user attempts to record a snag photo).~~
      **RESOLVED / SUPERSEDED in S5 & S7b.** (Duplicate of Critical entry above;
      flow rebuilt with non-blocking capture and live store selector).
- [ ] Project status not user-editable (pre-existing, unrelated to PowerSync): create form hardcodes status: 'planning'; edit form omits status. Card badge shows date-derived displayStatus, not stored value. Fix = add a status picker to app/project/create.tsx and include status in the edit payload.

## M3.3c ✅ RESOLVED — — Offline detection + banner ✅ CODE-COMPLETE (live offline-state verification pending)
- Added @react-native-community/netinfo, lib/useNetworkStatus.ts hook, components/OfflineBanner.tsx (global red banner), mounted in app/_layout.tsx inside SafeAreaProvider.
- VERIFIED on iOS Simulator: banner renders correctly with proper safe-area insets; absent when online.
- NOT fully verified: a true offline transition. The iOS Simulator does NOT emit isConnected:false on host Wi-Fi toggle (NetInfo always reports isConnected:true, type:wifi) — a known simulator limitation, not a code issue. Confirmed via debug logging.
- TO VERIFY on a physical device: install the `development` (device) dev build, enable Airplane Mode, confirm the red banner appears, disable it, confirm the banner clears.
- isOffline keys off isConnected only (isInternetReachable can stick on simulators/flaky networks). Captive-portal edge case deferred to M4.

## M4.1 — PowerSync client integration (✅ VERIFIED on iOS simulator)
PowerSync client scaffolded (lib/powersync/: AppSchema, Connector, system). End-to-end sync verified: Supabase JWT → PowerSync JWKS auth → sync rules → local SQLite. Row counts matched Sync Diagnostics (profiles 1, projects 3, reports 2, drawings 0, drawing_folders 1, calculations 2, project_members 3).

Two PowerSync auth config requirements (Client Auth dashboard), required for Supabase auth to work:

JWKS URI configured (project uses new ECC P-256 signing keys, not legacy HS256 secret): https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
JWT Audience must include authenticated — Supabase signs all user tokens with aud: "authenticated"; without this, sync fails with [PSYNC_S2105] Unexpected "aud" claim value.
setupPowerSync() is wired into app startup (`app/_layout.tsx`). user_tokens intentionally excluded from sync (PK is user_id, kept on direct-Supabase path). Dev note: PowerSync Development tokens toggle still ON (enable for diagnostics) — disable before production.

## PowerSync Sync Path Hardening & Lifecycle Resolution (B3, B4, B8)

Detailed investigation report located at `docs/powersync_investigation_report.md`.

### ✅ CLOSED (Not a Bug) — B3: `initialSync` overwrite of folders/drawings/activities/calculations
- **Finding**: Audit of all screen files showed that the UI reads from PowerSync live query hooks (`usePowerSyncFolders`, `usePowerSyncDrawings`, `usePowerSyncActivities`, `usePowerSyncCalculations`) querying local SQLite, not Zustand state.
- **Action**: `initialSync()` was only mutating orphaned arrays in Zustand without touching the local SQLite database. Removed `initialSync()` execution from `app/_layout.tsx` startup and marked `initialSync` as deprecated in `store/projectsStore.ts`.

### ⚠️ RE-SCOPED — B4: Binary file uploads bypass PowerSync queue
- **Finding**: Database rows (`projects`, `reports`, `snags`, `folders`, `drawings`, `activities`, `calculations`) write to SQLite and are automatically flushed upon reconnect via `Connector.uploadData()`.
- **Re-scope**: B4 now specifically tracks binary file uploads (`uploadPhoto`, `uploadAvatar`, `uploadDrawingFile` in `lib/supabaseSync.ts`) which use direct HTTP uploads (`FileSystem.uploadAsync`). When offline, these uploads fail immediately and are not queued, resulting in missing files in Supabase Storage.

### ✅ RESOLVED (FIXED) — B8: Sign-out teardown wiping offline SQLite database
- **Finding**: `teardownPowerSync()` previously called `powersync.disconnectAndClear()` upon sign-out, dropping the local SQLite DB and destroying any pending CRUD queue entries created offline.
- **Fix**:
  1. `teardownPowerSync()` now calls `powersync.disconnect()` only, preserving the local SQLite DB and pending queue across sessions.
  2. Inspects `powersync.getUploadQueueStats()` on sign-out to show a non-blocking informational warning if unsynced changes are pending.
  3. `clearPowerSyncForNewUser()` introduced in `lib/powersync/lifecycle.ts`. On startup, `app/_layout.tsx` compares `currentUserId` with `last_powersync_user` in AsyncStorage. The database is cleared *only* when a different user signs in (with explicit destructive-action confirmation if unsynced items are present).

### ✅ RESOLVED (FIXED) — B9: Cold launch with no network signs the user out
- **Symptom**: App hangs on the loading spinner then redirects to login when launched offline more than one hour after the last successful token refresh.
- **Root Cause**: `useAuthStore.initialize()` treated `getSession()` returning null as signed-out, when it only means no valid access token is currently available; the stored refresh token was never actually deleted.
- **Fix**:
  1. **Three-state `authMode`**: Introduced `'online' | 'offline-grace' | 'signed-out'` with `offlineUser: { id, email, fullName }`.
  2. **AsyncStorage Session Mirror**: Persisted mirror in AsyncStorage under key `cp.auth.lastSession` (`{ userId, email, fullName, savedAt }`) with a 30-day grace window (`OFFLINE_GRACE_MS = 30 * 24 * 60 * 60 * 1000`).
  3. **4-second Timeout Race**: In `initialize()`, `supabase.auth.getSession()` races against a 4000ms timeout so startup is never blocked on a hanging socket. If offline, the app falls back to `readLastSession()` and enters `offline-grace` mode within the 30-day window.
  4. **NetInfo Reconnection Listener**: When connectivity returns in `offline-grace` mode, the app calls `supabase.auth.refreshSession()`. On success, it transitions to `online` and connects PowerSync.
  5. **Explicit Sign-Out Gate**: Sign-out transitions occur only on explicit user action (`isExplicitSignOut = true`) or an auth-server credential rejection (HTTP 400 `invalid_grant` / revoked refresh token) — never on a network error.
  6. **UI Adjustments**: Added persistent dismissible `OfflineGraceBanner` ("Offline — signed in as {email}. Changes will sync when you reconnect.") and hid server-dependent UI (paywall, subscription flows) in `offline-grace` mode.

### ✅ RESOLVED — Storage uploads via uriToBlob write 0-byte files (uploadPhoto, uploadAvatar)
- ✅ RESOLVED (branch fix/upload-blob-zero-bytes): `uploadPhoto` and `uploadAvatar` now use `FileSystem.uploadAsync` with `BINARY_CONTENT` (same fix applied to `uploadDrawingFile` in M6.3b). Verified on iOS: avatar and report-photo uploads write real (non-zero) bytes to their Supabase Storage buckets and render correctly in-app. `uriToBlob` removed from `lib/supabaseSync.ts`.

### expo-file-system legacy API in use
- The drawing viewer and `uploadDrawingFile` import from `expo-file-system/legacy`
  (SDK 54 moved `cacheDirectory` / `downloadAsync` / `readAsStringAsync` / `uploadAsync`).
- The legacy module is supported but slated for removal in a future SDK.
- TODO: migrate to the new File/Directory API before upgrading past the legacy window.

### ✅ RESOLVED — Dead Supabase sync helpers after PowerSync migration
- ✅ RESOLVED (branch chore/remove-dead-supabase-helpers): Removed unused `updateFolderRemote`, `deleteFolderRemote`, `updateDrawingRemote`, `deleteDrawingRemote` and their now-unused `DrawingFolderUpdate` / `DrawingUpdate` types from `lib/supabaseSync.ts`. Confirmed zero callers workspace-wide before removal; `tsc --noEmit` clean.

### Activity log writes are not wired up
- `addActivity` exists in `store/projectsStore.ts` but has no callers — no app action
  (report create/update, drawing upload, member join) ever logs an activity.
- The activity screen reads correctly via PowerSync (`usePowerSyncActivities`) but will
  always show "No Activity Yet" until writes are added.
- TODO (separate feature task): call `addActivity` at meaningful events and migrate
  `addActivity` to `powersync.execute()` (it currently uses the legacy `insertActivity`).

### ✅ RESOLVED — Dead `insertActivity` helper in supabaseSync.ts
- ✅ RESOLVED (branch chore/remove-dead-insertActivity): Removed the unused `insertActivity` definition from `lib/supabaseSync.ts`. Confirmed zero callers before removal; `tsc --noEmit` clean.

### ✅ RESOLVED — Member-joined activity not logged (server-side)
- ✅ RESOLVED (database trigger): Added `trg_log_member_joined` on `project_members` (function `log_member_joined`, SECURITY DEFINER) that logs a "joined the project" activity for non-owner members. SQL tracked in `supabase/triggers/log_member_joined.sql`. Applied via Supabase SQL editor (not an app code change). Note: `invite_user_by_email` RPC only adds already-registered users, so a join test requires a second account.

### ~~Drawing display name is raw upload filename~~
- ✅ RESOLVED (not a bug): Drawings already store and display the original picker filename (`asset.name`); rename works correctly. The earlier "A17E1468-...pdf" was a single old test file that genuinely had a UUID name on disk, not a code defect. No code change needed for display.

# Known Issues & Phase C Backlog

Deferred enhancements following the Phase B daily-report restructure. Not bugs blocking
release — planned improvements.

## UX
- **In-report editing**: editing a report is currently only available via the Edit button
  from the report list (the open report is view-only). Add an in-view edit affordance so a
  report can be edited while open. Applies to all report types.
- **Header logo packing (PDF)**: in the report header, left-zone logos should pack flush left
  and right-zone logos flush right, rather than spreading within their zones.

## PDF polish
- **Collapse empty columns**: tables (e.g. Areas of Concern) render empty columns when data is
  sparse; collapse or hide columns with no content.
- **Document-control footer**: add page numbers ("Page X of Y") and a "Generated on <date/time>"
  stamp to the PDF footer for formal document control.

## Professional / contractual enhancements
- **Materials log**: add a "Materials Delivered / Consumed" section to the daily report
  (item, quantity, unit, supplier).
- **Delay / disruption log** (highest value): a dedicated section logging delays with
  start/stop times and cause codes (weather standby, late information, access, etc.) — important
  for Extension-of-Time (EOT) and disruption claims.
- **Man-hours**: optional man-hours (headcount × hours) alongside headcount for productivity /
  earned-value reporting. Add without forcing entry friction.

## Notes
- Existing projects created before the base64-logo change store logos as storage paths and will
  not render logos until re-picked (no migration by design).

## ✅ RESOLVED — S7 — Offline snag capture is gated on AI (DATA LOSS)
- **Historical repro**: go offline, capture detail photo → AI call fails → error shown, and
  NO snag row is written. User must retake the photo after reconnecting.
- **Root cause**: capture flow awaited the ai-snag-from-photo response before
  persisting. Persistence should be unconditional; enrichment should be deferred.
- **Resolution**: Closed in two parts:
  - **S7b**: Made capture non-blocking in `app/ai-wizard.tsx` — snags are written locally immediately with `aiStatus: 'pending'` and `description: 'Pending analysis'` before any network call. AI analysis is fire-and-forget and patches the snag by stable local ID.
  - **S7c**: Added background AI enrichment worker (`lib/ai/useEnrichmentWorker.ts` + `lib/ai/enrichmentQueue.ts`) that drains pending/failed snags oldest-first with exponential backoff (5s/15s/45s/135s capped at 300s, max 5 attempts).
- **Verification**: Verified on device in airplane mode — zero snag loss, snags persist locally and enrich automatically when connectivity returns.

## ✅ RESOLVED — S11 / S11a — Report photo signed URLs fail (`lib/supabaseSync.ts`)
- **Historical observation**: `Error getting signed URL: Network request failed` logged in `lib/supabaseSync.ts`.
- **Impact**: Highest-priority open bug. Reports are the primary client-facing deliverable, and a report with broken or missing images is worse than no report.
- **Resolution (Commits e149551 & db2767b)**:
  - `getSignedUrl` now returns a discriminated `SignedUrlResult` (`{ ok: true; url: string } | { ok: false; reason: 'missing' | 'offline' | 'unauthorized' | 'unknown'; message?: string }`) instead of a bare `null`, allowing callers (`ProjectImage.tsx`, `report/[reportId].tsx`, `drawings/`) to distinguish a genuinely absent object from a transient network failure or auth expiration.
  - An 8000ms timeout wraps both the `createSignedUrl` call and the byte fetch in `app/project/[id]/report/[reportId].tsx` so offline/hung network requests fail gracefully and quickly.
  - Empty or whitespace-only paths short-circuit immediately with `{ ok: false, reason: 'missing' }` without making network calls.
  - Header logo fallback: when project logos fail to resolve, the report header renders the client name (`project.client`), falling back to `project.name`, and only to `MAIN CONTRACTOR` if both are empty (HTML-escaped).
- **Verification gap**: Offline branches are covered by mocked unit tests in `lib/__tests__/signedUrl.test.ts` (124/124 tests passing) and have NOT been verified on a real device in airplane mode, because simulator builds are currently blocked by macOS Developer Mode being disabled.

## S5 follow-ups (observed, not yet fixed)
- Intermittent edge-function stall: ~61KB POST from device hangs with no TTFB
  while the same curl from the Mac succeeds. Root cause unknown; watch
  `[invoke] ttfbMs`. Suspect managed Wi-Fi (Azizi_Phase4) client isolation.
- Snag photos are stored base64 in `ProjectSnag.photos: string[]`. Will not
  scale; migrate to PowerSync attachments / local file URIs. Note: detailed reports now embed 320px images, so report HTML size grows with snag count and the base64 storage problem is becoming more pressing, not less.
- `__DEV__` is undefined under Jest — any `if (__DEV__)` in lib/ breaks tests.
  Add a global to jest setup or avoid `__DEV__` outside app/.
- Area Type chip row has no horizontal-scroll affordance; options off-screen
  right are undiscoverable.

## ✅ RESOLVED — ai-snag-from-photo returns non-2xx ~25% of the time (commit 4979c86)
- **Historical observation**: Observed 3 failures in 11 calls; every one succeeded on retry with the SAME photo, so the fault was server-side and nondeterministic, not payload-related.
- **Root cause**: Two independent faults:
  1. Gemini sometimes wrapped its JSON reply in a ```json markdown fence, which direct `JSON.parse` rejected with `"AI returned invalid format"`.
  2. The API request had no `generationConfig`, so long replies hit `MAX_TOKENS` and returned truncated, unparseable JSON, or failed with empty/blocked responses without explicit handling.
- **Fix (commit 4979c86)**:
  - Added `parseGeminiJson` helper in `supabase/functions/_shared/gemini.ts` that strips code fences and falls back to first-brace/last-brace substring extraction before failing.
  - Set explicit `generationConfig`: `responseMimeType: 'application/json'`, bounded `maxOutputTokens` (1000), low `temperature: 0.2`, and `thinkingConfig: { thinkingBudget: 0 }`.
  - Logged raw response body, resolved model name, and `finishReason` on parse failure.
  - Added explicit handling for blocked/empty candidates and non-`STOP` finish reasons.
  - Added one bounded server-side retry before giving up and validated that the `issue` field is present before returning.
  - Covered by 10 new assertions in `lib/ai/__tests__/geminiParser.test.ts`. Deployed to Supabase project `nalbazjndjozdksulbwx`.
- **Post-deploy verification**: All recently drained snags at `ai_status = 'done'`, four at `ai_attempts = 0` and one at `ai_attempts = 1`.
- **Caveat**: The post-fix sample was only 5 snags, so a larger drain should be re-checked before treating the failure rate as zero.

## ✅ RESOLVED — S8a / S8b / S8c / S11a — PDF report pagination, print rendering data loss & photo gate
- **Historical observation / Repro**: Snags disappeared from exported PDF snag reports despite being counted in the summary header. The WebView in-app preview rendered all snags as a continuous scrolling document, so the issue was invisible until the generated PDF was opened in a native viewer.
- **Root causes**:
  1. No deterministic pagination chunking: before S8a, `snagsPerPage` performed no pagination whatsoever — it only set a CSS density class that activated at `perPage >= 3`. "2 per page" was never real. All placement was left to WebKit heuristics, which is why the behaviour was unpredictable and why a snag could vanish while the summary still counted it.
  2. `page-break-inside: avoid` on tall `.snag-block` elements: when a block was too tall to fit the remaining space on a page (e.g. following summary cards or other blocks), WebKit's print engine pushed it across boundaries and dropped it entirely.
- **Resolution (Tasks S8a, S8b, S8c & S11a)**:
  - **Deterministic Chunking (S8a)**: In `lib/report/templates/SnagReportHTML.ts`, floor snags are chunked into pages of `snagsPerPage`, wrapped in `<div class="snag-page">` with `page-break-after: always` and repeated `(cont.)` floor headers. Added `page-break-after: always` on `.summary` for detailed mode so snag pages start on fresh A4 pages.
  - **Removed dangerous CSS (S8b)**: Removed `page-break-inside: avoid` from base `.snag-block` (kept on `.snag-header` and `.snag-photo` so individual items are not broken). *(Note: the 130px/2-per-page geometry explored in S8b was a transitional step and is no longer current behaviour).*
  - **Detailed Report Redesign (S8c)**: Detailed reports are now strictly one snag per page (`snagsPerPage: 1`) with generous photos at `320px` side-by-side (`object-fit: contain`), block padding at `16px`, and description font size at `13px`. Compact mode remains four snags per page at `100px` thumbnails.
  - **Pathological Overflow Guard (S8c)**: `.snag-block` in detailed mode carries `max-height: 900px; overflow: hidden` as a deliberate safety guard: a pathological block clips visibly rather than being silently dropped by the print engine. Visible clipping is a reportable bug; silent omission ships to a client unnoticed.
  - **Single-page avoid headroom**: Because detailed mode is now one-snag-per-page, every detailed page receives the `snag-page-single` class and therefore `page-break-inside: avoid`. This is the same property that caused the original loss, and it is safe here only because a detailed page runs roughly 530px against about 1000px of printable A4 at 10mm margins. If anyone increases photo height, block padding, or adds fields to the snag card, that headroom must be re-checked against a real PDF.
  - **Decoupled Photo Gate ahead of S9 (S11a)**: `validateLogo` was split into `isEmbeddableImage` (header logos, base64-only) and `isRenderablePhoto` (snag photos in `renderSnagCard`, accepts `data:image`, `http://`, `https://`, and `file://` URIs). The old combined gate would have silently rendered "No Context Photo" for every snag once S9 moves photos off base64 to local file URIs or remote URLs. `isRenderablePhoto` must NOT be narrowed back to a base64-only check.
- **Key Takeaway / Verification rule**: The WebView preview cannot detect print-engine pagination and clipping bugs. All future report template changes MUST be verified by opening the generated PDF, not just inspecting the WebView preview.

