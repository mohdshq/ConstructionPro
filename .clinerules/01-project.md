ConstructionPro project context

Stack: Expo SDK 54, React Native, TypeScript, expo-router, Zustand (UI/auth state only), PowerSync offline-first SQLite, Supabase (Postgres, Auth, Storage, Edge Functions). Supabase project ref: nalbazjndjozdksulbwx.

Where things are:
- docs/SESSION_HANDOFF.md: current repo state, priority order, data changes already applied. Read it at the start of every task.
- KNOWN_ISSUES.md (repo root): issue index (B*, H*, A*), DO NOT REGRESS list, history. It is long: grep -n for the issue ID and read only that section.
- docs/HANDOFF.md: stack and conventions background. Its test counts are historical.
- Attachments: lib/attachments/ (resolveMediaUri.ts, remoteStorage.ts, watchAttachments.ts, localStorage.ts). Signed URLs: lib/supabaseSync.ts.

Token budget (the owner pays per token):
- Read only the files the task needs. Never re-read a file already read in this task.
- Ask before reading more than 10 files, or any file over 400 lines in full.
- To learn data state, ask the owner to run a SQL query or send Metro log lines instead of reading many files to infer it.
- Keep reports short. Do not restate file contents back to the owner.
