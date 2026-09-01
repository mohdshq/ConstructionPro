# Known Issues — Triage Index

> **How to use this file**: Anything in RELEASE BLOCKERS must be closed before
> any build reaches a real user. Do not start new features while blockers are open.
> Sections below this index are the detailed historical log — keep them. They
> contain hard-won debugging context (see especially S7 and S8).

**Last triage**: 2026-08-26

## RELEASE BLOCKERS — security & data loss

| # | Issue | Area | Why it blocks |
|:--|:------|:-----|:--------------|
| ~~B1~~ | **[CLOSED]** PowerSync development tokens disabled | Infra | Verified 2026-08-26 on instance 6a26a0380ef84ed6719ff419. Client Auth shows Development tokens unchecked (deployed state, no pending change). Runtime proof from PowerSync Logs: "Sync stream started", 12 buckets, checkpoint 1897, 339 operations_synced, 29.7 MB data_synced_bytes, authenticated as user cdbff53b via real Supabase JWT. No PSYNC_S2105 audience errors. Code proof: repo-wide grep for dev/temporary tokens and hardcoded JWTs returned zero hits; lib/powersync/Connector.ts fetchCredentials() returns session.access_token only. NOTE: found already disabled -- not changed this session. |
| ~~B2~~ | **[CLOSED]** Supabase email confirmation enabled | Auth | Enabled in Supabase Auth settings and confirmed checked on 2026-08-26. app/(auth)/register.tsx already handles the null-session signup branch (shows "check your email" and returns to login), so no code change required. |
| ~~B3~~ | **[CLOSED / NOT-A-BUG]** `initialSync` overwriting entities | Sync | Audit revealed UI reads from PowerSync SQLite (`useQuery`), ignoring Zustand store. `initialSync` only mutated orphaned Zustand arrays without touching SQLite. Removed from startup; see `docs/powersync_investigation_report.md`. |
| ~~B4~~ | **[FIXED]** Binary file uploads bypass PowerSync queue | Sync | Binary file uploads previously bypassed the PowerSync queue and were lost when captured offline. Fixed via PowerSync AttachmentQueue + local-only attachments table. |
| ~~B5~~ | **[CLOSED / STALE]** setupPowerSync() is wired into app startup | Sync | Verified 2026-08-26 by reading app/_layout.tsx on main. setupPowerSync is imported from @/lib/powersync/lifecycle and invoked in the PowerSync lifecycle effect, gated on isInitialized && isStoreHydrated and keyed per user via syncedUserIdRef. Complementary paths present: teardownPowerSync on authMode === 'signed-out', clearPowerSyncForNewUser on user switch, reconnect via setupPowerSync in the NetInfo offline-grace handler, and Sentry capture with tags { layer: 'powersync', event: 'startup_connect' } on failure. Runtime proof: PowerSync logs show "Sync stream started", 12 buckets, checkpoint 1897, 339 operations_synced for user cdbff53b. Blocker was stale, not fixed this session. |
| B6 | **[PARTIALLY CLOSED]** Photos stored as base64 in `ProjectSnag.photos: string[]` | Data/Perf | Forward fix shipped in PR #22 (`1887d8e`), verified on simulator and physical device with cold cache: new snag row ~88 bytes with bare UUID refs, objects resolve from `report-photos/<projectId>/` without local cache. Backfill of 64 base64 snags (~26 MB) and 13 reports (~4.37 MB) remains open under issue #21. |
| B7 | `xlsx@0.18.5` — prototype pollution + ReDoS, **no npm fix exists** | Security | Abandoned on npm (fixed only in SheetJS-hosted 0.19.3+). Migrate or remove. |
| ~~B8~~ | **[FIXED]** Sign-out teardown wiping offline DB | Sync | `teardownPowerSync()` previously wiped SQLite DB on sign-out destroying pending offline queue. Fixed: teardown only disconnects, warns if queue non-empty; database cleared only when a different user signs in. |
| ~~B9~~ | **[FIXED]** Cold launch with no network signs user out | Auth | Cold launch >1h offline treated expired access token as signed out. Fixed: 3-state authMode, 30-day offline-grace window backed by AsyncStorage mirror, 4s getSession race, reconnect refresh. |
| ~~B10~~ | **[FIXED]** Missing auth lock allows concurrent refresh | Auth | Absence of auth lock allowed concurrent `getSession()` / auto-refresh calls to exchange same refresh token, triggering Supabase reuse detection and revoking sessions. Fixed via `processLock` and AppState auto-refresh. |
| ~~B11~~ | **[FIXED]** Fresh install loses all project navigation | Navigation/Data | Fixed in PR #22 and PR #24 (`9467819`, `dc75284`). All remaining screens (`app/project/create.tsx`, `app/ai-wizard.tsx`, `app/quick-log.tsx`, `app/saved-calculations.tsx`, `components/SaveCalculationModal.tsx`, `app/project/[id]/drawings/[drawingId].tsx`) now read from PowerSync via `usePowerSyncProjects` / `usePowerSyncProject`. Residual known risk: `powerSyncProjects.length > 0 ? powerSyncProjects : storeProjects` fallback can surface stale "phantom" projects if a user genuinely has 0 projects. |
| B12 | **[OPEN]** Dangling attachment refs cause an infinite 404 retry loop | Attachments/Sync | `onDownloadError` in `lib/attachments/attachmentQueue.ts` correctly returns `false` for a permanent 404, but `createWatchAttachments` re-emits the full item list on every change to `profiles`, `projects`, `reports`, `drawings`, or `snags`, so the dead ref is re-enqueued and re-attempted. Known dead refs: `cd2d21bc-afcb-4467-8cd2-d9bec8fcd720.jpg`, and `project_cover_1781178598183_z5igyh.jpg` / `project_cover_1781675349790_kqir3w.jpg` under `cdbff53b-6290-45ff-8966-dcbdc0b29273/`. |
| B13 | **[OPEN]** Report-count paywall wrongly blocks Snagging and Quick Log | Gating/Paywall | On the project detail screen, a free user with 3+ reports taps the "Snagging" or "Quick Log" card and gets blocked by the report-count paywall alert ("Free users can only create up to 3 reports"). Affected users cannot even view existing snags. |

