# PowerSync Sync-Path Investigation Report

**Date**: August 2026  
**Scope**: Codebase audit of PowerSync migration status across `lib/powersync/*`, `store/projectsStore.ts`, `lib/supabaseSync.ts`, and `app/_layout.tsx`.  
**Issues Investigated**: B3 (`initialSync` data overwrite), B4 (offline creates never flush), B8 (sign-out database wipe).

---

## Executive Summary

A comprehensive investigation into the data flow revealed that the app has completed its migration to PowerSync local SQLite for all primary database entities. 

Key Findings:
1. **B3 is a Ghost Bug (CLOSED / Not-a-Bug)**: The UI components across the application read directly from local PowerSync SQLite via `usePowerSync*` live query hooks (`useQuery`), ignoring Zustand store arrays. While `initialSync` did perform blind overwrites on Zustand state for folders, drawings, and calculations, this state was orphaned and never consumed by the UI. `initialSync` did not modify SQLite or drop queued mutations.
2. **B4 is Scoped to Binary File Uploads Only**: For standard database records (`projects`, `reports`, `snags`, `drawing_folders`, `drawings`, `activities`, `calculations`), offline mutations are durably queued in PowerSync's internal SQLite CRUD queue (`powersync_operations`) and automatically flush to Supabase upon reconnection. However, **binary file uploads** (`uploadPhoto`, `uploadAvatar`, `uploadDrawingFile` in `lib/supabaseSync.ts`) execute immediate `FileSystem.uploadAsync` network requests without queueing, failing silently when offline.
3. **B8 was Real (FIXED)**: `teardownPowerSync` previously called `powersync.disconnectAndClear()` upon sign-out, which dropped the entire local SQLite database and obliterated all pending CRUD queue transactions before they could sync. This has been resolved by separating disconnect from database clearing.

---

## 1. Entity Read/Write Path Audit

Every entity in the system was audited for its exact read and write mechanisms:

| Entity | Read Path | Write Path | Durable Offline Queue? | B4 Status |
| :--- | :--- | :--- | :--- | :--- |
| **`projects`** | PowerSync `useQuery` (`usePowerSyncProjects` in `lib/powersync/useProjects.ts`) | `powersync.execute()` via `addProject` / `updateProject` in `store/projectsStore.ts` | Yes (PowerSync SQLite queue) | **No bug**: Flushes automatically on reconnect |
| **`reports`** | PowerSync `useQuery` (`usePowerSyncReports` in `lib/powersync/useReports.ts`) | `powersync.execute()` via `addReport` / `updateReport` in `store/projectsStore.ts` | Yes (PowerSync SQLite queue) | **No bug**: Flushes automatically on reconnect |
| **`snags`** | PowerSync `useQuery` (`usePowerSyncSnags` in `lib/powersync/useSnags.ts`) | `powersync.writeTransaction()` via `addSnag` / `updateSnag` in `store/projectsStore.ts` | Yes (PowerSync SQLite queue) | **No bug**: Flushes automatically on reconnect |
| **`drawing_folders`** | PowerSync `useQuery` (`usePowerSyncFolders` in `lib/powersync/useFolders.ts`) | `powersync.execute()` via `addFolder` / `updateFolder` in `store/projectsStore.ts` | Yes (PowerSync SQLite queue) | **No bug**: Flushes automatically on reconnect |
| **`drawings`** | PowerSync `useQuery` (`usePowerSyncDrawings` in `lib/powersync/useDrawings.ts`) | `powersync.execute()` via `addDrawing` / `updateDrawing` in `store/projectsStore.ts` | Yes (PowerSync SQLite queue for DB row; file upload is separate) | **No bug for row**: Flushes row automatically |
| **`activities`** | PowerSync `useQuery` (`usePowerSyncActivities` in `lib/powersync/useActivities.ts`) | `powersync.execute()` via `addActivity` in `store/projectsStore.ts` | Yes (PowerSync SQLite queue) | **No bug**: Flushes automatically on reconnect |
| **`calculations`** | PowerSync `useQuery` (`usePowerSyncCalculations` in `lib/powersync/useCalculations.ts`) | `powersync.execute()` via `addCalculation` in `store/projectsStore.ts` | Yes (PowerSync SQLite queue) | **No bug**: Flushes automatically on reconnect |
| **`project_members`** | PowerSync `useQuery` (`usePowerSyncMembers` in `lib/powersync/useMembers.ts`) | Direct Supabase RPC / server-side trigger (read-only on client store) | N/A (Server-managed) | **No bug**: No local offline create path |

---

## 2. In-Depth Analysis of Issues

