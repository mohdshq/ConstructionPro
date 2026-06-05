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
## M3.3 — Offline data-loss: partial fix (projects + reports only)
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

## M3.3c — Network detection + offline banner (NOT STARTED)
- Plan reviewed and approved: use @react-native-community/netinfo, add
  lib/useNetworkStatus.ts hook + components/OfflineBanner.tsx, mount banner in
  app/_layout.tsx (inside appContent's SafeAreaProvider).
- BLOCKED ON: requires a new dev build (netinfo is a native module). Defer until next
  dev build / stable network.
- BEFORE APPLYING: re-verify the _layout.tsx diff against the current appContent/
  PostHogProvider structure (the originally-proposed diff was against the pre-M2b layout).
- Scope: detection + display only. No sync/queue/retry (that's M4).

## M3.3b — Offline reconcile ✅ VERIFIED (with known gap)
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
