# ConstructionPro — Master Development Roadmap

> **Last updated**: 2026-05-22 (Phase 3 complete)
> **Architecture**: Expo Router v6 + React Native + Zustand + Supabase + RevenueCat
> **Goal**: Launch a premium construction site management app on iOS/Android in ~10 weeks

---

## Status Overview

| Phase | Name | Status | Key Deliverables |
|:---:|:---|:---:|:---|
| 0 | Stabilization & Bug Fixes | ✅ DONE | isPremium fix, Zustand v5, cleanup, AI refactor |
| 1 | Supabase Backend Foundation | ✅ DONE | Auth flow, DB schema, RLS, Supabase client |
| 2 | Connect App to Live Backend | ✅ DONE | Cloud CRUD, Storage buckets, AI Edge Function, image compression |
| 3 | Data Enhancement & Real-time | ✅ DONE | Supabase Realtime, profile sync, photo uploads, connection badge |
| 4 | Premium Features & Polish | 🔲 | PDF export cloud, team sharing, advanced calculators, push notifications |
| 5 | Launch Preparation | 🔲 | App Store assets, performance optimization, analytics, CI/CD |

---

## Phase 0: Stabilization & Bug Fixes ✅

**Completed in conversation 33ee45e9**

- [x] Fixed `isPremium` rehydration bug (was forced to `false` in 3 places)
- [x] Migrated Zustand from v3 to v5 API (modern `create` + `persist`)
- [x] Removed 21MB `test.ipa` from git history
- [x] Removed 8 dead script files
- [x] Refactored AI tab to use model discovery + fallback
- [x] Added theme system with `useThemeColors` (light/dark/system)
- [x] Added unit system toggle (metric/imperial)

---

## Phase 1: Supabase Backend Foundation ✅

**Completed in conversation 33ee45e9**

- [x] Installed `@supabase/supabase-js` + `react-native-url-polyfill`
- [x] Created `.env` with Supabase project URL and anon key
- [x] Built `lib/supabase.ts` — typed client singleton with AsyncStorage persistence
- [x] Created database schema (migration `20260521082100_init_schema.sql`):
  - `profiles`, `projects`, `reports`, `drawing_folders`, `drawings`
  - Row Level Security (RLS) on all tables
- [x] Built auth screens: Login, Register, Forgot Password (`app/(auth)/`)
- [x] Created `useAuthStore.ts` — session management with Supabase
- [x] Added auth guard in `_layout.tsx` — redirects to login when unauthenticated
- [x] Generated TypeScript types from Supabase schema

---

## Phase 2: Connect App to Live Backend ✅

**Completed in conversation 5eb35906**

- [x] **Security**: Fixed RLS policies — added `WITH CHECK` + `TO authenticated`
- [x] **Auto-profile**: Database trigger (`handle_new_user`) creates profile on signup
- [x] **Storage**: 3 Supabase Storage buckets (`report-photos`, `drawings`, `avatars`)
  - Per-user folder isolation via RLS
  - File size limits: 10MB photos, 50MB drawings, 2MB avatars
- [x] **Auth store enhanced**: Fetches real profile from `public.profiles`
  - Added `updateProfile()`, `refreshProfile()`, `signOut()`
  - Added Sign Out button to Settings screen
- [x] **Projects store → Supabase**: All CRUD operations write-through
  - Optimistic local updates + background Supabase push
  - `initialSync()` pulls all data from Supabase on login
- [x] **Image compression**: `lib/imageUtils.ts` with `expo-image-manipulator`
  - Photos: 1920px max, JPEG 0.7 (~300KB from 5MB originals)
  - Thumbnails: 800px max, JPEG 0.6
- [x] **AI Edge Function**: `ai-chat` deployed on Supabase
  - Dynamic model discovery (works with any Gemini API key)
  - Server-side API key (never exposed to client)
  - Removed `@google/generative-ai` client-side dependency
- [x] **Sync on login**: `_layout.tsx` triggers `initialSync()` after auth
- [x] **Web fixes**: `Alert.alert` → `window.confirm` on web platform

---

## Phase 3: Data Enhancement & Real-time ✅

**Completed in conversation 5eb35906**

- [x] **Supabase Realtime**: Subscriptions on `projects` and `reports` tables
  - `useRealtimeSync.ts` hook — subscribes to INSERT/UPDATE/DELETE
  - `_applyRemote*` methods in store — local-only state updates (no infinite loop)
  - REPLICA IDENTITY FULL for proper DELETE payloads
- [x] **Report Photo Uploads**: Photos compressed + uploaded to `report-photos/` bucket on save
  - Storage paths stored in `templateData` instead of local URIs
  - Signed URL resolution when viewing reports
  - Save button shows "Saving..." during upload
- [x] **Profile Sync**: Settings → Supabase profiles table
  - Avatar: compress → upload to `avatars/{userId}/avatar.jpg` → update profile
  - Name: debounced sync (1s after typing)
  - Dashboard uses Supabase profile data with local fallback
