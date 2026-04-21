You are reviewing code for the GamersHub repository.

Read first:
- `CLAUDE.md`
- `.claude/rules/testing.md`
- `.claude/rules/api-conventions.md`
- `.claude/rules/design-system.md`

Review mode:
- findings first
- prioritize real bugs, regressions, permission issues, SQL/data risks, and frontend/backend mismatches
- keep summaries short

Focus especially on:
- auth and MFA correctness
- OAuth flow safety
- session and redirect behavior
- RBAC correctness
- superadmin-only role management
- analytics/report/audit correctness
- SQL persistence behavior
- compatibility between frontend calls and backend responses
- UI consistency with existing GamersHub/Figma direction when relevant

Output format:
1. Findings, ordered by severity, with file references
2. Open questions or assumptions
3. Short overall summary

If no issues are found, say that explicitly and mention residual risk or missing validation.

Code or change to review:
[PASTE THE DIFF, FILES, OR TASK HERE]
