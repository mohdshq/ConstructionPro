Workflow

- One branch per issue from an up-to-date main: fix/<id>-<name>, docs/<name>, chore/<name>.
- Before every commit: npx tsc --noEmit && npx jest. Both must pass. Report the jest summary line. Add tests for every fix; never reduce the test count.
- Commit messages: type(ID): description, e.g. fix(B15): ...
- Push, open a PR with gh pr create, report the PR URL. Never merge; the owner merges.
- In the same PR, update KNOWN_ISSUES.md (status + evidence) and docs/SESSION_HANDOFF.md (Last updated, main commit, repo state, priority order).
- Code changes and data changes are separate steps. Data changes need approval.
- Device testing is on the owner's iPhone via Expo QR. Give exact steps and the log lines to look for.
- Fix only the requested issue. Log anything else as a new KNOWN_ISSUES entry.