## HIGH — correctness

| # | Issue | Area |
|:--|:------|:-----|
| H1 | `app/project/[id]/report/create.tsx:434` — undefined `project` in snag photo upload payload. **Re-verify against current main** (predates S5–S7 rework). | AI snag |
| H2 | `app/project/[id]/team.tsx:51-52` — untyped Supabase RPC response; `data.success` unsafe | Team |
| H3 | **`fetchUserProjects` filters by `user_id` only** — a user added via `project_members` never sees the shared project, yet `fetchUserActivities` / `fetchUserCalculations` *do* resolve through `project_members`. Sharing is half-wired. Resolved by Phase 7. | Sync/Team |
| H4 | `insertCalculation(calculation: any)` — untyped parameter | Sync |
| H5 | No Arabic / RTL despite `expo-localization` being installed | i18n |
| H8 | **Pending local attachment loss during user switch / reset (`clearPowerSyncForNewUser`)** | Sync/Attachments | When a user signs out or switches accounts with unsynced local attachments, `clearPowerSyncForNewUser` wipes the local attachment queue and PowerSync SQLite database. If a referencing database row (e.g. `projects.photo_url` or `reports`) synced to Supabase Postgres before the binary uploaded, the row retains a reference to a nonexistent storage object (observed on project "Castle"). UI handles missing storage objects gracefully; users are prompted with an explicit warning during sign-out. |
| H9 | **Cleanup of superseded legacy `userId/*` cover objects** | Storage/Maintenance | Five project covers were backfilled from `report-photos/{userId}/project_cover_*.jpg` to `report-photos/{projectId}/project_cover_*.jpg`. The original objects were preserved for safety. Follow-up cleanup task: delete the 5 original `cdbff53b-6290-45ff-8966-dcbdc0b29273/project_cover_*.jpg` objects from `report-photos` storage once device acceptance confirms all project-scoped covers render cleanly across devices. |




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

