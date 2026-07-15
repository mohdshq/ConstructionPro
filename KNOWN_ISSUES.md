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
- [ ] `app/ai-wizard.tsx` — RUNTIME ISSUE: screen hangs while loading and
      silently navigates back to dashboard when user records a snag.
      Two prior fix attempts (commits 8da69c3, 1361d82) addressed web image
      manipulation but the core flow is still broken. DEFERRED to post-M2
      when Sentry stack traces will provide reproduction context.


## High (incorrect behavior or type unsafety)

- [ ] `app/project/[id]/team.tsx:51-52` — Untyped Supabase RPC response
      causes `data.success` / `data.error` to fail at runtime.
- [ ] `components/SaveCalculationModal.tsx:72` — References
      `proj.referenceNumber` which does not exist on the Project type.
## M2b — PostHog runtime verification ✅ VERIFIED
- Verified live on iOS Simulator dev build: 'M2b Test Event' captured via usePostHog().capture() + flush() appeared in PostHog Events dashboard (US region). Autocapture (Application Opened) also confirmed firing.
## M3.3 ✅ RESOLVED — Offline data-loss: partial fix (projects + reports only) 
- M3.3b made initialSync NON-DESTRUCTIVE for projects and reports: local records
  with syncStatus === 'pending' that are absent from the server are now PRESERVED
  (not wiped), fixing the catastrophic "offline-created report disappears on sync" bug.
- STILL DESTRUCTIVE (data-loss bug remains): folders, drawings, activities, calculations.
  These have optimistic offline-create paths that silently swallow failures and are still
  wholesale-overwritten by initialSync. They lack the syncStatus field.
  TO FIX: extend M3.3a groundwork (syncStatus on interfaces/mappers/add fns) to these four,
  then add them to the reconcile — OR resolve fully via M4 PowerSync.
- Legacy records (syncStatus === undefined) absent from server are DROPPED by design
  (treated as remote-deleted, not resurrected) to avoid zombie data.
- Offline EDITS to existing records: server wins on sync (edit-conflict resolution
  deferred to M4). Only offline CREATES are preserved.

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

- [ ] `app/ai-wizard.tsx` — RUNTIME ISSUE (compiles fine post-M1.6b but the
      screen hangs while loading and silently navigates back to dashboard
      when user attempts to record a snag photo. Two prior fix attempts
      addressed web-platform image manipulation but the core flow is
      still broken. DEFERRED to post-M2 when Sentry will provide stack
      traces and reproduction context.
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
setupPowerSync() is NOT yet wired into app startup (deferred to M4.2). user_tokens intentionally excluded from sync (PK is user_id, kept on direct-Supabase path). Dev note: PowerSync Development tokens toggle still ON (enable for diagnostics) — disable before production.

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
