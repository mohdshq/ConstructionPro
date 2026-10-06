# Session handoff

Last updated: 2026-10-06. main = 31b5328.

## Repo state
- PR #27 (B13 paywall fix), #28 (PR #1 salvage), #29 (B12 close + B14/B15/B16
  logging) all merged. PR #1 closed as superseded.
- Branches deleted: fix/b13-snag-paywall-gate, chore/salvage-pr1-db-docs,
  chore/untrack-build-artifacts, pr1, docs/b12-close-b14-b15.
- No open PRs.
- Last verification: npx tsc --noEmit clean; npx jest 41 suites / 282 tests pass.

## Data changes already applied — DO NOT REPEAT
- profiles.avatar_url nulled for cdbff53b-6290-45ff-8966-dcbdc0b29273 (held bare
  filename cd2d21bc-afcb-4467-8cd2-d9bec8fcd720.jpg; no such object in any bucket).
- projects.photo_url nulled for 00d63259 (Azizi Hotel) and ec605ff8 (Test 2);
  both pointed at slash-form paths whose objects never existed.
- 6 duplicate/orphaned project_cover_* objects deleted from
  report-photos/cdbff53b-6290-45ff-8966-dcbdc0b29273/ via the Storage dashboard
  (SQL deletes orphan files — never use SQL for storage deletes).
  Folder went 28 -> 22 objects.
- The remaining 22 MUST NOT be deleted: 13 legacy daily_*.jpg report photos in
  {projectId}/ subfolders, 8 logo_*.jpg at folder root (all still referenced by
  employer_logo / consultant_logo / contractor_logos on Azizi Hotel and Reve),
  and 1 .emptyFolderPlaceholder.
- 5 covers remain in storage, one per project, all project-ID-prefixed.

## Known bad call from the previous session
The 6 cover objects were deleted on the reasoning that the
`meta?.projectId || meta?.userId || 'default'` fallback in
resolveRemoteStoragePath was unreachable. Device logs afterwards proved it IS
reachable:
  [getSignedUrl] missing object skipped: report-photos
  cdbff53b-.../project_cover_1779449049420_vu9kbr.jpg   (Azure)
  cdbff53b-.../project_cover_1780307021264_u6ky3c.jpg   (Reve)
Degrades gracefully — misses are skipped and 6 covers still render — so no data
loss. Tracked as B15. Optional quick quiet-down: re-upload those 5 filenames into
cdbff53b-.../ by downloading each from its project folder first.

## Priority order
1. B14 (high) — slash-form remote storage path passed to readAsStringAsync as a
   local file URI (note leading "/"). Causes long "loading media" hang when
   opening reports on Azizi Hotel and Reve. Azure works, so another path resolves
   correctly — find the difference.
   CALL SITE FOUND: app/project/[id]/report/[reportId].tsx:121
     } catch (e) { console.error("Error embedding photo base64", e); }
   Error: Calling the 'readAsStringAsync' function has failed -> Caused by: File
   '/cdbff53b-6290-45ff-8966-dcbdc0b29273/00d63259-b1ad-4d95-ae57-9943cfa984e5/
   daily_1782710654082_7e46j9.jpg' is not readable
   Also affects daily_1781871370558_12o7yk.jpg.
   Compare that function's URI construction against the slash short-circuit at
   the top of resolveRemoteStoragePath in lib/attachments/remoteStorage.ts and
   against classifyMediaSource in lib/attachments/resolveMediaUri.ts.
2. B15 — find why persisted attachment records lack projectId even though all
   four json_object producers in lib/attachments/watchAttachments.ts set it
   (lines 46, 69, 101, 118). Migrate or regenerate stale records, then remove the
   `|| meta?.userId || 'default'` fallback. 'default/' verified never written to.
3. B13 device verification — current device build runs with
   EXPO_PUBLIC_DEV_FORCE_PREMIUM=true ("[DEV] Premium paywall bypassed"), so the
   PR #27 fix is unit-tested only. Rebuild with the flag unset and confirm a
   non-premium user can open Snagging and Quick Log but is still gated on report
   creation.
4. Triage 3 unexplained cover placeholders — 6 covers render, 5 show
   placeholders, but only 2 photo_url values were nulled. Run:
   select id, name, photo_url from projects order by created_at;
5. B16 — constrain projects.photo_url to bare filenames. watchAttachments.ts
   excludes slash-containing values (photo_url NOT LIKE '%/%'), so malformed rows
   are silently never queued; that is how Azizi Hotel and Test 2 stayed broken
   from June to September unnoticed.
6. B6 backfill — 64 snags and 13 reports still hold base64 (issue #21). Forward
   path verified on physical device; this is a pure data migration.

## Open unknowns
- report-photos contains a folder 0ddf3676-de1d-4d96-a8e... that appeared in the
  dashboard but never in any query. Contents never inventoried.
- The 3 extra cover placeholders have no diagnosis.

## IDs
user: cdbff53b-6290-45ff-8966-dcbdc0b29273
Azure        5f9d2540-711b-45e1-87f6-eb1ad278cacb
Reve         0516d9f7-342e-4305-8df8-525a6212998a
Azizi Hotel  00d63259-b1ad-4d95-ae57-9943cfa984e5
Test 2       ec605ff8-df86-4b0b-b6b5-249402e9a14b
New Project  09cd5c33-e4c9-4d32-aced-b47ac588d317
Project 2    9c8d27df-d1d9-4b67-b1e4-40361dc269b2
Project 3    a95a26d2-84e4-4da6-adc4-cb8fbec25eda

## Environment notes
- gh CLI installed and authenticated.
- Add `setopt interactive_comments` to ~/.zshrc — pasted shell comments starting
  with # currently throw "unknown revision" errors.
- Device builds go via QR code scan on the same account.
