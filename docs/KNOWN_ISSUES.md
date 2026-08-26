# Known Issues & Backlog Items

## 1. Team Members Screen: Non-Current User Profiles Render "Unknown User"

- **Status**: Pre-existing / Backlog (PowerSync Cloud Sync Rules)
- **Component**: `lib/powersync/useMembers.ts` -> `app/project/[id]/members.tsx`
- **Symptom**: On the Team Members screen, co-members and the project Owner render with the name "Unknown User" when viewed by another user (e.g. Viewer or Manager).
- **Root Cause**: 
  - `usePowerSyncMembers` performs a local SQLite `LEFT JOIN profiles p ON p.id = m.user_id`.
  - In the PowerSync dashboard sync rules, the `profiles` table is synced under a user-scoped rule (`SELECT * FROM profiles WHERE id = request.user_id()`).
  - As a result, only the authenticated user's profile row exists in local SQLite. Foreign profile rows for co-members are not replicated locally, causing `profileFullName` to be `NULL`.
- **Resolution Path**:
  - Update PowerSync Dashboard sync rules to replicate profiles for project co-members:
    ```yaml
    # PowerSync Sync Rules (Dashboard)
    bucket_definitions:
      project_member_profiles:
        parameters: select project_id from project_members where user_id = request.user_id()
        data:
          - select p.* from profiles p
            join project_members pm on pm.user_id = p.id
            where pm.project_id in (select project_id from project_members where user_id = request.user_id())
    ```
  - Or add a fallback profile fetch in the UI via Supabase RPC/REST if offline cache for co-member names is not required.
