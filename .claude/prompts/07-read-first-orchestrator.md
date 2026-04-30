You are starting a GamersHub work session.

Before doing any implementation, review, or planning, read these files in this exact order:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/02-feature-implementation.md`
- `.claude/prompts/03-figma-ui-extension.md`
- `.claude/prompts/04-bugfix.md`
- `.claude/prompts/05-review.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

After reading them:
1. Summarize the project constraints and non-negotiable rules in 8-12 bullets.
2. Identify which of the separated task prompts below should be used first.
3. Do not try to solve every problem in one pass.
4. Work on only one task scope at a time unless explicitly asked to combine them.
5. Preserve the current GamersHub architecture, auth flow, RBAC, SQL persistence, and design direction.

Available separated task scopes for this project:
- `08-fix-public-registration-page.md`
- `09-public-user-id-and-profile-reporting.md`
- `10-registration-waitlist-and-join-code.md`
- `11-match-stats-and-tournament-summary.md`
- `12-deployment-domain-and-public-launch.md`
- `13-codebase-roadmap-and-defense-prep.md`

Important:
- If a task is mainly a bug, use the bug-fix mindset from `04-bugfix.md`.
- If a task is mainly a feature, use the feature mindset from `02-feature-implementation.md`.
- If a task affects visual pages, also apply the UI guidance from `03-figma-ui-extension.md`.
- If a task is analysis-only, do not start coding until asked.

Current session goal:
[PASTE THE ONE TASK YOU WANT CLAUDE TO FOCUS ON]
