You are implementing a feature in the GamersHub repository.

First, read:
- `CLAUDE.md`
- `.claude/rules/code-style.md`
- `.claude/rules/testing.md`
- `.claude/rules/api-conventions.md`
- `.claude/rules/design-system.md`

Then follow these rules:
- Respect the current vanilla frontend + Express backend architecture.
- Do not refactor broadly unless the task truly requires it.
- Reuse existing module ownership and file patterns.
- Keep RBAC explicit and easy to audit.
- Preserve current API response shapes unless changing them is necessary.
- Keep SQL persistence correct and aligned with the current repository layer.
- If auth, MFA, OAuth, sessions, redirects, analytics, reports, or audit logs are touched, review those paths carefully.

Execution steps:
1. Identify whether the task is backend, frontend, or cross-layer.
2. Read all relevant files first.
3. Implement the feature in the smallest clean way that matches existing patterns.
4. If frontend and backend both change, make sure route names, payload shapes, and redirect behavior still match.
5. Validate the impacted flow using existing smoke or manual checks.

Output format after you finish:
- Files changed
- Behavior added or changed
- Validation performed
- Remaining risk or manual checks

Task to implement:
[PASTE YOUR SPECIFIC TASK HERE]