- [x] **Connection Badge**: `ConnectionBadge.tsx` shows Online/Offline/Syncing + last sync time
  - Added to Dashboard and Projects screens
- [x] **Pull-to-Refresh**: Projects FlatList with `RefreshControl` → `initialSync()`
- [x] **Migration**: `20260522045200_phase3_realtime.sql`

---

## Phase 4: Premium Features & Polish 🔲

**Goal**: Build the features that differentiate ConstructionPro from competitors and justify the $19.99/month premium tier.

### 4.1 Cloud PDF Generation
- [ ] Move PDF generation to Edge Function (faster, consistent rendering)
- [ ] PDF template versioning
- [ ] PDF download/share from cloud

### 4.2 Team Sharing
- [ ] Invite team members by email
- [ ] Role-based access (Owner, Manager, Viewer)
- [ ] Activity feed per project

### 4.3 Push Notifications
- [ ] Expo push notifications setup
- [ ] Report submission notifications
- [ ] Team activity alerts

### 4.4 Enhanced Calculators
- [ ] Save calculation results to projects
- [ ] Calculation history
- [ ] Share calculations as PDF

### 4.5 App Polish
- [ ] Skeleton loading screens
- [ ] Pull-to-refresh on all lists
- [ ] Empty states with onboarding hints
- [ ] Error boundaries and retry UI
- [ ] Haptic feedback on actions

---

## Phase 5: Launch Preparation 🔲

**Goal**: Get the app ready for App Store/Play Store submission.

### 5.1 App Store Assets
- [ ] App icon (all sizes)
- [ ] Splash screen
- [ ] App Store screenshots (iPhone, iPad)
- [ ] Play Store feature graphic
- [ ] App description and keywords

### 5.2 Performance
- [ ] Bundle size audit
- [ ] Image lazy loading
- [ ] List virtualization audit
- [ ] Startup time optimization

### 5.3 Analytics & Monitoring
- [ ] Crash reporting (Sentry or similar)
- [ ] Usage analytics
- [ ] RevenueCat events

### 5.4 CI/CD
- [ ] EAS Build configuration
- [ ] Automated builds on push
- [ ] OTA updates via EAS Update

### 5.5 Security Audit
- [ ] API key rotation plan
- [ ] Deep link security
- [ ] Storage bucket audit
- [ ] RLS policy review

---

## Architecture Reference

```
ConstructionPro/
├── app/
│   ├── (auth)/           # Login, Register, Forgot Password
│   ├── (tabs)/           # Main app tabs
│   │   ├── index.tsx     # Dashboard
│   │   ├── projects.tsx  # Project list
│   │   ├── tools.tsx     # 48 calculators
│   │   ├── ai.tsx        # AI Assistant (Edge Function)
│   │   ├── standards.tsx # Construction standards
│   │   └── explore.tsx   # Community/resources
│   ├── project/          # Project detail, reports, drawings
│   ├── settings.tsx      # Profile, theme, premium, sign out
│   └── _layout.tsx       # Root layout with auth guard
├── store/
│   ├── useAuthStore.ts   # Supabase auth + profile
│   ├── projectsStore.ts  # Projects/reports CRUD (Zustand + Supabase)
│   ├── useStore.ts       # App preferences (theme, units, premium)
│   ├── useAIStore.ts     # Chat history
│   └── useThemeColors.ts # Theme color tokens
├── lib/
│   ├── supabase.ts       # Supabase client singleton
│   ├── supabaseSync.ts   # Typed CRUD helpers for all tables + storage
│   └── imageUtils.ts     # Image compression utilities
├── types/
│   └── supabase.ts       # Auto-generated DB types
├── supabase/
│   ├── migrations/       # SQL migration files
│   └── functions/        # Edge Functions (deployed via MCP)
└── .env                  # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
```

---

## Supabase Resources

| Resource | Details |
|:---|:---|
| **Project URL** | `https://nalbazjndjozdksulbwx.supabase.co` |
| **Database** | PostgreSQL 17.6 |
| **Tables** | profiles, projects, reports, drawing_folders, drawings |
| **Storage Buckets** | report-photos, drawings, avatars |
| **Edge Functions** | ai-chat (Gemini proxy) |
| **Auth** | Email/password (email confirmation disabled for dev) |

---

## Key Decisions Log

| Date | Decision | Rationale |
|:---|:---|:---|
| 2026-05-21 | Supabase as backend | User preference; free tier, Postgres, auth, storage, edge functions |
| 2026-05-21 | PowerSync deferred to Phase 3+ | Requires separate cloud account; get online-first working first |
| 2026-05-21 | Write-through sync pattern | Optimistic local UI + background Supabase push; simple, works well |
| 2026-05-21 | Gemini API key as Edge Function secret | Never expose to client; easy to rotate; any valid key works |
| 2026-05-21 | Dynamic model discovery | User's API key didn't have access to hardcoded model names |
| 2026-05-21 | Image compression before upload | 1920px/0.7q saves ~70% storage; user requested cost optimization |
