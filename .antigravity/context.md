# ConstructionPro — Agent Context

## Project Identity
ConstructionPro is a cross-platform mobile app (iOS + Android + Web) for construction
teams: small-to-mid GCs, specialty subcontractors, foremen, and field crews.

## Mission
Become the fastest, most offline-reliable, AI-native field app in construction.
Beat Procore on speed and UX. Beat Raken on features. Beat Fieldwire on AI.

## Tech Stack (DO NOT CHANGE without explicit instruction)
- Expo SDK 54 + Expo Router v6 (file-based routing)
- React Native 0.81, React 19.1
- TypeScript ~5.9 (strict mode preferred)
- Zustand v5 for state management (with persist middleware)
- Supabase (Postgres + Auth + Storage + Edge Functions + Realtime)
- RevenueCat for subscriptions
- Lucide React Native for icons
- date-fns for dates
- expo-print for PDF generation (local, working well)

## Architecture Rules
1. File-based routing — every screen lives under /app
2. Business logic lives in /store (Zustand) and /lib (helpers)
3. Supabase access goes through /lib/supabaseSync.ts — never call supabase directly from screens
4. All photos must be compressed via /lib/imageUtils.ts before upload
5. Every Supabase table has Row Level Security enabled — never disable it
6. Edge Functions hold all secrets; never put API keys in the client
7. Theme colors come from useThemeColors — no hardcoded hex values in screens
8. Units (metric/imperial) come from the user setting in useStore — calculators must respect it

## Code Style
- Functional components only, no classes
- Named exports preferred over default exports for utilities; screens use default export
- Async/await over .then()
- TypeScript strict — no `any` unless justified in a comment
- Small files: split a screen >300 lines into components in /components

## Agent Behavior Rules
1. ALWAYS read existing related files before editing — match existing patterns
2. ALWAYS run a TypeScript check after edits (npx tsc --noEmit)
3. NEVER delete user data migrations — only add new ones
4. NEVER bump Expo SDK or React Native versions without explicit approval
5. When unsure, ASK before making destructive changes
6. After every change, write a one-paragraph summary of what changed and why
7. Prefer surgical edits over rewrites — don't reformat untouched code

## Current Phase
Phase 5a: Foundation hardening. Offline-first, drawings viewer, repo polish.
Phases 0–4 are complete (auth, backend, realtime, sharing, push, calculators).
