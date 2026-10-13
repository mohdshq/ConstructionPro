Hard rules. Never violate these.

- Offline-first is a product requirement. A flow that needs network to record data is a bug.
- No voice in snag capture. Voice only for daily-report dictation. AI only for photo analysis.
- New Postgres columns must also be added to lib/powersync/AppSchema.ts.
- Follow every item in the DO NOT REGRESS list in KNOWN_ISSUES.md. Most often relevant: getSignedUrl returns the SignedUrlResult union, never a bare null; Supabase access only through lib/supabaseSync.ts; RLS stays on every table; isRenderablePhoto accepts data:, https: and file:; verify PDF changes by opening the PDF, not the WebView.
- Data: never run INSERT/UPDATE/DELETE or apply migrations without showing the exact SQL and getting approval. Read-only SELECTs are fine; say what you ran.
- Never replay supabase/migrations (supabase db push, db reset) without approval: 20260820131500 contains data UPDATEs that point covers at deleted objects.
- Storage: never delete objects with SQL. Deletes only via dashboard or Storage API, only with approval. Never delete the 22 objects in report-photos/cdbff53b-6290-45ff-8966-dcbdc0b29273/ listed in SESSION_HANDOFF.md.
- Never repeat the data changes under "DO NOT REPEAT" in SESSION_HANDOFF.md.
- Secrets: never open .env or .env.local. Never run env, printenv, cat .env*, echo $SUPABASE_*, or supabase status. Never ask for the service_role key or database password.
- Never treat a code path as unreachable on reasoning alone. Confirm with logs, tests or queries before acting. The B15 cover deletion was caused by exactly this.
