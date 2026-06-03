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
## M2b — PostHog runtime verification pending
- PostHog analytics integrated and code-complete (installed, type-checks clean, dev build compiles).
- LIVE runtime test (capturing a test event and confirming it lands in the US PostHog
  dashboard) is DEFERRED — blocked by unstable network (building Wi-Fi has client
  isolation; ngrok tunnel persistently drops/fails on this network).
- TO VERIFY when on a stable network: run
  `EXPO_PUBLIC_POSTHOG_FORCE_ENABLE=true npx expo start --dev-client`, trigger a
  `posthog.capture('Test Event')`, confirm it appears in PostHog → Activity.
- Config values live in `.env` (EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST, US region).
- Analytics are DISABLED in dev by default (conditional PostHogProvider render);
  enabled in production builds, or in dev via EXPO_PUBLIC_POSTHOG_FORCE_ENABLE=true.
## Dev environment — network connectivity blocker
- Current dev Wi-Fi ("Azizi_Phase4") is a managed/isolated network (client isolation on,
  router admin unreachable) — direct LAN Metro connection fails.
- ngrok tunnel works intermittently but drops frequently / sometimes fails to start.
- iPhone Personal Hotspot + Mac: loopback routing issue (dev client can't reach Metro on
  same phone's hotspot).
- WORKAROUND: retry tunnel until a connection holds; long-term consider a personal
  travel router or a network you control for reliable on-device testing.

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
