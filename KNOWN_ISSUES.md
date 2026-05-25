# Known Issues

Tracked pre-existing issues discovered during Phase 5a hardening.
These will be addressed in Milestone 1.6 (TypeScript bug fixes) before
we proceed to Milestone 2 (Sentry/PostHog observability).

## Critical (will crash for real users)

- [ ] `app/(auth)/register.tsx:50` — Missing `Alert` import from 'react-native'.
      Crashes when registration fails.
- [ ] `app/ai-wizard.tsx:3` — Wrong import: uses `react-router-native`
      instead of `expo-router`. Screen does not function.
- [ ] `app/project/[id]/report/create.tsx:434` — Undefined variable `project`
      in snag photo upload payload. Crashes the AI snag-from-photo feature.

## High (incorrect behavior or type unsafety)

- [ ] `app/project/[id]/team.tsx:51-52` — Untyped Supabase RPC response
      causes `data.success` / `data.error` to fail at runtime.
- [ ] `components/SaveCalculationModal.tsx:72` — References
      `proj.referenceNumber` which does not exist on the Project type.

## Low (config / hygiene)

- [ ] `tsconfig.json` does not exclude `supabase/functions/**` — 24 false-positive
      Deno errors pollute `npx tsc --noEmit` output.
- [ ] Web platform: RevenueCat singleton errors in browser console when
      paywall actions are triggered. Should gracefully no-op on web.
