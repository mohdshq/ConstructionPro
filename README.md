# ConstructionPro

> The mobile-first construction toolkit for site engineers, QS, and contractors.
> Reports · Snagging · Drawings · 30+ Engineering Calculators · Gulf Standards · AI Assistant.

Built with **Expo (React Native + Web)** for iOS, Android, and Web from a single codebase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, Expo Router v6 (file-based) |
| Language | TypeScript 5.9 |
| State | Zustand v5 + persist (AsyncStorage) |
| AI | Google Generative AI (Gemini) — via backend proxy (Phase 1+) |
| Payments | RevenueCat |
| Backend | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) — Phase 1 |
| Error tracking | Sentry |

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your real values (Supabase, RevenueCat, Sentry…)
```

### 3. Run the app
```bash
npm run start      # Expo dev server (choose iOS / Android / Web)
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web (Expo Web)
```

---

## Project Structure

```
app/                    # Expo Router file-based routes
  (tabs)/               # 5 main tabs: Dashboard, Projects, AI, Tools, Standards
  project/              # Project detail + reports + drawings
  *-calculator.tsx      # 30+ engineering calculators
components/             # Shared UI components
store/                  # Zustand stores (app, projects, AI, theme)
data/                   # Static data (calculator definitions)
constants/              # Theme & color tokens
hooks/                  # Custom hooks
assets/                 # Images & fonts
```

---

## Branching

- `main` — production, protected
- `genspark_ai_developer` — active development branch; PRs target `main`

All changes go through PR review.

---

## Roadmap

See [docs/ROADMAP.md](./docs/ROADMAP.md) (coming soon) for the phased plan from MVP to v1.

---

## License

Proprietary — © ConstructionPro. All rights reserved.