### ✅ RESOLVED (FIXED) — B4: Binary file uploads bypass PowerSync queue
- **Symptom / Vulnerability**: Prior to this fix, binary file uploads (project cover photos, daily/snagging report photos, architectural drawing documents, and user avatars) used ad-hoc HTTP/REST uploads (`FileSystem.uploadAsync` or Supabase Storage SDK) directly from UI screens. When a field engineer created or edited entities offline, the database row was written to SQLite and synced via PowerSync CRUD queue, but the binary file upload failed immediately, permanently leaving orphaned references (or local-only `file://` URIs) in the database and causing data loss for other collaborators on the project.
- **Architecture & Fix (built on `@powersync/common@1.57.2` / `@powersync/react-native@1.35.9`)**:
  1. **Attachment Table Schema (`lib/powersync/AppSchema.ts`)**: Registered `attachments: new AttachmentTable()` with default options (resolves table name to `attachments`, internal view to `powersync_attachments_attachments`).
  2. **Local Storage Adapter (`lib/attachments/localStorage.ts`)**: Implemented `ExpoFileSystemLocalStorageAdapter` backed by `File`, `Directory`, and `Paths` from `expo-file-system` (SDK 54), strictly rooting local attachments under `${Paths.document}/attachments` (never cache directory, preventing OS purge). Slices byte buffers safely with `Uint8Array.prototype.subarray`/`slice` to avoid pooled ArrayBuffer offset issues.
  3. **Remote Storage Adapter (`lib/attachments/remoteStorage.ts`)**: Implemented `SupabaseRemoteStorageAdapter` with project-scoped remote paths (`${projectId}/${attachment.filename}`) for `drawings` and `report-photos`, and user-scoped paths (`${userId}/${attachment.filename}`) for `avatars`. Uploads use `POST` with `x-upsert: true` and explicit `Content-Type` headers. `deleteFile` is strictly idempotent (404/not-found handled as success). `downloadFile` fallback handles base64 decode safely using `base64-arraybuffer.decode()`.
  4. **Watch Query with FROM-Clause Sanitization (`lib/attachments/watchAttachments.ts`)**: Exported `ATTACHMENT_WATCH_QUERY` watching `projects.photo_url`, `profiles.avatar_url`, `drawings.storage_path`, and `reports.template_data` (photos). Sanitizes `json_each` argument directly in the `FROM` clause (`CASE WHEN json_valid(template_data) THEN CASE WHEN json_type(template_data, '$.photos') = 'array' THEN json_extract(template_data, '$.photos') ELSE '[]' END ELSE '[]' END`) with CTE `report_photos_raw`, eliminating SQLite abort errors on corrupt/legacy JSON.
  5. **Attachment Queue Singleton & Error Handler (`lib/attachments/attachmentQueue.ts`)**: Initialized singleton `AttachmentQueue` with `attachmentErrorHandler` returning `true` for all errors to prevent archive/restore churn loops on network errors or transient 403s.
  6. **Media Resolver & Classification (`lib/attachments/resolveMediaUri.ts`)**: Implemented `classifyMediaSource` with strict regex `/^[^/\\]+\.[A-Za-z0-9]{1,10}$/` and `{`, `[` guards. Priority resolution checks local disk first for instant offline rendering, falling back to cached signed/public URLs with a 3000s TTL.
  7. **Startup Reconciliation & Lifecycle (`lib/powersync/lifecycle.ts`, `cleanupStagedAttachments.ts`)**: Sweeps and removes unreferenced `QUEUED_UPLOAD` attachments on startup. Integrated `attachmentQueue.startSync()`, table resolution assertions, and non-destructive `teardownPowerSync` that preserves pending offline attachments across sign-out.
  8. **Storage RLS Policies (`supabase/migrations/20260819120000_b4_collaborative_storage_policies.sql`)**: Configured collaborative project-membership RLS policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `drawings` and `report-photos` buckets using SECURITY DEFINER STABLE helper `public.can_access_project(p_id text)`, while preserving legacy user-scoped policies.
  9. **Sync-Ordering Race & Indefinite Retry Semantics**: Project-scoped uploads (`${projectId}/${filename}`) require the `projects` row to reach Postgres and trigger `handle_new_project()` before storage RLS can authorize the upload. Because PowerSync's AttachmentQueue and CRUD upload queues operate independently, HTTP 403 Forbidden errors are expected on initial reconnect after creating projects offline. These transient 403s are logged with a clear diagnostic warning and automatically resolve on the next 30-second attachment queue tick once the CRUD queue flushes the project row. Note: if a project row were to permanently fail to sync (e.g. schema violation), its associated attachments will remain in `QUEUED_UPLOAD` state and retry indefinitely until resolved.