### Issue B3: `initialSync` Overwrites and Data Loss
- **Original Hypothesis**: `initialSync` fetched remote records from Supabase and unconditionally overwrote local `folders`, `drawings`, `activities`, and `calculations` because the `syncStatus` guard only protected `projects` and `reports`. It was believed that offline creations were wiped upon reconnection.
- **Audit Findings**:
  - `store/projectsStore.ts` contained `initialSync()`, which fetched from Supabase via `lib/supabaseSync.ts` and called `set({ folders: remoteFolders, ... })`.
  - However, all UI screens (e.g. `app/project/[id]/drawings/index.tsx`, `app/project/[id]/activity.tsx`, `app/saved-calculations.tsx`) had already been refactored to consume `usePowerSyncFolders`, `usePowerSyncDrawings`, `usePowerSyncActivities`, etc.
  - The SQLite database and the PowerSync CRUD queue were never touched by `initialSync`.
  - The Zustand state being overwritten was completely orphaned and unused.
- **Resolution**:
  - Marked B3 as **CLOSED (Not a Bug)**.
  - Removed `initialSync()` execution from `app/_layout.tsx` startup.
  - Deprecated `initialSync` in `store/projectsStore.ts` with a scheduled-for-deletion notice.

### Issue B4: Offline Creates Never Flush
- **Original Hypothesis**: Records created offline stayed at `syncStatus: 'pending'` permanently because no mutation queue or flush-on-reconnect worker existed in `lib/`.
- **Audit Findings**:
  - For all database rows, mutations write directly to local SQLite and are recorded in PowerSync's `powersync_operations` table. `Connector.ts` implements `PowerSyncBackendConnector.uploadData()`, which PowerSync's background sync engine calls automatically when connectivity is restored.
  - **The Real B4 Vulnerability**: File storage uploads bypass SQLite. Functions `uploadPhoto`, `uploadAvatar`, and `uploadDrawingFile` in `lib/supabaseSync.ts` make un-queued HTTP POST requests (`FileSystem.uploadAsync`). When offline, these calls throw network errors. The database row referencing the storage path is queued and syncs, but the actual binary file in Supabase Storage is never uploaded and is permanently lost.
- **Resolution**:
  - Re-scoped B4 strictly to **binary file uploads (photos, avatars, drawing files)** bypassing the durable queue.

### Issue B8: PowerSync Teardown Wiping Local SQLite Database
- **Original Hypothesis / Vulnerability**: `teardownPowerSync` in `lib/powersync/lifecycle.ts` executed `powersync.disconnectAndClear()` on sign-out.
- **Impact**:
  - If a user worked offline (e.g., recorded snags or daily reports) and signed out before reconnecting, `disconnectAndClear()` wiped the local SQLite database.
  - The `powersync_operations` table containing all pending mutations was dropped.
  - When the user subsequently connected to the internet and logged back in, the pending work was completely gone.
- **Resolution (Implemented)**:
  1. **Disconnect Only on Sign-Out**: `teardownPowerSync()` now calls `powersync.disconnect()` only. The local SQLite database and queued operations are preserved across sign-out.
  2. **Non-Blocking Offline Notice**: Before disconnecting on sign-out, `teardownPowerSync` inspects `powersync.getUploadQueueStats()`. If pending items exist, it alerts the user that changes are saved locally and will sync when they next sign in.
  3. **Conditional Clear on User Switch**: A dedicated function `clearPowerSyncForNewUser` was introduced. The last signed-in user ID is tracked in `AsyncStorage` (`last_powersync_user`). When a different user signs in:
     - If the queue has unsynced items left by the previous user, a destructive confirmation alert warns how many changes will be lost.
     - If confirmed (or if the queue is empty), `powersync.disconnectAndClear()` runs to ensure cross-tenant data isolation.
     - If cancelled, the sign-in is aborted and the app signs out gracefully.

---

## 3. Architecture Lifecycle Invariants

1. **Session Resumption Offline**:
   - Sign-in requires network by design (authenticating with Supabase Auth).
   - The app must **never require network to resume an existing session**. Existing authenticated sessions must hydrate local state and allow full offline read/write access via PowerSync.
2. **Teardown vs. Purge Separation**:
   - `teardownPowerSync` = `disconnect()` (never wipe).
   - `clearPowerSyncForNewUser` = `disconnectAndClear()` (invoked only when `currentUserId !== lastUserId`).
3. **Queue Durability**:
   - Database mutations must always go through `powersync.execute` or `powersync.writeTransaction`.
   - Direct Supabase REST writes from screens are prohibited.
