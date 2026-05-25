# ConstructionPro
> The fastest, offline-reliable, AI-native field app for construction teams.
> Manage projects, collaborate, and perform complex calculations instantly from the field.

![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-blue.svg) ![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg) ![License](https://img.shields.io/badge/license-Proprietary-red.svg)

> 🚧 **Status:** Phases 0–4 complete (auth, backend, realtime, team sharing, push notifications, 25+ tools). Currently in Phase 5a: offline-first and drawings markup.

## What is ConstructionPro?

ConstructionPro is a premium, cross-platform mobile application (iOS, Android, and Web) designed explicitly for modern construction teams, including small-to-mid GCs, specialty subcontractors, foremen, and field crews.

Unlike traditional heavy enterprise software, ConstructionPro is built for speed and offline reliability. It ensures that field workers have access to vital project data, drawings, and tools even without an internet connection, automatically syncing data back to the cloud when connectivity is restored.

Equipped with an AI-native interface, robust team collaboration features, and a comprehensive suite of calculation tools, ConstructionPro empowers teams to beat deadlines, minimize errors, and manage site operations with unprecedented efficiency.

## Why ConstructionPro

The construction software market is dominated by two extremes: heavy enterprise platforms (Procore, Autodesk) that cost $10K–$60K/year and overwhelm field crews, and cheap point tools that solve only one problem. Foremen, supers, and small GCs are stuck in the middle.

ConstructionPro is built for that middle. Three principles guide every decision:

- **Field-first, not office-first.** Every feature must work in airplane mode, with gloves on, in bright sunlight, on a 5-year-old Android phone.
- **AI as a workflow, not a chatbot.** Voice-to-report, photo auto-tagging, plan-aware Q&A — AI is embedded where work happens, not bolted on as a separate tab.
- **One app replaces five.** Daily reports, drawings, punch lists, time tracking, and calculators in a single, fast, coherent product — at a fraction of enterprise pricing.

## Key Features

### Field Tools
* **Offline-First Architecture**: View data and create reports without internet; auto-syncs when online.
* **Photo Compression**: In-app image compression (down to 300KB) saves storage and bandwidth.
* **PDF Export**: Generate PDF reports instantly right from your device.

### Project Management
* **Project Dashboard**: Comprehensive overview of project status, reports, and drawings.
* **Drawing Folders**: Organized access to project blueprints and schematics.
* **Daily Reports**: Log daily activities, snags, and quick logs seamlessly.

### AI Integration
* **AI Assistant**: Specialized AI chat to answer questions, analyze site conditions, and assist with calculations.

### Team Collaboration
* **Role-Based Access**: Owner, Manager, and Viewer permissions for secure team sharing.
* **Real-time Sync**: Instant updates across all devices via Supabase Realtime.
* **Push Notifications**: Stay updated on report submissions and team activities.

### Calculators & Tools
* AI Wizard
* Asphalt Calculator
* Block Calculator
* Concrete Calculator
* Converter
* Duct Calculator
* Dynamic Calculator
* HVAC Calculator
* Labor Calculator
* Ohms Calculator
* Pipe Calculator
* Pour Calculator
* Quick Log
* Rebar Calculator
* Saved Calculations
* Soil Calculator
* Stair Calculator
* Tile Calculator
* Voltage Calculator

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React Native (0.81)** | Cross-platform mobile framework |
| **Expo SDK 54** | Core toolchain & file-based routing (Expo Router) |
| **TypeScript** | Type-safe application logic |
| **Zustand (v5)** | Persisted local state management |
| **Supabase** | Backend (Postgres, Auth, Storage, Realtime, Edge Functions) |
| **RevenueCat** | Premium subscription management |
| **Lucide React Native** | Icon library |
| **date-fns** | Date utilities |
| **expo-print** | Local PDF generation |
| **expo-image-manipulator** | Photo compression pipeline |

## Getting Started

### Prerequisites
- Node.js installed
- Expo CLI
- A Supabase account and project

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ConstructionPro
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy the example `.env` file and fill in your Supabase credentials.
   ```bash
   cp .env.example .env
   ```

4. **Run the app:**
   ```bash
   npm start
   ```
   Follow the Expo CLI instructions to run on iOS Simulator, Android Emulator, or a physical device using Expo Go.

## Environment Variables

The app requires the following environment variables to run. Do not commit your actual `.env` file to version control. See `.env.example` for details.

* `EXPO_PUBLIC_SUPABASE_URL`
* `EXPO_PUBLIC_SUPABASE_ANON_KEY`
* `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` *(migration pending — see roadmap)*
* `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` *(migration pending — see roadmap)*

### Edge Function Secrets
The following secrets are used server-side in Supabase Edge Functions and should **not** be included in your `.env` file. Set them using the Supabase CLI (`supabase secrets set`):
* `GEMINI_API_KEY`
* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`

## Project Structure

```
ConstructionPro/
├── app/                  # File-based routing screens (Auth, Tabs, Project details)
├── components/           # Reusable UI components
├── lib/                  # Utilities (Supabase client, Image compression, etc.)
├── store/                # Zustand state stores (Auth, Projects, Preferences)
├── supabase/             # Supabase Edge Functions and Migrations
├── types/                # TypeScript definitions (e.g., Supabase schema)
└── README.md             # This file
```

## Roadmap

Check out our full [ROADMAP.md](./ROADMAP.md) for a detailed history of the project phases. 
**What's next (Phase 5a — Foundation Hardening):**
- True offline-first sync layer (PowerSync + Supabase)
- Drawings/sheets viewer with pin-drop markup
- Voice-to-Daily-Report (AI-native workflow)
- GPS time tracking and crew clock-in
- Punch lists pinned to drawings
- Observability (Sentry + PostHog) and launch readiness

## Contributing

*(Coming Soon)* Please refer to contributing guidelines.

## License
Copyright © 2026 ConstructionPro. All rights reserved.
This is proprietary software. Unauthorized copying, modification, or
distribution is prohibited.