- **Coverage**: 6 dedicated test suites in `lib/attachments/__tests__/` (14 assertions including SQLite JSON1 resilience against 9 malformed fixtures, cross-device path parity, classification predicate parity, local resolution priority, remote idempotency, and lifecycle sign-out preservation). All 21 test suites in the repository pass.

- **Fix**:
  1. **`processLock` in `lib/supabase.ts`**: Configured `lock: processLock` from `@supabase/supabase-js` in the client's `auth` options. This serializes all internal token acquisitions and refresh requests across the process.
  2. **AppState Auto-Refresh Lifecycle in `app/_layout.tsx`**: Added an `AppState` event listener (registered once at mount, removed on unmount) backed by pure helper `handleAppStateAuthRefresh` (`lib/auth/appStateAutoRefresh.ts`). When the app enters `'active'`, it resumes auto-refresh via `supabase.auth.startAutoRefresh()` if authenticated (`'online'` or `'offline-grace'`), or stops it if `'signed-out'` (guaranteeing any lingering timer is halted). Any transition to non-active states (`'background'`, `'inactive'`, `'unknown'`) halts auto-refresh via `supabase.auth.stopAutoRefresh()`.
  3. **PowerSync Connector (`lib/powersync/Connector.ts`)**: `fetchCredentials()` remains a plain `supabase.auth.getSession()` call. With `processLock` active in the client, token acquisition is safely serialized without needing ad-hoc locking in callers.
  4. **Security Invariant**: Supabase's "Detect and revoke potentially compromised refresh tokens" is deliberately left **enabled**; `processLock` is what ensures legitimate concurrent client refreshes are serialized and never trigger false-positive revocations.
- **Coverage**: `handleAppStateAuthRefresh` is covered by pure unit tests in `lib/auth/__tests__/appStateAutoRefresh.test.ts` across all state transitions (`active`, `background`, `inactive`, `unknown`, `signed-out`, `online`, `offline-grace`).

### ✅ RESOLVED — Storage uploads via uriToBlob write 0-byte files (uploadPhoto, uploadAvatar)
- ✅ RESOLVED (branch fix/upload-blob-zero-bytes): `uploadPhoto` and `uploadAvatar` now use `FileSystem.uploadAsync` with `BINARY_CONTENT` (same fix applied to `uploadDrawingFile` in M6.3b). Verified on iOS: avatar and report-photo uploads write real (non-zero) bytes to their Supabase Storage buckets and render correctly in-app. `uriToBlob` removed from `lib/supabaseSync.ts`.

