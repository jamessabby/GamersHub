You are fixing a bug in the GamersHub repository.

Read first:
- `CLAUDE.md`
- `.claude/rules/code-style.md`
- `.claude/rules/testing.md`
- `.claude/rules/api-conventions.md`

Bug-fix priorities:
- identify the real root cause before editing
- avoid broad rewrites
- preserve current architecture and working flows
- pay extra attention to auth, RBAC, redirects, SQL persistence, analytics, reports, and audit behavior if touched

Workflow:
1. Restate the bug in technical terms.
2. Find the exact route/page/module responsible.
3. Read the relevant files before changing anything.
4. Fix the root cause with the smallest reliable change.
5. Validate the affected flow.
6. Report the root cause, fix, and validation clearly.

When the bug involves roles or redirects:
- verify `user`, `admin`, and `superadmin` behavior separately
- confirm forbidden cases are still blocked
- confirm login/session redirect behavior still matches role and school-verification state

Bug to fix:
[PASTE THE BUG HERE]