### ⚠️ PARTIALLY CLOSED — B6: Photos stored as base64 in ProjectSnag.photos: string[]
- **Forward Fix (PR #22 / commit `1887d8e`)**: Verified on a from-scratch simulator and physical device with cold cache: new snag row is ~88 bytes with bare UUID refs, binary objects uploaded to `report-photos/<projectId>/`, and photos render on cold read directly from Supabase Storage without local cache.
- **Remaining Open Scope (Issue #21)**: Backfill of 64 legacy base64 snags (~26 MB) and 13 legacy reports (~4.37 MB) still holding base64 to Supabase Storage objects remains open.

### ✅ RESOLVED (BLOCKER) — B11: Fresh install loses all project navigation
- **Symptom**: On a fresh app install, opening projects, editing projects, or viewing drawings failed or rendered empty/missing screens due to unpopulated Zustand store.
- **Root Cause**: Screens read projects from the persisted Zustand store array (`projects`), which is empty on a clean install because `initialSync` in `store/projectsStore.ts` is deprecated and never called on startup.
- **Resolution Status**: Resolved across PR #22 and PR #24 (`9467819`, `dc75284`).
  - Snag and report screens (`app/project/[id].tsx`, `snags/index.tsx`, `snags/create.tsx`, `snags/[snagId].tsx`, `snags/report.tsx`, `report/create.tsx`, `team.tsx`, `drawings/index.tsx`) migrated to `usePowerSyncProject` in #22.
  - Remaining screens (`app/project/create.tsx`, `app/ai-wizard.tsx`, `app/quick-log.tsx`, `app/saved-calculations.tsx`, `components/SaveCalculationModal.tsx`, `app/project/[id]/drawings/[drawingId].tsx`) migrated in PR #24 to `usePowerSyncProjects` / `usePowerSyncProject` / `usePowerSyncDrawings`.
  - Added `useRef` prefill guard in `app/project/create.tsx` to prevent unstable-identity re-render loops.
- **Residual Known Risk**: The fallback pattern `powerSyncProjects.length > 0 ? powerSyncProjects : storeProjects` means a user with genuinely zero projects can fall back to a stale Zustand array from AsyncStorage and see phantom projects (e.g. triggering false duplicate name errors in create project or showing phantom cards in AI wizard).

### ⚠️ OPEN (BLOCKER) — B12: Dangling attachment refs cause an infinite 404 retry loop
- **Symptom**: Repeated `404 / 400` download failure warnings in logs on every sync/data change.
- **Root Cause**: `onDownloadError` in `lib/attachments/attachmentQueue.ts` correctly returns `false` for a permanent 404 to avoid immediate retry. However, `createWatchAttachments` re-evaluates and re-emits the full item list on every local database change to `profiles`, `projects`, `reports`, `drawings`, or `snags`. Consequently, dead attachment references are re-enqueued into the queue and re-attempted infinitely.
- **Known Dead References**:
  - `cd2d21bc-afcb-4467-8cd2-d9bec8fcd720.jpg` (`profiles.avatar_url`)
  - `project_cover_1781178598183_z5igyh.jpg` (`projects.photo_url` under `cdbff53b-6290-45ff-8966-dcbdc0b29273/`)
  - `project_cover_1781675349790_kqir3w.jpg` (`projects.photo_url` under `cdbff53b-6290-45ff-8966-dcbdc0b29273/`)

### ⚠️ OPEN (BLOCKER) — B13: Report-count paywall wrongly blocks Snagging and Quick Log
- **Symptom**: On the project detail screen, a free user with 3+ reports taps the "Snagging" card and gets the alert "Premium Required — Free users can only create up to 3 reports." The same happens for "Quick Log". Creating and viewing snags from the AI wizard works fine, so the feature itself is not gated.
- **Root Cause**: In `app/project/[id].tsx`, the category card `onPress` handler (~line 496) wraps all route branches in `if (checkReportLimit())`. `checkReportLimit()` (defined ~line 277) only checks `reports.length >= 3` and is therefore semantically correct only for the `report/create` branch. The `snags/create` branch (~line 501, which redirects to the snags list) and the `quick-log` branch (~line 499) are unrelated to report count but inherit the gate. Note the gate blocks navigation, so affected users cannot even view existing snags.
- **Scope**: Snagging card and Quick Log card on the project detail screen. Snags reached via the AI wizard are unaffected.
- **Proposed Fix (not applied)**: Move the `snags/create` and `quick-log` redirects above the `checkReportLimit()` call so the gate applies only to the `report/create` branch. No change to `checkReportLimit()` itself.

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

# B4-attachment-queue session — 2026-08-26

Branch `fix/b4-attachment-queue`. Verified on iOS Simulator dev build.

## ✅ RESOLVED — Viewers had CRUD access to daily reports
Two independent causes:
- **Client** (`128ec95`): `ReportCardItem` rendered edit/delete unconditionally.
  Added `canManage` prop gating all row actions and creation entry points.
- **Server** (`8b0d8a4`): policy `"Users can manage reports for their projects"`
  was `cmd=ALL` gated on `is_project_member()`, granting INSERT/UPDATE/DELETE to
  every member including viewers. Replaced with four role-aware policies:
  SELECT for members via `can_access_project`, INSERT/UPDATE/DELETE via
  `can_manage_project`. Migration
  `supabase/migrations/20260824150000_reports_role_aware_rls.sql`.
- Verified: `pg_policies` shows exactly 4 rows on `public.reports`, no `cmd=ALL`,
  UPDATE `with_check` identical to `qual`.
- Note: `user_id = auth.uid()` deliberately NOT added to the INSERT check — the
  app stamps the project owner as `user_id`, so it would break manager inserts.
- Note: `Connector.ts` drops RLS 42501 errors to avoid head-of-line blocking, so
  server RLS alone produces silent local divergence. Both the UI gate and the
  server policy are required; neither is redundant.

## ✅ RESOLVED — Two login screens after sign-out
Two independent causes, both required fixing:
- **Router** (`8f8bb04`): `app/_layout.tsx` declared
  `<Stack.Screen name="project" />`, which matches no route. All twelve
  `project/*` routes therefore sat OUTSIDE `Stack.Protected`, survived sign-out,
  and were reachable by swipe-back — an auth bypass, not just a cosmetic bug.
  Replaced with the twelve real nested route names.
- **Imperative nav** (`2e5f920`): `app/settings.tsx` called
  `router.replace('/(auth)/login')` after `signOut()`, mounting a second login
  on top of the one the declarative guard had already rendered.
- Verified 2026-08-26 on simulator dev build: one `SIGNED_OUT` event, sign-out
  completes in ~440ms, one login screen, swipe-back reveals nothing.
- Regression test added asserting `app/settings.tsx` contains no imperative
  navigation to auth routes, and that `'project'` is absent from rendered
  screen names (`39bfa03`).

### New invariant — DO NOT REGRESS
11. **Auth navigation is declarative only.** `Stack.Protected` in
    `app/_layout.tsx` owns all auth-state navigation. Never call
    `router.replace`/`push` to an auth route after `signOut()` — it mounts a
    duplicate login screen. Route names in the guard must be the real nested
    paths (`project/[id]`, not `project`); a name matching no route silently
    places every child route outside the guard.

## Diagnostic findings — do not re-investigate

- **Simulator log noise**: `hapticpatternlibrary.plist`, `CVPixelBufferCreate`,
  WebKit warnings. Missing simulator runtime files, triggered by keyboard input.
  Not present on device. Not actionable.
- **Duplicate `onAuthStateChange` listeners** observed mid-session were Fast
  Refresh ghosts — old module instances retaining live subscriptions across
  reloads. NOT a production defect; a cold start shows exactly one listener.
  The `initialize()` memo guard (`ec6b829`) is still correct and retained,
  along with `__resetAuthInitForTests()` as its test seam.
- **`JWT issued at future`** on simulator = host clock skew, not code. Erase
  simulator content/settings. While present, all profile-dependent behaviour is
  unreliable — do not trust permission testing on that instance.
- **`ERR_FILE_PERMISSION` (shareAsync)** and **`Network request failed`**: never
  reproduced as a user-facing failure. Noise.

## Environment gotchas (not defects)
- **PowerSync dashboard log timestamps are UTC**: They will read hours behind local time. This is not clock skew. Real skew presents as a Supabase "JWT issued at future" error and blocks sync entirely.
- **Simulator clock drift after long suspend**: Extended suspend states on the iOS simulator can produce that Supabase "JWT issued at future" error. Fix by erasing simulator content and settings, not by touching auth configuration.

## Verified storage path conventions
Established by querying `storage.objects` directly, not inferred:
- A ref containing `/` is already a complete storage path — use VERBATIM.
  (13/13 prefixed report photos, 4/4 drawings, 4 logos resolve as-is.)
- A bare ref in `report-photos` resolves under `project_id` (3/3 photos,
  5/5 covers). Covers also exist under `user_id` as the pre-H9 duplicates.
- A bare `avatar_url` resolves under the profile id.
- `user_id` is NEVER the correct prefix for a bare report photo.
Implemented in `resolveRemoteStoragePath` (`19a049e`), which previously
prefixed unconditionally and produced double-prefixed keys like
`report-photos/{projectId}/{userId}/{projectId}/file.jpg`.
The verbatim branch is currently UNREACHABLE because of the watch-query
filters below; it becomes live when those filters are dropped.

## OPEN — A1: "Loading media" spinner hangs forever on legacy projects
Related to the existing Notes entry ("logos stored as storage paths will not
render until re-picked — no migration by design"). That design decision is
accepted; the defect is that the UI **hangs on a spinner** instead of showing a
placeholder.

Mechanism: `ATTACHMENT_WATCH_QUERY` (`lib/attachments/watchAttachments.ts`)
reads only `$.photos` from `reports.template_data` — `$.logos` is never
selected. All four branches additionally filter `NOT LIKE '%/%'` (lines 30, 53,
69, 85), and every logo ref is slash-prefixed, so logos are excluded twice.
No attachment record is ever created, so anything awaiting one waits forever.

Measured: 71 logo refs, 15 distinct, 4 present in `report-photos`, 11 absent
(consistent with "not re-picked yet", per the Notes entry).

Minimal fix (preferred): gate the media UI on a resolved/failed state rather
than on presence of an attachment record, and render a placeholder. This closes
the hang without expanding the queue.

Full fix, strictly in this order:
1. A2 (terminal-failure handling) FIRST. Adding a logos branch before it would
   admit 13 permanently-unresolvable objects (11 logos + 2 covers) into an
   indefinite retry loop — see the B4 note on indefinite `QUEUED_UPLOAD` retry.
2. Then add a `logos` branch, drop the `NOT LIKE '%/%'` exclusions, carry the
   full ref, and sanitise `filename` (`replace(ref,'/','_')`) so local file
   naming survives the slash.

## OPEN — A2: Queue retries permanently-missing objects indefinitely
`attachmentErrorHandler` returns `true` for all errors (deliberate, to avoid
archive/restore churn), so a 404 is indistinguishable from a transient failure.
Supabase Storage returns **HTTP 400 with a `statusCode: "404"` body** for a
missing object, which is why these surface as 400s.
Prerequisite for A1. Needs a bounded attempt count or explicit
missing-object detection before the logos branch lands.

## OPEN — A3: Three dangling storage references
Rows pointing at objects absent from every bucket under every candidate prefix:
- `profiles.avatar_url` = `cd2d21bc-afcb-4467-8cd2-d9bec8fcd720.jpg`
  (user `cdbff53b-6290-45ff-8966-dcbdc0b29273`) — the sole recurring
  `Supabase download failed (400)` in the logs.
- `projects.photo_url` for projects `00d63259-b1ad-4d95-ae57-9943cfa984e5`
  and `ec605ff8-df86-4b0b-b6b5-249402e9a14b` (both slash-prefixed).
Likely instances of H8 (pending local attachment loss during user switch).
Decide per row: re-upload, or null the column and let the placeholder path
handle it.

## OPEN — A4: Component files inside `app/` are routable
`app/project/[id]/report/components/ManpowerSection.tsx` and
`PickerDropdown.tsx` are treated as routes by expo-router (they appear in the
router's own route list). Move outside `app/` (e.g. `components/report/`).
Isolated change; do not bundle with other work.

## OPEN — A5: Physical device cannot run current code
The ConstructionPro build on the test iPhone is a standalone build with its JS
bundled in: it ignores Metro, has no dev menu, and goes straight to login.
Expo Go is not an option (native `@powersync/op-sqlite` — "Base module not
found"). Any device observation is stale until a new dev build is installed.
The "2 login screens / swipe reveals main page" seen on device on 2026-08-26
was pre-fix code and is NOT evidence against the fixes above.
Note: `npx expo start --dev-client --localhost` is simulator-only; a device
needs LAN or `--tunnel`. See the existing "Dev environment" entry.

## OPEN — A6: Storage hardening not executed
- `pdfs` bucket: switch to `createSignedUrl`; lock buckets to private.
- End-to-end storage policy audit not run.
- PowerSync schema validation not run.
- Gate screens on `hasSynced` to prevent stale-state black screens.
- H9 cleanup (delete 5 superseded `userId/*` cover duplicates) still pending;
  our audit confirms the project-scoped copies exist, so it is safe to proceed
  once device acceptance is possible (blocked by A5).
